// Spirefall's arena geometry, 18 x 32 tiles: the river, the two bridges, the tower layout, the deploy zones and the
// walking route across the river. Plain functions with no DOM, shared by the host's rules and the phone's pad
// drawing. Dawn holds the bottom half (large y), Dusk the top; Dawn troops walk toward y = 0.

import { ARENA_TEAMS } from './protocol.js';

const { DAWN, DUSK } = ARENA_TEAMS;

export const ARENA = Object.freeze({ width: 18, height: 32, riverTop: 15, riverBottom: 17, centerX: 9 });

// The two bridges: x range and centre. Lane 0 is the left half of the arena, lane 1 the right.
export const BRIDGES = Object.freeze([
  Object.freeze({ lane: 0, x0: 2, x1: 5, cx: 3.5 }),
  Object.freeze({ lane: 1, x0: 13, x1: 16, cx: 14.5 }),
]);

// The y direction a team's troops walk: Dawn up the screen, Dusk down.
export function forward(team) {
  return team === DAWN ? -1 : 1;
}

export function laneOf(x) {
  return x < ARENA.centerX ? 0 : 1;
}

// Which team's half a y is in, or null in the river.
export function halfOf(y) {
  if (y < ARENA.riverTop) {
    return DUSK;
  }
  return y > ARENA.riverBottom ? DAWN : null;
}

// A team's three towers: two Wardens (one per lane) and the Keep. Dusk's are Dawn's turned over in y.
export function towerLayout(team) {
  const flip = (y) => (team === DAWN ? y : ARENA.height - y);
  return [
    { kind: 'warden', lane: 0, x: 3.5, y: flip(25.5), w: 3, h: 3 },
    { kind: 'warden', lane: 1, x: 14.5, y: flip(25.5), w: 3, h: 3 },
    { kind: 'keep', lane: null, x: 9, y: flip(29.5), w: 4, h: 4 },
  ];
}

// The rows a team may deploy troops in without a pocket: its own half.
export function ownHalf(team) {
  return team === DAWN ? { y0: ARENA.riverBottom, y1: ARENA.height } : { y0: 0, y1: ARENA.riverTop };
}

// The pocket on the enemy side of one lane: it opens when the enemy Warden of that lane has fallen.
export function pocketRect(team, lane) {
  const x0 = lane === 0 ? 0 : ARENA.centerX;
  const x1 = lane === 0 ? ARENA.centerX : ARENA.width;
  return team === DAWN ? { x0, x1, y0: 9, y1: ARENA.riverTop } : { x0, x1, y0: ARENA.riverBottom, y1: 23 };
}

// The next point a ground walker heads for to reach `goal`: the goal itself on the same side of the river,
// otherwise the bridge that costs least, then straight over it. Fliers and leapers go straight (the caller skips this).
export function routeTo(from, goal) {
  const fromHalf = halfOf(from.y);
  const goalHalf = halfOf(goal.y);
  if (fromHalf === goalHalf && fromHalf !== null) {
    return goal;
  }
  const goingUp = goal.y < from.y;
  const exitY = goingUp ? ARENA.riverTop - 0.8 : ARENA.riverBottom + 0.8;
  const entryY = goingUp ? ARENA.riverBottom + 0.5 : ARENA.riverTop - 0.5;
  const bridge = BRIDGES.reduce((best, other) => {
    const cost = (candidate) => Math.abs(from.x - candidate.cx) + Math.abs(candidate.cx - goal.x);
    return cost(other) < cost(best) ? other : best;
  });
  if (fromHalf === null || Math.abs(from.x - bridge.cx) <= 1) {
    return { x: Math.min(Math.max(from.x, bridge.x0 + 0.5), bridge.x1 - 0.5), y: exitY };
  }
  return { x: bridge.cx, y: entryY };
}

// Keeps a ground walker out of the river except on a bridge, and inside the arena. Changes `unit` in place.
export function constrainGround(unit, radius) {
  unit.x = Math.min(Math.max(unit.x, radius), ARENA.width - radius);
  unit.y = Math.min(Math.max(unit.y, radius), ARENA.height - radius);
  if (unit.y > ARENA.riverTop && unit.y < ARENA.riverBottom) {
    const onBridge = BRIDGES.some((bridge) => unit.x >= bridge.x0 + radius * 0.5 && unit.x <= bridge.x1 - radius * 0.5);
    if (!onBridge) {
      unit.y = unit.y < (ARENA.riverTop + ARENA.riverBottom) / 2 ? ARENA.riverTop : ARENA.riverBottom;
    }
  }
}
