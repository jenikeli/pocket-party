// The temple run's rules: one round as plain data, advanced by stepRound(round, dt). A monster chaser and
// runners (people or CPUs), lanes, jump and slide, corners to turn at, obstacles and hazards, lives, coins and
// powerups, catches and revives. No DOM or drawing, so Node unit tests run it. Used by index.js, views.js and the
// renderer. Numbers are at the top so they are easy to tune.

import {
  obstaclesBetween, pickupsBetween, cornerAt, nextCornerIndex, fireIsOn, obstacleId,
  OBSTACLE, PICKUP, LANE_COUNT, TURN_BEFORE, TURN_AFTER, TILE_TRIGGER_DISTANCE, TILE_FALL_DELAY,
} from './track.js';
import { DEFAULT_SETTINGS } from './settings.js';
import { cpuActions } from './cpu.js';

export const JUMP_SECONDS = 0.7;
export const SLIDE_SECONDS = 0.6;
export const REVIVE_WINDOW_SECONDS = 10;
// Team coins a revive costs, so coins matter.
export const REVIVE_COST = 10;
const STUMBLE_SECONDS = 1;
const CRASH_SECONDS = 1.6;
const STUMBLE_SPEED = 0.4;
const CATCH_PAUSE_SECONDS = 0.7;
const REVIVE_SHIELD_SECONDS = 2.5;
const REVIVER_STUMBLE_SECONDS = 1.5;
const REVIVE_AHEAD = 14;
const START_SPEED = 14;
const SPEED_GAIN = 0.12;
const MAX_SPEED = 26;
const CHASER_BONUS = 1.05;
const CHASER_CATCH_UP = 1.25;
const CATCH_UP_GAP = 25;
// The chaser stays this far behind the rearmost living runner: it never runs past anyone.
const CHASER_GAP = 1;
// A chaser's lane change needs a rest, so a runner has time to dodge.
const CHASER_LANE_REST = 0.3;
const RUNNER_TOO_FAR = 45;
const RUNNER_TOO_FAR_SLOWDOWN = 0.8;
const CATCH_RANGE = 1.5;
const RUNNER_START_Z = 12;
const COUNTDOWN_SECONDS = 3;
const MAGNET_SECONDS = 8;
const SHIELD_SECONDS = 8;
const BOOST_SECONDS = 4;
const BOOST_SPEED = 1.5;
const MAGNET_REACH = 7;
// A CPU runner revives a teammate once they have been down this long (a person gets the first chance).
const CPU_REVIVE_DELAY = 1.5;
// A turn swiped up to this many units before the corner's window opens is remembered, and made when it opens.
const TURN_BUFFER_DISTANCE = 9;
// Turning a corner in time gives a short burst of speed.
const TURN_BOOST_SECONDS = 0.6;
const TURN_BUFFER_SECONDS = 0.5;
const TURN_BOOST_SPEED = 1.15;
const TIMERS = ['jumpT', 'slideT', 'stumbleT', 'invulnT', 'shieldT', 'pauseT', 'magnetT', 'boostT', 'laneRestT', 'turnBoostT', 'turnBufferT'];

// phase: 'countdown', 'run' or 'over'. A player is { id, role: 'chaser' | 'runner', status: 'alive' | 'down' |
// 'out', ai, lane, z, lives, nextCorner, coins } plus T fields that count down seconds. cpuIds are the players
// with no phone. round.fallen maps a falling tile's id to the round time it began to fall.
export function createRound({ playerIds, chaserId, seed, settings = DEFAULT_SETTINGS, cpuIds = [] }) {
  const players = new Map();
  let runnerIndex = 0;
  for (const id of playerIds) {
    const isChaser = id === chaserId;
    players.set(id, {
      id,
      role: isChaser ? 'chaser' : 'runner',
      status: 'alive',
      ai: cpuIds.includes(id),
      lane: isChaser ? 1 : runnerIndex++ % LANE_COUNT,
      z: isChaser ? 0 : RUNNER_START_Z,
      lives: settings.lives,
      nextCorner: 0,
      coins: 0,
      downT: 0,
      ...Object.fromEntries(TIMERS.map((timer) => [timer, 0])),
    });
  }
  return {
    phase: 'countdown', countdown: COUNTDOWN_SECONDS, time: 0, seed, settings, players,
    bestZ: RUNNER_START_Z, coins: 0, collected: new Set(), fallen: new Map(), result: null,
  };
}

