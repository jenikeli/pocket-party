// The racing line the CPU drivers follow round a 3D course (M7e): out-in-out through the corners, straight over
// a jump's ramp and gap so karts land on the road, and over the dash panels (racing-line-pins.js). Worked out
// once per track from its stations (track-builder.js). Plain maths, unit tested in Node. Used by cpu-road.js.
//
// How it is found (the rule of K1999, a well-known driver for the TORCS racing simulator): the line starts on the
// centre line, then each point in turn is moved across the road until the line's curvature there is the average
// of its curvature just before and just after, kept inside the road. Repeated, that spreads every corner's turn
// as evenly as the road allows: the line swings wide before a corner, cuts to its inside and drifts out again.
// Points only move along their own station's `right`, and curvature is measured as turning about the road's
// normal, so the line is worked out in the road's own frame: hills, banks and the anti-gravity wall rolled up to
// vertical need nothing special (a bend over a crest or round the wall's cylinder is along the normal).

import { pinnedLaterals } from './racing-line-pins.js';

// The line keeps this far inside each edge of the road (a kart is 2 long and about 1.4 wide), so a CPU kart's
// own offset from it still leaves its wheels on the road.
export const LINE_MARGIN = 1.8;
// The smoothing works from coarse to fine: { spacing, sweeps }, neighbours this many stations away, swept over
// this many times. Coarse spacings shape whole corners (and sweep few stations, so they are cheap); fine ones
// only tidy up, from a line that is already close. It must end at 1: a spacing of k only moves every k-th
// station, the ones between taking a blend.
const SCALES = [
  { spacing: 32, sweeps: 60 },
  { spacing: 16, sweeps: 60 },
  { spacing: 8, sweeps: 40 },
  { spacing: 4, sweeps: 30 },
  { spacing: 2, sweeps: 15 },
  { spacing: 1, sweeps: 10 },
];
// How far a point is nudged to measure how its curvature changes as it moves across the road, and the share of
// the way to its answer each sweep moves it.
const NUDGE = 0.01;
const RELAX = 0.5;
// The curvature handed out is measured over this many stations either side (about 2 units).
const CURVATURE_SPAN = 2;

// One line per track object, built the first time a CPU asks: building takes some tens of milliseconds and every
// CPU kart reads it every step. A WeakMap keyed by the track (not a field on it) leaves the track's own data as
// track-builder.js made it, and lets the line go with the track when another course is chosen.
const linesByTrack = new WeakMap();

// The course's racing line: { lateral, curvature }, one entry per station. lateral is how far right of the
// centre line the line runs (units); curvature is the line's signed 1/radius there, positive turning right.
export function racingLineFor(track) {
  let line = linesByTrack.get(track);
  if (!line) {
    line = buildLine(track);
    linesByTrack.set(track, line);
  }
  return line;
}

function buildLine(track) {
  const shape = lineShape(track);
  for (const { spacing, sweeps } of SCALES) {
    const held = heldAt(shape, spacing);
    for (let sweep = 0; sweep < sweeps; sweep += 1) {
      smoothOnce(shape, spacing, held);
    }
    fillBetween(shape, spacing);
  }
  const { count } = shape;
  const curvature = new Float64Array(count).map((_, index) =>
    curvatureAt(shape, (index - CURVATURE_SPAN + count) % count, index, (index + CURVATURE_SPAN) % count),
  );
  return { lateral: shape.lateral, curvature };
}

// The working data, in flat number arrays so the many sweeps make no objects: each station's point, right and
// normal (x, y, z in turn), the line's lateral, the most it may be either side, and the laterals it must keep
// (NaN where it is free).
function lineShape(track) {
  const count = track.stations.length;
  const shape = {
    count,
    point: new Float64Array(count * 3),
    right: new Float64Array(count * 3),
    normal: new Float64Array(count * 3),
    limit: new Float64Array(count),
    pins: pinnedLaterals(track),
  };
  track.stations.forEach((station, index) => {
    shape.point.set([station.point.x, station.point.y, station.point.z], index * 3);
    shape.right.set([station.right.x, station.right.y, station.right.z], index * 3);
    shape.normal.set([station.normal.x, station.normal.y, station.normal.z], index * 3);
    shape.limit[index] = station.halfWidth - LINE_MARGIN;
  });
  shape.lateral = shape.pins.map((pin) => (Number.isNaN(pin) ? 0 : pin));
  return shape;
}

