// Where a card may be played: the pad-to-arena conversion, snapping, and the deploy zones (own half, the pocket
// that opens when an enemy Warden falls, spells anywhere). Pure functions, unit tested. Used by match.js, the
// CPU and the host's ghost.

import { ARENA_TEAMS } from '../../../shared/protocol.js';
import { ARENA, ownHalf, pocketRect } from '../../../shared/arena-map.js';

// The pad on a phone shows the whole arena, turned so the player's own base is at the bottom: Dawn sees it as the
// host does, Dusk's is turned 180 degrees. (px, py) are fractions of the pad from its top-left.
export function padToWorld(team, px, py) {
  const x = Math.min(Math.max(px, 0), 1);
  const y = Math.min(Math.max(py, 0), 1);
  return team === ARENA_TEAMS.DAWN ? { x: x * ARENA.width, y: y * ARENA.height } : { x: (1 - x) * ARENA.width, y: (1 - y) * ARENA.height };
}

// Troops land on half-tile positions.
export function snap(value) {
  return Math.round(value * 2) / 2;
}

function insideTower(world, x, y) {
  return world.towers.some((tower) => tower.alive && Math.abs(x - tower.x) < tower.w / 2 + 0.3 && Math.abs(y - tower.y) < tower.h / 2 + 0.3);
}

function inRect(rect, x, y) {
  return x >= rect.x0 && x < rect.x1 && y >= rect.y0 && y < rect.y1;
}

// Whether `team` may play `card` at (x, y) now.
export function canDeploy(world, team, card, x, y) {
  if (x < 0 || x > ARENA.width || y < 0 || y > ARENA.height) {
    return false;
  }
  if (card.type === 'spell') {
    return true;
  }
  if (insideTower(world, x, y)) {
    return false;
  }
  const half = ownHalf(team);
  if (y >= half.y0 && y < half.y1) {
    return true;
  }
  return [0, 1].some((lane) => {
    const fallen = world.towers.some((tower) => tower.team !== team && tower.kind === 'warden' && tower.lane === lane && !tower.alive);
    return fallen && inRect(pocketRect(team, lane), x, y);
  });
}

// Where the units of one play land around the chosen point.
export function spawnOffsets(count) {
  const patterns = {
    1: [[0, 0]],
    2: [[-0.5, 0], [0.5, 0]],
    3: [[-0.6, 0.3], [0.6, 0.3], [0, -0.4]],
    4: [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]],
  };
  return patterns[count] ?? patterns[1];
}