export function chaserOf(round) {
  return [...round.players.values()].find((player) => player.role === 'chaser');
}

export function livingRunners(round) {
  return [...round.players.values()].filter((player) => player.role === 'runner' && player.status === 'alive');
}

export function downedRunners(round) {
  return [...round.players.values()].filter((player) => player.role === 'runner' && player.status === 'down');
}

// The direction this player must swipe now to turn a corner, or null when no corner is near.
export function turnPrompt(round, player) {
  const corner = cornerAt(round.seed, player.nextCorner);
  const inWindow = player.z >= corner.z - TURN_BEFORE && player.z <= corner.z + TURN_AFTER;
  return player.status === 'alive' && inWindow ? corner.dir : null;
}

// action: 'left', 'right', 'jump' or 'slide' (anything else is ignored). Left and right turn the corner when one
// is near and the swipe matches it, otherwise change lane. Only living players in a running round.
export function applyAction(round, playerId, action) {
  const player = round.players.get(playerId);
  if (!player || player.status !== 'alive' || round.phase !== 'run') {
    return;
  }
  if (action === 'left' || action === 'right') {
    const corner = cornerAt(round.seed, player.nextCorner);
    const opensSoon = corner.dir === action && corner.z - TURN_BEFORE - player.z > 0 && corner.z - TURN_BEFORE - player.z <= TURN_BUFFER_DISTANCE;
    if (turnPrompt(round, player) === action) {
      makeTurn(player);
    } else if (opensSoon) {
      player.turnBufferT = TURN_BUFFER_SECONDS;
    } else if (player.role !== 'chaser' || player.laneRestT <= 0) {
      player.lane = Math.min(LANE_COUNT - 1, Math.max(0, player.lane + (action === 'left' ? -1 : 1)));
      player.laneRestT = player.role === 'chaser' ? CHASER_LANE_REST : 0;
    }
  } else if (action === 'jump' && player.jumpT <= 0) {
    player.jumpT = JUMP_SECONDS;
    player.slideT = 0;
  } else if (action === 'slide') {
    player.slideT = SLIDE_SECONDS;
    player.jumpT = 0;
  }
}

function makeTurn(player) {
  player.nextCorner += 1;
  player.turnBoostT = TURN_BOOST_SECONDS;
  player.turnBufferT = 0;
}

// A living runner revives `targetId` (or the first downed runner) for REVIVE_COST team coins. Returns true when
// someone was revived.
export function reviveRunner(round, reviverId, targetId) {
  const reviver = round.players.get(reviverId);
  const chaser = chaserOf(round);
  if (round.phase !== 'run' || reviver?.role !== 'runner' || reviver.status !== 'alive' || round.coins < REVIVE_COST) {
    return false;
  }
  const target = downedRunners(round).find((runner) => targetId === undefined || runner.id === targetId);
  if (!target) {
    return false;
  }
  round.coins -= REVIVE_COST;
  target.status = 'alive';
  target.downT = 0;
  target.z = chaser.z + REVIVE_AHEAD;
  target.nextCorner = nextCornerIndex(round.seed, target.z);
  target.shieldT = REVIVE_SHIELD_SECONDS;
  target.invulnT = REVIVE_SHIELD_SECONDS;
  reviver.stumbleT = REVIVER_STUMBLE_SECONDS;
  return true;
}

// A player left. If it was the chaser, a living runner takes over from behind the others.
export function removeRoundPlayer(round, playerId) {
  const gone = round.players.get(playerId);
  round.players.delete(playerId);
  if (gone?.role === 'chaser') {
    const next = livingRunners(round)[0];
    if (next) {
      const others = [...round.players.values()].filter((player) => player.role === 'runner' && player !== next);
      next.role = 'chaser';
      next.lane = 1;
      next.z = others.length ? Math.max(0, Math.min(...others.map((player) => player.z)) - 12) : next.z;
      next.nextCorner = nextCornerIndex(round.seed, next.z);
    }
  }
  finishIfOver(round);
}

