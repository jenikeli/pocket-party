// The odds by place (M8): which item a kart's roulette lands on, from its place in the field. Karts further
// back get more catch-up items, leaders more defend items, as in MK8DX; even items come up the same everywhere.
// Plain functions, unit tested in Node. Used by item-rules.js at each pickup.

import { ITEM_CATALOG, ITEM_ROLES } from './item-catalog.js';

// Each role's weight for the leader and for last place; a place in between gets a weight on the straight line
// between the two. A weight never reaches 0, so an item that is the only one allowed still comes up.
const ROLE_WEIGHTS = Object.freeze({
  [ITEM_ROLES.CATCH_UP]: { leader: 0.05, last: 3 },
  [ITEM_ROLES.DEFEND]: { leader: 3, last: 0.05 },
  [ITEM_ROLES.EVEN]: { leader: 1, last: 1 },
});

// A role's weight for the kart in `place` (1 is first) of `fieldSize` karts.
export function roleWeight(role, place, fieldSize) {
  // 0 for the leader, 1 for last place.
  const back = fieldSize > 1 ? (place - 1) / (fieldSize - 1) : 0;
  const { leader, last } = ROLE_WEIGHTS[role];
  return leader + (last - leader) * back;
}

// The chance of each of the `allowed` item ids for the kart in `place` of `fieldSize` karts: { [id]: chance },
// the chances adding up to 1.
export function itemChances(allowed, place, fieldSize) {
  const weights = allowed.map((id) => roleWeight(ITEM_CATALOG[id].role, place, fieldSize));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return Object.fromEntries(allowed.map((id, index) => [id, weights[index] / total]));
}

// One of the `allowed` item ids (a non-empty list), drawn by the odds for `place`. `random` is a number in 0..1
// from the race's own random numbers.
export function drawItem(allowed, place, fieldSize, random) {
  const chances = itemChances(allowed, place, fieldSize);
  let runningTotal = 0;
  for (const id of allowed) {
    runningTotal += chances[id];
    if (random < runningTotal) {
      return id;
    }
  }
  // Only reached when rounding leaves the chances adding up to a hair under 1.
  return allowed.at(-1);
}
