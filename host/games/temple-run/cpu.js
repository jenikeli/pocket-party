// The brain of a CPU player in the temple run, for a runner or the monkey: each step it looks ahead and answers
// with the swipes a person would make. A CPU makes mistakes by skill: for each obstacle (and corner) it
// deterministically decides, from the player's id and the thing's id, whether to ignore it. No DOM; it reads the
// round and returns actions, which rules.js applies. Used by rules.js (imports track.js only, so there is no cycle).

import { obstaclesBetween, obstacleId, fireIsOn, cornerAt, OBSTACLE, LANE_COUNT } from './track.js';

// Chance of ignoring an obstacle or corner, by the settings' skill.
const MISTAKE_CHANCE = { easy: 0.3, normal: 0.12, hard: 0.02 };
// Seconds before arrival that a CPU reacts, as a share of its speed in units.
const LOOK_AHEAD_SECONDS = 0.9;
const WALL_REACTION_SECONDS = 0.8;
const JUMP_LEAD_SECONDS = 0.32;
const SLIDE_LEAD_SECONDS = 0.26;
const CORNER_DISTANCE = 8;
const MONSTER_CLOSE = 5;

// A repeatable number from 0 to 1 for a piece of text, so a CPU's mistakes are the same every time (and testable).
function chance(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

// Which way to step, from `lane`, to a lane with no wall in this row (preferring one with no obstacle at all).
function dodgeStep(lane, row, avoid) {
  const options = [lane - 1, lane + 1].filter((next) => next >= 0 && next < LANE_COUNT && next !== avoid);
  const clear = options.filter((next) => !row.some((obstacle) => obstacle.lane === next && obstacle.type === OBSTACLE.WALL));
  const empty = clear.find((next) => !row.some((obstacle) => obstacle.lane === next));
  const target = empty ?? clear[0];
  return target === undefined ? null : target < lane ? 'left' : 'right';
}

// Returns the list of actions ('left', 'right', 'jump', 'slide') this CPU swipes now. `speed` is its speed in
// units per second and `turnDir` the corner it may turn right now (from rules.turnPrompt), or null.
export function cpuActions(round, player, speed, turnDir) {
  const actions = [];
  const mistake = MISTAKE_CHANCE[round.settings.skill] ?? MISTAKE_CHANCE.normal;
  const corner = cornerAt(round.seed, player.nextCorner);
  if (turnDir && corner.z - player.z <= CORNER_DISTANCE && chance(`${player.id}c${player.nextCorner}`) >= mistake * 0.5) {
    actions.push(turnDir);
    return actions;
  }
  const ahead = obstaclesBetween(round.seed, player.z + 0.2, player.z + speed * LOOK_AHEAD_SECONDS, round.settings.hazards);
  const own = ahead.filter((obstacle) => obstacle.lane === player.lane).sort((first, second) => first.z - second.z)[0];
  const ignored = own && chance(`${player.id}${obstacleId(own)}`) < mistake;
  if (own && !ignored) {
    const distance = own.z - player.z;
    const row = ahead.filter((obstacle) => obstacle.z === own.z);
    if (own.type === OBSTACLE.WALL) {
      const step = distance < speed * WALL_REACTION_SECONDS ? dodgeStep(player.lane, row, null) : null;
      if (step) {
        actions.push(step);
        return actions;
      }
    } else if (own.type === OBSTACLE.HIGH) {
      if (distance <= speed * SLIDE_LEAD_SECONDS) {
        actions.push('slide');
      }
    } else if (distance <= speed * JUMP_LEAD_SECONDS && distance >= speed * 0.06) {
      const burning = own.type !== OBSTACLE.FIRE || fireIsOn(round.time + distance / speed, own.z);
      if (burning) {
        actions.push('jump');
      }
    }
  }
  const lane = laneWish(round, player, ahead);
  if (lane) {
    actions.push(lane);
  }
  return actions;
}

// Where the CPU would like to be: the monkey goes after the rearmost runner, a runner keeps out of the monkey's lane.
function laneWish(round, player, ahead) {
  const others = [...round.players.values()];
  if (player.role === 'chaser') {
    const prey = others.filter((other) => other.role === 'runner' && other.status === 'alive').sort((first, second) => first.z - second.z)[0];
    if (!prey || prey.lane === player.lane) {
      return null;
    }
    return prey.lane < player.lane ? 'left' : 'right';
  }
  const monkey = others.find((other) => other.role === 'chaser');
  if (monkey && monkey.status === 'alive' && monkey.lane === player.lane && player.z - monkey.z < MONSTER_CLOSE && player.shieldT <= 0) {
    const row = ahead.filter((obstacle) => obstacle.z === ahead[0]?.z);
    return dodgeStep(player.lane, row, monkey.lane);
  }
  return null;
}