export function stepRound(round, dt) {
  if (round.phase === 'countdown') {
    round.countdown -= dt;
    if (round.countdown <= 0) {
      round.phase = 'run';
    }
    return;
  }
  if (round.phase !== 'run') {
    return;
  }
  round.time += dt;
  const baseSpeed = Math.min(START_SPEED + round.time * SPEED_GAIN, MAX_SPEED);
  const chaser = chaserOf(round);
  const rearZ = rearmostRunnerZ(round);

  for (const player of round.players.values()) {
    if (player.status === 'down') {
      player.downT -= dt;
      if (player.downT <= 0) {
        player.status = 'out';
      }
    } else if (player.status === 'alive') {
      if (player.ai) {
        actForCpu(round, player, speedOf(player, chaser, baseSpeed, rearZ));
      }
      const previousZ = player.z;
      moveAndCollide(round, player, chaser, baseSpeed, rearZ, dt);
      if (player.status !== 'alive') {
        continue;
      }
      if (player.role === 'chaser') {
        keepBehindRunners(round, player, previousZ);
      } else {
        collectPickups(round, player);
      }
    }
  }
  catchRunners(round, chaser);
  for (const runner of livingRunners(round)) {
    round.bestZ = Math.max(round.bestZ, runner.z);
  }
  finishIfOver(round);
}

function actForCpu(round, player, speed) {
  for (const action of cpuActions(round, player, speed, turnPrompt(round, player))) {
    applyAction(round, player.id, action);
  }
  if (player.role === 'runner') {
    const target = downedRunners(round).find((runner) => REVIVE_WINDOW_SECONDS - runner.downT >= CPU_REVIVE_DELAY);
    if (target) {
      reviveRunner(round, player.id, target.id);
    }
  }
}

function rearmostRunnerZ(round) {
  const living = livingRunners(round);
  return living.length ? Math.min(...living.map((runner) => runner.z)) : null;
}

// The monster can slow down but never overtakes a living runner (it would look like they ran behind it).
function keepBehindRunners(round, chaser, previousZ) {
  const rearZ = rearmostRunnerZ(round);
  if (rearZ !== null) {
    chaser.z = Math.min(chaser.z, Math.max(previousZ, rearZ - CHASER_GAP));
  }
}

function speedOf(player, chaser, baseSpeed, rearZ) {
  if (player.role === 'chaser') {
    if (player.pauseT > 0) {
      return 0;
    }
    const behind = rearZ !== null && rearZ - player.z > CATCH_UP_GAP;
    return baseSpeed * CHASER_BONUS * (behind ? CHASER_CATCH_UP : 1);
  }
  const boost = player.boostT > 0 ? BOOST_SPEED : 1;
  return baseSpeed * boost * (player.z - chaser.z > RUNNER_TOO_FAR ? RUNNER_TOO_FAR_SLOWDOWN : 1);
}

function moveAndCollide(round, player, chaser, baseSpeed, rearZ, dt) {
  const stumbleFactor = player.stumbleT > 0 ? STUMBLE_SPEED : player.turnBoostT > 0 ? TURN_BOOST_SPEED : 1;
  player.z += speedOf(player, chaser, baseSpeed, rearZ) * stumbleFactor * dt;
  for (const timer of TIMERS) {
    player[timer] = Math.max(0, player[timer] - dt);
  }
  if (player.turnBufferT > 0) {
    const wanted = cornerAt(round.seed, player.nextCorner).dir;
    if (turnPrompt(round, player) === wanted) {
      makeTurn(player);
    }
  }
  missedCorner(round, player);
  if (player.status !== 'alive') {
    return;
  }
  triggerTiles(round, player);
  if (player.invulnT > 0 || round.settings.immune) {
    return;
  }
  // A frame moves a player less than a unit, so this window sees every obstacle they pass.
  const hit = obstaclesBetween(round.seed, player.z - 0.9, player.z + 0.1, round.settings.hazards).some(
    (obstacle) => obstacle.lane === player.lane && blocks(round, obstacle, player),
  );
  if (hit) {
    hurt(round, player, STUMBLE_SECONDS);
  }
}

// A stumble, and for a runner the loss of a life (none while immune). No lives left means the runner is out.
function hurt(round, player, seconds) {
  player.stumbleT = seconds;
  player.invulnT = seconds;
  if (player.role === 'runner' && !round.settings.immune) {
    player.lives -= 1;
    if (player.lives <= 0) {
      player.status = 'out';
    }
  }
}

