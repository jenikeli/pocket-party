// A Breakwater player's body and input: looking, the stick, stances (walk, run, sprint, crouch), jumping with
// step-up, footsteps and falling. A bot, a phone and the tests all drive it through the same door
// (setStick, applyLook, press). No DOM, unit tested. Used by match.js, weapons.js and bots.js.

import { TUNING, WEAPONS } from './tuning.js';
import { moveBody, fits } from './collision.js';
import { emit } from './world.js';
import { giveLoadout } from './weapons.js';

export function createPlayer({ id, name, team, human, primary = 'rifle', colorIndex = 0, enemyType = null }) {
  const player = {
    id, name, team, human, colorIndex, primary, enemyType, bot: null,
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: TUNING.radius, onGround: true, yaw: 0, pitch: 0,
    crouch: 0, wantCrouch: false, hp: TUNING.maxHp, armor: 0, alive: false, speedClass: 'stand', stepDist: 0,
    stick: { x: 0, y: 0 }, held: { fire: false, scores: false, use: false }, zoom: 0, queue: [], respawnAt: 0, protectedUntil: 0,
    kills: 0, deaths: 0, score: 0, flashLeft: 0, flashPeak: 0, hurt: { n: 0, yaw: 0 }, hit: { n: 0, head: false },
    killedBy: null, lastFiredAt: -99, firing: false,
  };
  giveLoadout(player, primary);
  return player;
}

// Sets the stick, both -1..1 in the player's directions (y up the screen is forward).
export function setStick(player, x, y) {
  player.stick.x = Math.max(-1, Math.min(1, x));
  player.stick.y = Math.max(-1, Math.min(1, y));
}

// Turns by a finger movement as a fraction of the look pad (dx right, dy down); the phone has scaled it already.
export function applyLook(player, dx, dy) {
  const scale = TUNING.lookRadians * (player.zoom > 0 ? TUNING.adsLook : 1);
  player.yaw -= dx * scale;
  player.pitch = Math.max(-TUNING.pitchLimit, Math.min(TUNING.pitchLimit, player.pitch - dy * scale));
}

// A button: fire, ads and scores are held; the rest are one-off presses that queue for the next step.
export function press(player, button, pressed, extra = {}) {
  if (button in player.held) {
    player.held[button] = pressed;
  } else if (pressed) {
    player.queue.push({ button, ...extra });
  }
}

export function currentHeight(player) {
  return TUNING.height + (TUNING.crouchHeight - TUNING.height) * player.crouch;
}

function speedFor(player, magnitude) {
  const gun = WEAPONS[player.guns[player.slot].id];
  let speed;
  if (player.wantCrouch) {
    speed = TUNING.crouchSpeed;
    player.speedClass = 'crouch';
  } else if (magnitude < TUNING.silentBelow) {
    speed = TUNING.silent;
    player.speedClass = 'silent';
  } else if (magnitude < TUNING.sprintAbove) {
    speed = TUNING.run;
    player.speedClass = 'run';
  } else {
    speed = TUNING.sprint;
    player.speedClass = 'sprint';
  }
  speed *= gun.speedMul;
  return player.zoom > 0 ? Math.min(speed, TUNING.adsSpeed) : speed;
}

function approach(player, targetX, targetZ, dt) {
  const toX = targetX - player.vx;
  const toZ = targetZ - player.vz;
  const distance = Math.hypot(toX, toZ);
  const speeding = Math.hypot(targetX, targetZ) > Math.hypot(player.vx, player.vz);
  const rate = player.onGround ? (speeding ? TUNING.accelGround : TUNING.decelGround) : TUNING.accelAir;
  const step = Math.min(distance, rate * dt);
  if (distance > 0.0001) {
    player.vx += (toX / distance) * step;
    player.vz += (toZ / distance) * step;
  }
}

function handleQueue(world, player) {
  for (const entry of player.queue.splice(0)) {
    if (entry.button === 'jump' && player.onGround && !player.wantCrouch) {
      player.vy = Math.sqrt(2 * TUNING.gravity * TUNING.jumpApex);
      player.onGround = false;
      emit(world, 'jump', { pid: player.id, x: player.x, y: player.y, z: player.z });
    } else if (entry.button === 'crouch') {
      player.wantCrouch = !player.wantCrouch;
    } else {
      player.action = player.action ?? [];
      player.action.push(entry);
    }
  }
}

// One step of movement for a living player.
export function movePlayer(world, player, dt) {
  handleQueue(world, player);
  const magnitude = Math.min(1, Math.hypot(player.stick.x, player.stick.y));
  const sine = Math.sin(player.yaw);
  const cosine = Math.cos(player.yaw);
  const forward = player.stick.y;
  const right = player.stick.x;
  const wishX = (-sine * forward + cosine * right) / (magnitude > 0 ? Math.max(1, Math.hypot(forward, right)) : 1);
  const wishZ = (-cosine * forward - sine * right) / (magnitude > 0 ? Math.max(1, Math.hypot(forward, right)) : 1);
  const speed = magnitude > 0.02 ? speedFor(player, magnitude) : (player.speedClass = 'stand', 0);
  approach(player, wishX * speed, wishZ * speed, dt);
  if (player.enemyType === 'gull') {
    player.vy = 0;
    player.y = 2.8 + Math.sin(world.time * 2.2 + player.colorIndex) * 0.25;
  } else {
    player.vy -= TUNING.gravity * dt;
  }
  // Crouch eases in and out; standing up needs room overhead.
  const wanted = player.wantCrouch ? 1 : 0;
  const nextCrouch = player.crouch + Math.sign(wanted - player.crouch) * Math.min(Math.abs(wanted - player.crouch), dt * 9);
  if (nextCrouch >= player.crouch || fits(world.boxes, player, TUNING.height * 0.99 + (TUNING.crouchHeight - TUNING.height) * nextCrouch)) {
    player.crouch = nextCrouch;
  }
  const landed = moveBody(world.boxes, player, currentHeight(player), player.vx * dt, player.vy * dt, player.vz * dt);
  if (landed) {
    emit(world, 'land', { pid: player.id, x: player.x, y: player.y, z: player.z });
  }
  footsteps(world, player, dt);
}

// Footsteps sound only when running or sprinting on the ground: a silent walk and a crouch walk make none.
function footsteps(world, player, dt) {
  const moving = Math.hypot(player.vx, player.vz);
  if (!player.onGround || moving < 1 || (player.speedClass !== 'run' && player.speedClass !== 'sprint')) {
    return;
  }
  player.stepDist += moving * dt;
  const stride = TUNING.stride[player.speedClass];
  if (player.stepDist >= stride) {
    player.stepDist -= stride;
    emit(world, 'step', { pid: player.id, x: player.x, y: player.y, z: player.z, sprint: player.speedClass === 'sprint' });
  }
}

// Puts the player on the map alive: full health, loadout refilled, protected for a moment.
export function spawn(world, player, spot) {
  Object.assign(player, { x: spot.x, y: 0, z: spot.z, vx: 0, vy: 0, vz: 0, yaw: spot.yaw, pitch: 0, crouch: 0, wantCrouch: false, hp: TUNING.maxHp, alive: true, onGround: true, flashLeft: 0, killedBy: null });
  player.protectedUntil = world.time + TUNING.protectSeconds;
  giveLoadout(player, player.primary);
  emit(world, 'respawn', { pid: player.id, x: spot.x, y: 0, z: spot.z });
}
