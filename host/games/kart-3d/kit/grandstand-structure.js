// The grandstand's structure below its roof (M7d4c3), after Toad Circuit's stands in MK8DX: two decks of stepped
// seating (each row a concrete step, its riser and its tread meeting at a bevelled nose, with a row of seat shells
// on it), each deck on silver lattice columns, a low wall in front for the sponsor boards, a parapet and railing
// along the upper deck's front, a back wall, and a flight of stairs at each end. Built along x round x = 0,
// standing on y = 0 with its front at z = 0, facing +z. Used by kit/grandstand.js.

import * as THREE from 'three';
import { roundedBox, at, between, coloured, shaded } from '../shape-utils.js';
import { STEEL, beam, latticeColumn, railing } from './grandstand-steel.js';

// The stairs take this much of each end of the stand's length; the seating the rest.
const STAIR_WIDTH = 1.4;
// How deep each row's step is below its tread: its riser shows the rise, the rest hangs under the row in front.
const STEP_DEPTH = 0.55;
// Each deck: its rows, the first tread's height, how much each row rises and how deep it is, the front of its
// first row and the back of its last (z), and its seats' colour.
const DECKS = [
  { rows: 3, firstTop: 1.1, rise: 0.45, depth: 1.05, front: -0.4, back: -3.85, seat: 0x1d4fc4 },
  { rows: 3, firstTop: 4.0, rise: 0.5, depth: 0.95, front: -4.05, back: -6.9, seat: 0xd8302a },
];
// The back wall's front and back; the stand's back is its back.
const BACK_WALL = [-6.9, -7.15];
export const BACK_WALL_HEIGHT = 7.45;
const FRONT_WALL_HEIGHT = 1.1;
const BOARD_LENGTH = 4;
// The upper deck's parapet: low, so its first row shows over it, a railing on top.
const PARAPET_TOP = 4.3;
// The seats: about this far apart along a row, their pans this high above the tread and this far behind the
// row's front edge; an aisle this wide (half each side) is left at every column.
const SEAT_SPACING = 0.75;
const SEAT_HEIGHT = 0.42;
const SEAT_SETBACK = 0.45;
const AISLE_HALF = 0.55;
// Columns stand about this far apart along the stand.
const COLUMN_SPACING = 7;
const CONCRETE = 0xd9d4ca;
const WALL = 0xeeeae2;
const BAND = 0x1d4fc4;
const FOOT = 0x3a3a40;

// Where things go along a stand `length` long: { halfSeating, columnXs, frontWall }: the seating's half length,
// the x of each line of columns (one at each end of the seating and evenly between), and the front wall's
// { bottom, top, front } where the sponsor boards go.
export function standLayout(length) {
  const halfSeating = length / 2 - STAIR_WIDTH;
  const count = Math.max(2, Math.round((2 * halfSeating) / COLUMN_SPACING) + 1);
  const outer = halfSeating - 0.3;
  const columnXs = Array.from({ length: count }, (_, index) => -outer + (2 * outer * index) / (count - 1));
  const boards = Math.max(1, Math.round((2 * halfSeating) / BOARD_LENGTH));
  return { halfSeating, columnXs, frontWall: { bottom: 0.16, top: FRONT_WALL_HEIGHT - 0.08, front: -0.06, boards } };
}

// Every seat of a stand `length` long: [{ x, y, z, deck }], where a spectator sits (the middle of the seat's pan,
// on its top) and which deck it is on (0 lower, 1 upper). No seats in the aisles at the columns.
export function seatSpots(length) {
  const { halfSeating, columnXs } = standLayout(length);
  const spots = [];
  DECKS.forEach((deck, deckIndex) => {
    for (let row = 0; row < deck.rows; row += 1) {
      for (let x = -halfSeating + 0.45; x <= halfSeating - 0.45; x += SEAT_SPACING) {
        if (columnXs.every((columnX) => Math.abs(x - columnX) > AISLE_HALF)) {
          spots.push({ x, y: deck.firstTop + row * deck.rise + SEAT_HEIGHT, z: deck.front - row * deck.depth - SEAT_SETBACK, deck: deckIndex });
        }
      }
    }
  });
  return spots;
}