// Running past a corner without turning is a crash, unless a shield or boost carries the player round.
function missedCorner(round, player) {
  if (player.z <= cornerAt(round.seed, player.nextCorner).z + TURN_AFTER) {
    return;
  }
  player.nextCorner += 1;
  if (player.shieldT <= 0 && player.boostT <= 0) {
    hurt(round, player, CRASH_SECONDS);
  }
}

// A falling tile starts to fall when anyone gets near, whoever they are.
function triggerTiles(round, player) {
  if (!round.settings.hazards) {
    return;
  }
  for (const obstacle of obstaclesBetween(round.seed, player.z, player.z + TILE_TRIGGER_DISTANCE, true)) {
    if (obstacle.type === OBSTACLE.TILE && !round.fallen.has(obstacleId(obstacle))) {
      round.fallen.set(obstacleId(obstacle), round.time);
    }
  }
}

// Logs, gaps, fire and fallen tiles are cleared by being in the air; beams by sliding; walls never. The first and
// last moments of a jump do not count, so a jump must be timed. Fire only hurts while it burns.
function blocks(round, obstacle, player) {
  const airborne = player.jumpT > 0.08 && player.jumpT < JUMP_SECONDS - 0.08;
  switch (obstacle.type) {
    case OBSTACLE.WALL:
      return true;
    case OBSTACLE.HIGH:
      return player.slideT <= 0;
    case OBSTACLE.FIRE:
      return !airborne && fireIsOn(round.time, obstacle.z);
    case OBSTACLE.TILE:
      return !airborne && round.time - (round.fallen.get(obstacleId(obstacle)) ?? Infinity) >= TILE_FALL_DELAY;
    default:
      return !airborne;
  }
}

// Coins and powerups in the runner's lane, or any coin ahead within reach while a magnet is on.
function collectPickups(round, runner) {
  const reach = runner.magnetT > 0 ? MAGNET_REACH : 0.5;
  for (const pickup of pickupsBetween(round.seed, runner.z - 0.8, runner.z + reach)) {
    const magnetised = runner.magnetT > 0 && pickup.kind === PICKUP.COIN;
    if (!round.collected.has(pickup.id) && (pickup.lane === runner.lane || magnetised) && (magnetised || pickup.z <= runner.z + 0.5)) {
      round.collected.add(pickup.id);
      takePickup(round, runner, pickup);
    }
  }
}

function takePickup(round, runner, pickup) {
  if (pickup.kind === PICKUP.COIN) {
    runner.coins += 1;
    round.coins += 1;
  } else if (pickup.kind === PICKUP.MAGNET) {
    runner.magnetT = MAGNET_SECONDS;
  } else if (pickup.kind === PICKUP.SHIELD) {
    runner.shieldT = SHIELD_SECONDS;
    runner.invulnT = SHIELD_SECONDS;
  } else {
    runner.boostT = BOOST_SECONDS;
    runner.shieldT = Math.max(runner.shieldT, BOOST_SECONDS);
    runner.invulnT = Math.max(runner.invulnT, BOOST_SECONDS);
  }
}

function catchRunners(round, chaser) {
  if (chaser.pauseT > 0 || chaser.status !== 'alive') {
    return;
  }
  for (const runner of livingRunners(round)) {
    if (runner.shieldT <= 0 && runner.lane === chaser.lane && Math.abs(runner.z - chaser.z) < CATCH_RANGE) {
      runner.status = 'down';
      runner.downT = REVIVE_WINDOW_SECONDS;
      chaser.pauseT = CATCH_PAUSE_SECONDS;
      return;
    }
  }
}

// The round ends when no runner is alive, when only CPUs are left (every person has gone), or when every person
// running is out (CPU runners alone do not carry on).
function finishIfOver(round) {
  const players = [...round.players.values()];
  const onlyCpus = players.every((player) => player.ai);
  const peopleRunning = players.filter((player) => player.role === 'runner' && !player.ai);
  const peopleOut = peopleRunning.length > 0 && peopleRunning.every((player) => player.status === 'out');
  if (round.phase === 'over' || (livingRunners(round).length > 0 && !onlyCpus && !peopleOut)) {
    return;
  }
  round.phase = 'over';
  round.result = { meters: Math.floor(round.bestZ), seconds: Math.floor(round.time), coins: round.coins };
}
