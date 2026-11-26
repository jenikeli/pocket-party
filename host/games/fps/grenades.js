// Grenades: thrown with an arc (a full throw or a short underhand lob), bouncing off the map, then going off:
// the frag hurts in a radius with falloff and cover, the flash blinds players who look toward it, the smoke
// leaves a cloud that blocks sight lines. No DOM, unit tested. Used by weapons.js and match.js.

import { TUNING } from './tuning.js';
import { moveBody, lineClear } from './collision.js';
import { emit, eyeOf, lookDirection } from './world.js';
import { canHurt, damagePlayer } from './ballistics.js';

const G = TUNING.grenade;
const FUSES = { frag: G.fuse, smoke: 1.2, flash: 1.6 };

export function throwGrenade(world, player, lob) {
  const kind = player.grenadeKind;
  if (!(player.grenades[kind] > 0)) {
    return;
  }
  player.grenades[kind] -= 1;
  const eye = eyeOf(player, TUNING);
  const dir = lookDirection(player);
  const speed = lob ? G.lobSpeed : G.throwSpeed;
  world.grenades.push({
    id: world.nextId++, kind, owner: player.id, team: player.team, fuse: FUSES[kind],
    body: { x: eye.x + dir.x * 0.5, y: eye.y - 0.3 + dir.y * 0.5, z: eye.z + dir.z * 0.5, r: G.radius, vx: dir.x * speed + player.vx * 0.5, vy: dir.y * speed + (lob ? 2 : 3), vz: dir.z * speed + player.vz * 0.5, onGround: false },
  });
  emit(world, 'throw', { pid: player.id, kind, x: eye.x, y: eye.y, z: eye.z });
}

// Whether a straight line from a to b is clear of boxes and of smoke clouds (what sight needs).
export function visible(world, a, b) {
  if (!lineClear(world.boxes, a, b)) {
    return false;
  }
  return !world.smokes.some((smoke) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dy, dz) || 1;
    const along = Math.max(0, Math.min(length, ((smoke.x - a.x) * dx + (smoke.y - a.y) * dy + (smoke.z - a.z) * dz) / length));
    const px = a.x + (dx / length) * along;
    const py = a.y + (dy / length) * along;
    const pz = a.z + (dz / length) * along;
    return Math.hypot(px - smoke.x, py - smoke.y, pz - smoke.z) < smoke.r;
  });
}

function chestOf(player) {
  return { x: player.x, y: player.y + 1.2, z: player.z };
}

function explodeFrag(world, grenade) {
  const at = { x: grenade.body.x, y: grenade.body.y + 0.2, z: grenade.body.z };
  const owner = world.players.find((player) => player.id === grenade.owner) ?? null;
  emit(world, 'explode', { x: at.x, y: at.y, z: at.z, radius: G.fragRadius });
  for (const victim of world.players) {
    const distance = Math.hypot(victim.x - at.x, victim.y + 1 - at.y, victim.z - at.z);
    const hurts = owner ? (victim === owner || canHurt(world, owner, victim)) : victim.alive;
    if (!victim.alive || distance > G.fragRadius || !hurts || world.time < victim.protectedUntil) {
      continue;
    }
    const cover = lineClear(world.boxes, at, chestOf(victim)) ? 1 : 0.25;
    damagePlayer(world, victim, G.fragDamage * (1 - distance / G.fragRadius) * cover, owner, 'frag', false, chestOf(victim));
  }
}

// Blinds each player in range who has a line to the flash: more when they look at it and the nearer they are.
function explodeFlash(world, grenade) {
  const at = { x: grenade.body.x, y: grenade.body.y + 0.3, z: grenade.body.z };
  emit(world, 'flash', { x: at.x, y: at.y, z: at.z });
  for (const player of world.players) {
    const eye = eyeOf(player, TUNING);
    const dx = at.x - eye.x;
    const dy = at.y - eye.y;
    const dz = at.z - eye.z;
    const distance = Math.hypot(dx, dy, dz);
    if (!player.alive || distance > G.flashRadius || !lineClear(world.boxes, at, eye)) {
      continue;
    }
    const look = lookDirection(player);
    const facing = (look.x * dx + look.y * dy + look.z * dz) / (distance || 1);
    const strength = (0.35 + 0.65 * Math.max(0, facing)) * (1 - distance / G.flashRadius);
    player.flashPeak = Math.max(player.flashLeft, strength * G.flashSeconds);
    player.flashLeft = player.flashPeak;
  }
}

function detonate(world, grenade) {
  if (grenade.kind === 'frag') {
    explodeFrag(world, grenade);
  } else if (grenade.kind === 'flash') {
    explodeFlash(world, grenade);
  } else {
    world.smokes.push({ x: grenade.body.x, y: grenade.body.y + 1, z: grenade.body.z, r: G.smokeRadius, left: G.smokeSeconds });
    emit(world, 'smoke', { x: grenade.body.x, y: grenade.body.y + 1, z: grenade.body.z, radius: G.smokeRadius, seconds: G.smokeSeconds });
  }
}

// One step for every grenade in flight, every smoke cloud, and every blinded player's recovery.
export function stepGrenades(world, dt) {
  for (const grenade of world.grenades) {
    const { body } = grenade;
    const before = { vx: body.vx, vy: body.vy, vz: body.vz };
    body.vy -= G.gravity * dt;
    moveBody(world.boxes, body, G.radius * 2, body.vx * dt, body.vy * dt, body.vz * dt);
    if (body.vx === 0 && before.vx !== 0) {
      body.vx = -before.vx * G.bounce;
    }
    if (body.vz === 0 && before.vz !== 0) {
      body.vz = -before.vz * G.bounce;
    }
    if (body.onGround) {
      body.vy = Math.abs(before.vy) > 1.5 ? Math.abs(before.vy) * G.bounce : 0;
      body.vx *= 0.8;
      body.vz *= 0.8;
    }
    grenade.fuse -= dt;
    if (grenade.fuse <= 0) {
      grenade.done = true;
      detonate(world, grenade);
    }
  }
  world.grenades = world.grenades.filter((grenade) => !grenade.done);
  for (const smoke of world.smokes) {
    smoke.left -= dt;
  }
  world.smokes = world.smokes.filter((smoke) => smoke.left > 0);
  for (const player of world.players) {
    player.flashLeft = Math.max(0, player.flashLeft - dt);
  }
}
