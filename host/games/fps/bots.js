// A Breakwater bot: it sees enemies in front of it with a clear line, reacts after a delay, turns toward them at a
// limited rate with aim error, fires in bursts, strafes, reloads and throws the odd grenade; with nothing in sight
// it walks a path over the nav grid to a random goal. It drives its body through the same door a phone does
// (setStick, press, look) and never edits state. No DOM, unit tested. Used by match.js.

import { TUNING, WEAPONS } from './tuning.js';
import { eyeOf } from './world.js';
import { setStick, press } from './player.js';
import { canHurt } from './ballistics.js';
import { visible } from './grenades.js';
import { findPath } from './nav.js';

export function createBot(level) {
  return { level, path: [], index: 0, targetId: null, seenAt: -99, react: 0, burst: 0, rest: 0, strafe: 1, strafeFor: 1, errorYaw: 0, errorPitch: 0, errorFor: 0, stuckFor: 0, anchor: null, throwAfter: 8 };
}

function wrap(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function turn(player, yaw, pitch, rate, dt) {
  player.yaw += Math.max(-rate * dt, Math.min(rate * dt, wrap(yaw - player.yaw)));
  player.pitch = Math.max(-1.2, Math.min(1.2, player.pitch + Math.max(-rate * dt, Math.min(rate * dt, pitch - player.pitch))));
}

function bestTarget(world, bot, player) {
  const eye = eyeOf(player, TUNING);
  let best = null;
  for (const other of world.players) {
    if (!canHurt(world, player, other)) {
      continue;
    }
    const chest = { x: other.x, y: other.y + 1.2, z: other.z };
    const dx = chest.x - eye.x;
    const dz = chest.z - eye.z;
    const distance = Math.hypot(dx, dz);
    const facing = Math.abs(wrap(Math.atan2(-dx, -dz) - player.yaw));
    if (distance < 45 && (facing < 1.5 || other.firing) && visible(world, eye, chest) && (!best || distance < best.distance)) {
      best = { other, distance, chest };
    }
  }
  return best;
}

function newGoal(world, nav, bot, player) {
  const enemies = world.players.filter((other) => other.alive && other.team !== player.team && other !== player);
  const goal = enemies.length > 0 && world.random() < 0.6 ? enemies[Math.floor(world.random() * enemies.length)] : nav.nodes[Math.floor(world.random() * nav.nodes.length)];
  bot.path = findPath(nav, player, { x: goal.x, z: goal.z });
  bot.index = 0;
}

// Steers along the path toward its goal (the next point), repathing when it arrives or gets stuck.
function walk(world, nav, bot, player, dt) {
  if (bot.index >= bot.path.length) {
    newGoal(world, nav, bot, player);
  }
  const point = bot.path[bot.index];
  if (!point) {
    setStick(player, 0, 0);
    return;
  }
  if (Math.hypot(point.x - player.x, point.z - player.z) < 1.2) {
    bot.index += 1;
  }
  turn(player, Math.atan2(-(point.x - player.x), -(point.z - player.z)), 0, 3 + bot.level * 2, dt);
  setStick(player, 0, 0.75);
}

function stuckCheck(world, nav, bot, player, dt) {
  bot.stuckFor += dt;
  if (bot.stuckFor < 1) {
    return;
  }
  bot.stuckFor = 0;
  if (bot.anchor && Math.hypot(player.x - bot.anchor.x, player.z - bot.anchor.z) < 0.4 && Math.hypot(player.stick.x, player.stick.y) > 0.3) {
    newGoal(world, nav, bot, player);
    press(player, 'jump', true);
  }
  bot.anchor = { x: player.x, z: player.z };
}

function fight(world, bot, player, seen, dt) {
  const { level } = bot;
  const skill = TUNING.botLevels[level];
  const gun = WEAPONS[player.guns[player.slot].id];
  const eye = eyeOf(player, TUNING);
  bot.errorFor -= dt;
  if (bot.errorFor <= 0) {
    bot.errorFor = 0.4;
    bot.errorYaw = ((world.random() - 0.5) * 2 * skill.error * Math.PI) / 180;
    bot.errorPitch = ((world.random() - 0.5) * 2 * skill.error * Math.PI) / 180;
  }
  const dx = seen.chest.x - eye.x;
  const dz = seen.chest.z - eye.z;
  const yaw = Math.atan2(-dx, -dz) + bot.errorYaw;
  const pitch = Math.atan2(seen.chest.y - eye.y, Math.hypot(dx, dz)) + bot.errorPitch;
  turn(player, yaw, pitch, 3.5 + level * 2.2, dt);
  bot.strafeFor -= dt;
  if (bot.strafeFor <= 0) {
    bot.strafeFor = 0.8 + world.random() * 1.6;
    bot.strafe = world.random() < 0.5 ? -1 : 1;
  }
  const close = gun.range < 40;
  const wantRange = close ? 6 : 16;
  const forward = seen.distance > wantRange + 6 ? 0.8 : seen.distance < wantRange - 4 ? -0.5 : 0;
  setStick(player, bot.strafe * 0.7, forward);
  const aligned = Math.abs(wrap(yaw - player.yaw)) < 0.1 && seen.distance < gun.range;
  bot.rest -= dt;
  if (bot.react <= 0 && aligned && bot.rest <= 0) {
    bot.burstTimer = (bot.burstTimer ?? 0) + dt;
    const interval = 60 / gun.rpm;
    // Semi-automatic weapons need a fresh press for every shot, so the button pulses on and off.
    player.held.fire = gun.auto || Math.floor(bot.burstTimer / (interval * 0.5)) % 2 === 0;
    if (bot.burstTimer > skill.burst * interval) {
      bot.burstTimer = 0;
      bot.rest = 0.3 + world.random() * 0.4;
      player.held.fire = false;
    }
  } else {
    player.held.fire = false;
  }
  bot.throwAfter -= dt;
  if (bot.throwAfter <= 0 && seen.distance > 10 && seen.distance < 24 && player.grenades.frag > 0) {
    player.grenadeKind = 'frag';
    press(player, 'grenade', true);
    bot.throwAfter = 20 + world.random() * 20;
  }
}

// One step of a bot's thinking: sets its stick, aim and buttons for this step.
export function thinkBot(world, nav, player, dt) {
  const bot = player.bot;
  const seen = bestTarget(world, bot, player);
  if (seen) {
    if (bot.targetId !== seen.other.id) {
      bot.targetId = seen.other.id;
      bot.react = TUNING.botLevels[bot.level].react;
    }
    bot.seenAt = world.time;
    bot.react -= dt;
    fight(world, bot, player, seen, dt);
  } else {
    bot.targetId = null;
    player.held.fire = false;
    walk(world, nav, bot, player, dt);
    stuckCheck(world, nav, bot, player, dt);
  }
  const state = player.guns[player.slot];
  const gun = WEAPONS[state.id];
  if (gun.mag > 0 && state.mag === 0 && state.reserve === 0 && player.slot === 'primary') {
    press(player, 'swap', true);
  } else if (gun.mag > 0 && player.reloadLeft === 0 && (state.mag === 0 || (!seen && state.mag < gun.mag * 0.4))) {
    press(player, 'reload', true);
  }
}