// The colour of the seats on `deck` (0 lower, 1 upper), a hex.
export function seatColor(deck) {
  return DECKS[deck].seat;
}

// One seat shell, its pan's top middle at the origin: a pan and a back tipped a little back, on a pedestal down to
// the tread. There are hundreds of them (about 130 triangles each): the pan and back chamfered, not rounded, and
// the pedestal, hidden behind legs and the row in front, a plain box.
export function buildSeat() {
  const chamfer = { chamfered: true };
  return [
    at(roundedBox(0.5, 0.07, 0.42, 0.03, chamfer), 0, -0.035, 0.02),
    at(roundedBox(0.5, 0.44, 0.07, 0.03, chamfer).rotateX(-0.15), 0, 0.2, -0.2),
    at(new THREE.BoxGeometry(0.12, SEAT_HEIGHT - 0.05, 0.2), 0, -0.035 - SEAT_HEIGHT / 2, -0.06),
  ];
}

// The concrete and steel of everything under the roof for a stand `length` long: { concrete, steel }, lists of
// shapes coloured per vertex.
export function buildDecksAndStairs(length) {
  const layout = standLayout(length);
  const concrete = [...frontWall(layout), backWall(length)];
  const steel = [];
  DECKS.forEach((deck) => concrete.push(...deckSteps(deck, layout.halfSeating)));
  concrete.push(...parapet(layout.halfSeating));
  steel.push(...railing([-layout.halfSeating, PARAPET_TOP, -3.95], [layout.halfSeating, PARAPET_TOP, -3.95], 0.6, 1.5));
  for (const x of layout.columnXs) {
    steel.push(...deckFrame(x));
  }
  for (const side of [-1, 1]) {
    const flight = stairs(side * (layout.halfSeating + STAIR_WIDTH / 2));
    concrete.push(...flight.concrete);
    steel.push(...flight.steel);
  }
  return { concrete, steel };
}

// A deck's rows: each a concrete step with rounded edges, lighter on its tread and darker toward the foot of its
// riser, where it meets the row below (the crease).
function deckSteps(deck, halfSeating) {
  return Array.from({ length: deck.rows }, (_, row) => {
    const top = deck.firstTop + row * deck.rise;
    const front = deck.front - row * deck.depth;
    // Each step reaches a little under the next, so no gap shows between them; the last reaches the deck's back.
    const back = row === deck.rows - 1 ? deck.back : front - deck.depth - 0.05;
    const step = at(roundedBox(2 * halfSeating, STEP_DEPTH, front - back, 0.06), 0, top - STEP_DEPTH / 2, (front + back) / 2);
    return shaded(coloured(step, CONCRETE), (_, y) => 0.72 + 0.28 * Math.min(Math.max((y - (top - STEP_DEPTH)) / STEP_DEPTH, 0), 1));
  });
}

// The low wall along the front that carries the sponsor boards: a dark foot, the wall, a rounded coping on top,
// and a white divider standing out between each two boards and at both ends.
function frontWall({ halfSeating, frontWall: boards }) {
  const width = (2 * halfSeating) / boards.boards;
  const dividers = Array.from({ length: boards.boards + 1 }, (_, index) => {
    const divider = roundedBox(0.09, boards.top - boards.bottom + 0.06, 0.06, 0.02, { chamfered: true });
    return coloured(at(divider, Math.min(Math.max(-halfSeating + index * width, -halfSeating + 0.05), halfSeating - 0.05), (boards.top + boards.bottom) / 2, -0.04), WALL);
  });
  return [
    coloured(at(roundedBox(2 * halfSeating, FRONT_WALL_HEIGHT, 0.34, 0.05), 0, FRONT_WALL_HEIGHT / 2, -0.23), WALL),
    coloured(at(roundedBox(2 * halfSeating, 0.14, 0.38, 0.04), 0, 0.07, -0.23), FOOT),
    coloured(at(roundedBox(2 * halfSeating, 0.12, 0.44, 0.05), 0, FRONT_WALL_HEIGHT + 0.02, -0.24), WALL),
    ...dividers,
  ];
}