// One sweep at `spacing`, over every spacing-th station: each free one moves across the road toward where its
// curvature (through its neighbours `spacing` stations either side) is the average of theirs. The mismatch
// changes almost linearly with a small move, so a nudge measures the rate and one step lands near the answer;
// stepping only RELAX of the way keeps the sweeps from overshooting back and forth. `held` is heldAt's.
function smoothOnce(shape, spacing, held) {
  const { count, lateral, limit } = shape;
  for (let index = 0; index < count; index += spacing) {
    if (!Number.isNaN(held[index])) {
      lateral[index] = held[index];
      continue;
    }
    const before = mismatch(shape, index, spacing);
    lateral[index] += NUDGE;
    const rate = (mismatch(shape, index, spacing) - before) / NUDGE;
    lateral[index] -= NUDGE;
    if (Math.abs(rate) > 1e-12) {
      const moved = lateral[index] - (RELAX * before) / rate;
      lateral[index] = Math.min(Math.max(moved, -limit[index]), limit[index]);
    }
  }
}

// The laterals the spacing-th stations must keep at `spacing` (NaN where free): a pin within half a spacing
// holds the nearest of them, so a short pinned stretch (a dash panel) between two of them still shapes the
// coarse line, which the finer spacings could only bend round it slowly.
function heldAt(shape, spacing) {
  const { count, pins } = shape;
  const held = new Float64Array(count).fill(NaN);
  for (let index = 0; index < count; index += spacing) {
    for (let reach = 0; reach <= spacing / 2 && Number.isNaN(held[index]); reach += 1) {
      const nearPin = [pins[(index + reach) % count], pins[(index - reach + count) % count]].find((pin) => !Number.isNaN(pin));
      held[index] = nearPin ?? NaN;
    }
  }
  return held;
}

// How much more the line turns at station `index` than the average of its neighbours a spacing either side.
function mismatch(shape, index, spacing) {
  const twoBack = latticeStep(shape.count, spacing, index, -2);
  const back = latticeStep(shape.count, spacing, index, -1);
  const ahead = latticeStep(shape.count, spacing, index, 1);
  const twoAhead = latticeStep(shape.count, spacing, index, 2);
  const around = (curvatureAt(shape, twoBack, back, index) + curvatureAt(shape, index, ahead, twoAhead)) / 2;
  return curvatureAt(shape, back, index, ahead) - around;
}

// The spacing-th station `steps` of them on from `index` round the loop (negative goes back). The last one's
// next is station 0, a shorter step, so the sweeps only ever look at stations they move.
function latticeStep(count, spacing, index, steps) {
  const last = Math.floor((count - 1) / spacing) * spacing;
  let at = index;
  for (let step = 0; step < Math.abs(steps); step += 1) {
    if (steps > 0) {
      at = at === last ? 0 : at + spacing;
    } else {
      at = at === 0 ? last : at - spacing;
    }
  }
  return at;
}

// After the sweeps at `spacing`, the free stations between every spacing-th one take the straight blend of the
// two, as the start for the next, finer spacing.
function fillBetween(shape, spacing) {
  const { count, lateral, pins } = shape;
  for (let start = 0; start < count; start += spacing) {
    const end = Math.min(start + spacing, count);
    const endLateral = lateral[end % count];
    for (let index = start + 1; index < end; index += 1) {
      if (Number.isNaN(pins[index])) {
        lateral[index] = lateral[start] + ((endLateral - lateral[start]) * (index - start)) / (end - start);
      }
    }
  }
}

// The signed curvature (1/radius, positive turning right) of the circle through the line's points at stations
// back, here and ahead, seen down station here's normal: 2 sin(angle) / chord, where angle is the turn between
// the two halves. That circle's curvature is exact for a round corner at any spacing, unlike a midpoint rule,
// which cuts inside a tight corner when the spacing is big.
function curvatureAt(shape, back, here, ahead) {
  const { normal } = shape;
  const intoX = linePoint(shape, here, 0) - linePoint(shape, back, 0);
  const intoY = linePoint(shape, here, 1) - linePoint(shape, back, 1);
  const intoZ = linePoint(shape, here, 2) - linePoint(shape, back, 2);
  const outX = linePoint(shape, ahead, 0) - linePoint(shape, here, 0);
  const outY = linePoint(shape, ahead, 1) - linePoint(shape, here, 1);
  const outZ = linePoint(shape, ahead, 2) - linePoint(shape, here, 2);
  // Turning right is clockwise seen from above the road, so into x out points down the normal: hence the minus.
  const turn =
    (intoY * outZ - intoZ * outY) * normal[here * 3] +
    (intoZ * outX - intoX * outZ) * normal[here * 3 + 1] +
    (intoX * outY - intoY * outX) * normal[here * 3 + 2];
  const lengths = Math.hypot(intoX, intoY, intoZ) * Math.hypot(outX, outY, outZ) * Math.hypot(intoX + outX, intoY + outY, intoZ + outZ);
  return (-2 * turn) / lengths;
}

// One coordinate (`axis` 0, 1, 2 for x, y, z) of the line's point at `station`.
function linePoint(shape, station, axis) {
  return shape.point[station * 3 + axis] + shape.right[station * 3 + axis] * shape.lateral[station];
}
