// The big hangar's steel (M9), after the references' hangars (test-results/reference/m9/H/): arched lattice ribs
// across the span on fat coral columns, lattice girders along the eaves, purlins under the roof, crossed braces
// in the end bays of the open sides, the door headers and the posts of the door pockets, and the glazed gables'
// mullions. All one geometry, coloured per vertex, in the hangar's frame (kit/hangar-plan.js). Used by
// kit/hangar-big.js.

import { at, coloured, mergeShapes, roundedBox } from '../shape-utils.js';
import { member } from './hangar-parts.js';
import { RIB_DEPTH } from './hangar-plan.js';
import { CORAL } from './hangar-maps.js';

const WHITE = 0xf2f1ec;
const PALE_STEEL = 0xc9ced6;
const CONCRETE = 0xc8c2b8;
// A rib's chords are cut into this many straight pieces across the span.
const RIB_PIECES = 24;
const CHORD = 0.5;
const WEB = 0.26;
const COLUMN = 1.7;
const PLINTH = { width: 2.6, height: 1.2 };
// Purlins run along the roof about this far apart across it.
const PURLIN_SPACING = 6;
// The doors' header: this deep below the eaves; the pockets reach a door leaf's width past the sides.
export const HEADER_DEPTH = 2.4;
export const LEAVES_PER_SIDE = 4;
// Mullions in the glazed gables, about this far apart.
const MULLION_SPACING = 7;

// The steel of the hangar planned by `plan` (kit/hangar-plan.js), one geometry.
export function buildFrameGeometry(plan) {
  const { length, width, ribXs } = plan;
  const shapes = [
    ...ribXs.flatMap((x) => [...rib(plan, x), ...column(plan, x, -1), ...column(plan, x, 1)]),
    ...[-1, 1].flatMap((side) => eaveGirder(plan, side * width / 2)),
    ...purlins(plan),
    ...[-1, 1].flatMap((side) => sideBraces(plan, side * width / 2)),
    ...[-1, 1].flatMap((end) => [...header(plan, end * length / 2), ...mullions(plan, end * length / 2)]),
  ];
  return mergeShapes(shapes);
}

// The doors' pocket: how far past each side the leaves stand when open (a leaf's width).
export function pocketWidth(width) {
  return width / (2 * LEAVES_PER_SIDE);
}

// One arched lattice rib at `x`: an outer chord under the roof, an inner chord RIB_DEPTH below it, posts and
// zigzag diagonals between.
function rib({ width, archY }, x) {
  const zAt = (piece) => -width / 2 + (width * piece) / RIB_PIECES;
  const outer = (piece) => [x, archY(zAt(piece)) - 0.3, zAt(piece)];
  const inner = (piece) => [x, archY(zAt(piece)) - RIB_DEPTH, zAt(piece)];
  const shapes = [];
  for (let piece = 0; piece < RIB_PIECES; piece += 1) {
    shapes.push(member(outer(piece), outer(piece + 1), CHORD, WHITE), member(inner(piece), inner(piece + 1), CHORD, WHITE));
    shapes.push(member(inner(piece), outer(piece), WEB, WHITE, true));
    shapes.push(piece % 2 === 0 ? member(inner(piece), outer(piece + 1), WEB, WHITE, true) : member(outer(piece), inner(piece + 1), WEB, WHITE, true));
  }
  return shapes;
}

// A column at the foot of the rib at `x` on `side` (-1 or 1): a coral post up to the eaves on a concrete plinth,
// with a knee brace out to the rib.
function column({ width, eave, archY }, x, side) {
  const z = (side * width) / 2;
  const braceZ = side * (width / 2 - 5);
  return [
    coloured(at(roundedBox(COLUMN, eave, COLUMN, 0.25, { chamfered: true }), x, eave / 2, z), CORAL),
    coloured(at(roundedBox(PLINTH.width, PLINTH.height, PLINTH.width, 0.15, { chamfered: true }), x, PLINTH.height / 2, z), CONCRETE),
    member([x, eave - 6, z], [x, archY(braceZ) - RIB_DEPTH, braceZ], CHORD, CORAL),
  ];
}

