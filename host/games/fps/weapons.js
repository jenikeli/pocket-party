// A player's weapons in use: the loadout, swapping, the fire rate and the reload (a shotgun loads shell by shell,
// a sniper works a bolt), spread that grows with movement and fire, and recoil. A shot itself is cast by
// ballistics.js. No DOM, unit tested. Used by player.js, match.js and bots.js.

import { TUNING, WEAPONS, SLOT_ORDER } from './tuning.js';
import { emit, eyeOf, lookDirection } from './world.js';
import { castShot, meleeHit } from './ballistics.js';
import { throwGrenade } from './grenades.js';

export function giveLoadout(player, primaryId) {
  const gunOf = (id) => ({ id, mag: WEAPONS[id].mag, reserve: WEAPONS[id].reserve });
  player.guns = { primary: gunOf(primaryId), sidearm: gunOf('pistol'), melee: gunOf('knife') };
  player.slot = 'primary';
  player.cool = 0.3;
  player.reloadLeft = 0;
  player.bloom = 0;
  player.zoom = 0;
  player.firePrev = false;
  player.grenades = { frag: 1, smoke: 1, flash: 1 };
  player.grenadeKind = 'frag';
}

export function gunOf(player) {
  return WEAPONS[player.guns[player.slot].id];
}

export function swapWeapon(player) {
  const order = SLOT_ORDER;
  player.slot = order[(order.indexOf(player.slot) + 1) % order.length];
  player.reloadLeft = 0;
  player.cool = 0.4;
  player.zoom = 0;
}

function startReload(world, player) {
  const state = player.guns[player.slot];
  const gun = gunOf(player);
  if (gun.mag === 0 || state.mag >= gun.mag || state.reserve <= 0 || player.reloadLeft > 0) {
    return;
  }
  player.reloadLeft = gun.reload;
  emit(world, 'reload', { pid: player.id, weapon: gun.id, x: player.x, y: player.y + 1.2, z: player.z });
}

// The current spread in radians: base, plus movement, in the air and recoil bloom; crouching and aiming tighten it.
export function spreadOf(player) {
  const gun = gunOf(player);
  const speed = Math.hypot(player.vx, player.vz);
  let degrees = gun.spread * (player.wantCrouch ? gun.crouchMul : 1) + gun.moveSpread * Math.min(1, speed / TUNING.sprint) + (player.onGround ? 0 : 4) + player.bloom * 1.5;
  if (gun.id === 'sniper' && player.zoom === 0) {
    degrees += 6;
  }
  if (player.zoom > 0) {
    degrees *= 0.5;
  }
  return (degrees * Math.PI) / 180;
}

function fire(world, player, gun, state) {
  const eye = eyeOf(player, TUNING);
  const dir = lookDirection(player);
  state.mag -= 1;
  player.cool = 60 / gun.rpm;
  player.lastFiredAt = world.time;
  player.firing = true;
  if (gun.id === 'knife') {
    meleeHit(world, player, eye, dir, gun);
    return;
  }
  const spread = spreadOf(player);
  for (let pellet = 0; pellet < gun.pellets; pellet += 1) {
    const a = world.random() * Math.PI * 2;
    const r = Math.sqrt(world.random()) * spread;
    const right = { x: Math.cos(player.yaw), y: 0, z: -Math.sin(player.yaw) };
    const up = { x: -Math.sin(player.pitch) * -Math.sin(player.yaw), y: Math.cos(player.pitch), z: -Math.sin(player.pitch) * -Math.cos(player.yaw) };
    const shot = { x: dir.x + (right.x * Math.cos(a) + up.x * Math.sin(a)) * r, y: dir.y + (right.y * Math.cos(a) + up.y * Math.sin(a)) * r, z: dir.z + (right.z * Math.cos(a) + up.z * Math.sin(a)) * r };
    const length = Math.hypot(shot.x, shot.y, shot.z);
    castShot(world, player, eye, { x: shot.x / length, y: shot.y / length, z: shot.z / length }, gun);
  }
  const loud = gun.id !== 'knife';
  emit(world, 'fire', { pid: player.id, weapon: gun.id, x: eye.x, y: eye.y, z: eye.z, loud });
  player.pitch = Math.min(TUNING.pitchLimit, player.pitch + gun.recoil * (1 + player.bloom * 0.5) * (player.wantCrouch ? 0.8 : 1));
  player.yaw += (world.random() - 0.5) * 2 * gun.recoilYaw;
  player.bloom = Math.min(2, player.bloom + 0.2);
  if (gun.id === 'sniper') {
    player.zoom = 0;
  }
}

// One step of a living player's weapon: queued actions, reload, and firing.
export function stepWeapon(world, player, dt) {
  for (const entry of (player.action ?? []).splice(0)) {
    if (entry.button === 'reload') {
      startReload(world, player);
    } else if (entry.button === 'swap') {
      swapWeapon(player);
    } else if (entry.button === 'grenade') {
      throwGrenade(world, player, Boolean(entry.lob));
    } else if (entry.button === 'cycleGrenade') {
      const kinds = ['frag', 'smoke', 'flash'];
      player.grenadeKind = kinds[(kinds.indexOf(player.grenadeKind) + 1) % kinds.length];
    } else if (entry.button === 'ads') {
      player.zoom = (player.zoom + 1) % gunOf(player).zoom.length;
    }
  }
  const gun = gunOf(player);
  const state = player.guns[player.slot];
  player.cool = Math.max(0, player.cool - dt);
  player.bloom = Math.max(0, player.bloom - dt * 1.8);
  player.firing = false;
  if (player.reloadLeft > 0) {
    player.reloadLeft -= dt;
    if (player.reloadLeft <= 0) {
      const take = gun.perShell ? 1 : Math.min(gun.mag - state.mag, state.reserve);
      state.mag += take;
      state.reserve -= take;
      player.reloadLeft = 0;
      if (gun.perShell && state.mag < gun.mag && state.reserve > 0 && !player.held.fire) {
        startReload(world, player);
      }
    }
  }
  const wantsFire = player.held.fire && (gun.auto || !player.firePrev);
  player.firePrev = player.held.fire;
  if (player.cool > 0 || !wantsFire || (player.reloadLeft > 0 && !(gun.perShell && state.mag > 0))) {
    return;
  }
  if (gun.mag > 0 && state.mag <= 0) {
    if (!player.firePrev || !gun.auto) {
      emit(world, 'dryfire', { pid: player.id, x: player.x, y: player.y + 1.2, z: player.z });
    }
    startReload(world, player);
    return;
  }
  player.reloadLeft = 0;
  fire(world, player, gun, state);
}
