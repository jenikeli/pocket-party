// The item boxes (M8): where they stand (rows across the road at the distances a course lists in
// itemBoxRows), a kart driving through one, and a broken box coming back. Plain functions on the race's plain
// data, unit tested in Node. Used by item-rules.js; the boxes' look reads race.items.boxes (item-drawing.js).

import { pointAt, stationIndexAt, wrapDistance, progressBetween } from '../track.js';
import { subtract, length } from '../vector.js';
import { tuning } from '../tuning.js';

// Boxes in a row stand about this far apart, as in the reference game's rows: a kart anywhere across the road meets one
// unless it aims between two.
const BOX_SPACING = 4;
// The outer boxes stand at least this far inside the road's edges.
const EDGE_MARGIN = 1.5;
// A kart whose middle comes this close to a box's middle drives through it. With boxes about 4 apart, a gap
// of a few tenths is left between two boxes' reach.
export const PICKUP_REACH = 1.8;

// Every box's spot on `track`: [{ s, lateral }], row by row, left to right. Each row spreads its boxes evenly
// across the road where it stands, as close to BOX_SPACING apart as fits.
export function itemBoxSpots(track) {
  return track.itemBoxRows.flatMap((rowS) => {
    const s = wrapDistance(track, rowS);
    const reach = track.stations[stationIndexAt(track, s)].halfWidth - EDGE_MARGIN;
    const count = Math.round((2 * reach) / BOX_SPACING) + 1;
    const spacing = (2 * reach) / (count - 1);
    return Array.from({ length: count }, (unused, index) => ({ s, lateral: -reach + index * spacing }));
  });
}

// The race's boxes, all standing: [{ s, lateral, returnLeft }], returnLeft 0 while a box stands, else the
// seconds until it is back.
export function createBoxes(track) {
  return itemBoxSpots(track).map((spot) => ({ ...spot, returnLeft: 0 }));
}

// Breaks every standing box `kart` is driving through; returns how many it broke.
export function breakBoxesAt(track, boxes, kart) {
  let broken = 0;
  for (const box of boxes) {
    if (box.returnLeft === 0 && isTouching(track, box, kart)) {
      box.returnLeft = tuning.itemBoxReturnSeconds;
      broken += 1;
    }
  }
  return broken;
}

// Measured in space, not along the road, so a kart on a bridge over a row (or flying over it) misses it. The
// distance along the road is checked first only because it is quick, and rules out almost every box.
function isTouching(track, box, kart) {
  if (Math.abs(progressBetween(track, box.s, kart.s)) > PICKUP_REACH) {
    return false;
  }
  return length(subtract(kart.position, pointAt(track, box.s, box.lateral).position)) <= PICKUP_REACH;
}

// Broken boxes count down to coming back.
export function countBoxesBack(boxes, dt) {
  for (const box of boxes) {
    box.returnLeft = Math.max(box.returnLeft - dt, 0);
  }
}