// A lattice girder along the side at `z`, tying the columns' tops: chords end to end and diagonals between.
function eaveGirder({ length, eave }, z) {
  const [top, bottom] = [eave - 0.3, eave - RIB_DEPTH];
  const steps = Math.round(length / 3);
  const xAt = (step) => -length / 2 + (length * step) / steps;
  const shapes = [member([-length / 2, top, z], [length / 2, top, z], CHORD, CORAL), member([-length / 2, bottom, z], [length / 2, bottom, z], CHORD, CORAL)];
  for (let step = 0; step < steps; step += 1) {
    const [from, to] = step % 2 === 0 ? [bottom, top] : [top, bottom];
    shapes.push(member([xAt(step), from, z], [xAt(step + 1), to, z], WEB, CORAL, true));
  }
  return shapes;
}

// Purlins along the whole hangar just under the roof, PURLIN_SPACING apart across it.
function purlins({ length, width, archY }) {
  const count = Math.round(width / PURLIN_SPACING);
  return Array.from({ length: count - 1 }, (unused, index) => {
    const z = -width / 2 + (width * (index + 1)) / count;
    const y = archY(z) - 0.55;
    return member([-length / 2, y, z], [length / 2, y, z], 0.4, PALE_STEEL, true);
  });
}

// Crossed braces in the first and last bays of the open side at `z`, from the plinths to under the girder.
function sideBraces({ eave, ribXs }, z) {
  const bays = [[ribXs[0], ribXs[1]], [ribXs[ribXs.length - 2], ribXs[ribXs.length - 1]]];
  return bays.flatMap(([from, to]) => [
    member([from, PLINTH.height, z], [to, eave - RIB_DEPTH - 0.3, z], 0.32, PALE_STEEL, true),
    member([to, PLINTH.height, z], [from, eave - RIB_DEPTH - 0.3, z], 0.32, PALE_STEEL, true),
  ]);
}

// The doors' header across the end at `x`: a coral beam under the gable, deep enough to hold every leaf's track
// and long enough to reach over both pockets, and the post at each pocket's far end.
function header({ width, eave }, x) {
  const reach = width / 2 + pocketWidth(width) + 1;
  const out = Math.sign(x) * 2;
  const beam = coloured(at(roundedBox(3.6, HEADER_DEPTH, 2 * reach, 0.3), x + out, eave - HEADER_DEPTH / 2, 0), CORAL);
  const posts = [-1, 1].map((side) => coloured(at(roundedBox(1.2, eave, 1.2, 0.2, { chamfered: true }), x + out, eave / 2, side * (reach - 0.6)), CORAL));
  return [beam, ...posts];
}

// Upright mullions in the glazed gable at the end `x`, from the header up to the roof, and a transom halfway.
function mullions({ width, eave, archY }, x) {
  const count = Math.round(width / MULLION_SPACING);
  const shapes = [];
  for (let index = 1; index < count; index += 1) {
    const z = -width / 2 + (width * index) / count;
    shapes.push(member([x, eave, z], [x, archY(z) - 0.2, z], 0.3, WHITE, true));
  }
  const transomY = eave + (archY(0) - eave) * 0.5;
  const transomZ = halfWidthAt(width, eave, archY, transomY);
  shapes.push(member([x, transomY, -transomZ], [x, transomY, transomZ], 0.3, WHITE, true));
  return shapes;
}

// Where the roof comes down to height `y`: the z (positive) at which archY(z) = y, by halving.
function halfWidthAt(width, eave, archY, y) {
  let [low, high] = [0, width / 2];
  for (let step = 0; step < 30; step += 1) {
    const middle = (low + high) / 2;
    [low, high] = archY(middle) > y ? [middle, high] : [low, middle];
  }
  return low;
}