// The upper deck's front: a white parapet with a blue band along it, under the railing.
function parapet(halfSeating) {
  const top = PARAPET_TOP;
  const bottom = DECKS[1].firstTop - STEP_DEPTH;
  return [
    coloured(at(roundedBox(2 * halfSeating, top - bottom, 0.22, 0.06), 0, (top + bottom) / 2, -3.95), WALL),
    coloured(at(roundedBox(2 * halfSeating, 0.22, 0.26, 0.05), 0, top - 0.3, -3.95), BAND),
  ];
}

// The wall behind the upper deck, up to the roof, a little darker toward its foot.
function backWall(length) {
  const [front, back] = BACK_WALL;
  const wall = at(roundedBox(length, BACK_WALL_HEIGHT, front - back, 0.06), 0, BACK_WALL_HEIGHT / 2, (front + back) / 2);
  return shaded(coloured(wall, WALL), (_, y) => 0.8 + 0.2 * Math.min(y / 3, 1));
}

// The steel under both decks at one line of columns, x along the stand: a column under the back of the lower
// deck and one under each end of the upper, and a raking beam under each deck's steps from column to column.
function deckFrame(x) {
  const [lower, upper] = DECKS;
  const lowerUnder = lower.firstTop + (lower.rows - 1) * lower.rise - STEP_DEPTH;
  const upperFront = upper.firstTop - STEP_DEPTH;
  const upperBack = upper.firstTop + (upper.rows - 1) * upper.rise - STEP_DEPTH;
  return [
    ...latticeColumn(x, -3.4, 0, lowerUnder, 0.34),
    ...latticeColumn(x, -4.3, 0, upperFront),
    ...latticeColumn(x, -6.6, 0, BACK_WALL_HEIGHT),
    beam([x, lower.firstTop - STEP_DEPTH - 0.08, -0.5], [x, lowerUnder - 0.08, -3.4], 0.22),
    beam([x, upperFront - 0.08, -4.3], [x, upperBack - 0.08, -6.6], 0.22),
  ];
}

// A flight of stairs at x, from the ground at the front up to the upper deck's back row: steps of concrete
// (each a riser and a tread with a bevelled nose, as the decks' rows), between silver stringers with a handrail
// along each side, on a lattice column halfway up.
function stairs(x) {
  const upper = DECKS[1];
  const [bottomZ, topZ] = [-0.15, upper.back];
  const topY = upper.firstTop + (upper.rows - 1) * upper.rise;
  const count = Math.round(topY / 0.25);
  const [rise, going] = [topY / count, (bottomZ - topZ) / count];
  const width = STAIR_WIDTH - 0.3;
  const concrete = Array.from({ length: count }, (_, index) => {
    const top = (index + 1) * rise;
    const height = Math.min(rise + 0.15, top);
    const front = bottomZ - index * going;
    const step = at(roundedBox(width, height, going + 0.04, 0.04, { chamfered: true }), x, top - height / 2, front - (going + 0.04) / 2);
    return shaded(coloured(step, CONCRETE), (_, y) => 0.75 + 0.25 * Math.min(Math.max((y - (top - height)) / height, 0), 1));
  });
  const steel = latticeColumn(x, -3.6, 0, ((bottomZ + 3.6) / (bottomZ - topZ)) * topY - 0.35, 0.3);
  for (const side of [-1, 1]) {
    const sideX = x + side * (width / 2 + 0.05);
    // The stringer runs just under the steps' noses, covering their ends.
    steel.push(coloured(between(new THREE.BoxGeometry(0.1, 1, 0.4), [sideX, 0.2, bottomZ - 0.3], [sideX, topY - 0.1, topZ]), STEEL));
    steel.push(...railing([sideX, 0.3, bottomZ - 0.2], [sideX, topY + 0.05, topZ + 0.15], 0.9, 1.4));
  }
  return { concrete, steel };
}
