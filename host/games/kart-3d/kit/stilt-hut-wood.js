// The stilt hut's wood (M7d4d): the stilts, a planked deck with plank rails, plank walls with a door and a window,
// a planked walkway toward the beach and a ladder. Every plank is its own board with a dark gap between and its
// own shade of brown. Returns a list of coloured shapes for the hut's wood part. Stands with the deck at
// y = DECK, the door facing +z. Used by kit/stilt-hut.js.

import * as THREE from 'three';
import { at, between as stretch, coloured, roundedBox } from '../shape-utils.js';
import { board, jittered } from './stilt-hut-shapes.js';

export const DECK = 2.6;
export const WALLS = { width: 3.4, depth: 3, height: 2.3, centreZ: -0.3 };
// The top of the deck's planks, where the walls and rails stand.
export const FLOOR = DECK + 0.2;
const COLORS = { stilt: 0x8a6a48, deck: 0xc8a878, wall: 0xe0c49a, core: 0x4a3220, trim: 0x7a5232, door: 0x5a3a22, window: 0x2a4050, frame: 0xf4f0e6 };

export function buildWood(random) {
  return [...stilts(), ...deck(random), ...walls(random), ...doorAndWindow(), ...frontRail(random), ...walkway(random), ...ladder()];
}

function stilts() {
  const parts = [];
  for (const x of [-1.7, 0, 1.7]) {
    for (const z of [-1.6, 1.6]) {
      parts.push(coloured(at(new THREE.CylinderGeometry(0.14, 0.17, DECK + 1.5, 7), x, (DECK - 1.5) / 2, z), COLORS.stilt));
    }
  }
  return parts;
}

// Boards side by side over `length`, about `size` wide with a gap between, each `across` by `height` the other
// ways; `axis` is the way they are counted along ('x' or 'z'), `place(shape, offset)` puts each where it goes.
function planks(random, { length, size, axis, across, height, color, place }) {
  const count = Math.round(length / size);
  const step = length / count;
  const parts = [];
  for (let index = 0; index < count; index += 1) {
    const offset = -length / 2 + step * (index + 0.5);
    const shape = axis === 'x' ? board(step - 0.025, height, across, random) : board(across, height, step - 0.025, random);
    parts.push(coloured(place(shape, offset), jittered(color, random, 0.12)));
  }
  return parts;
}

function deck(random) {
  const beams = coloured(at(new THREE.BoxGeometry(4.4, 0.2, 4.2), 0, DECK, 0), COLORS.core);
  const top = planks(random, { length: 4.4, size: 0.3, axis: 'x', across: 4.2, height: 0.1, color: COLORS.deck, place: (shape, x) => at(shape, x, DECK + 0.15, 0) });
  return [beams, ...top];
}

// Plank walls: a dark core with vertical planks over it on all four sides, so the gaps between read as seams.
function walls(random) {
  const { width, depth, height, centreZ } = WALLS;
  const middle = FLOOR + height / 2;
  const parts = [coloured(at(new THREE.BoxGeometry(width - 0.04, height, depth - 0.04), 0, middle, centreZ), COLORS.core)];
  for (const side of [1, -1]) {
    const alongX = { length: width, size: 0.3, axis: 'x', across: 0.07, height, color: COLORS.wall };
    const alongZ = { length: depth, size: 0.3, axis: 'z', across: 0.07, height, color: COLORS.wall };
    parts.push(...planks(random, { ...alongX, place: (shape, x) => at(shape, x, middle, centreZ + side * (depth / 2 - 0.035)) }));
    parts.push(...planks(random, { ...alongZ, place: (shape, z) => at(shape, side * (width / 2 - 0.035), middle, centreZ + z) }));
  }
  for (const y of [FLOOR + 0.08, FLOOR + height - 0.08]) {
    parts.push(coloured(at(new THREE.BoxGeometry(width + 0.1, 0.16, depth + 0.1), 0, y, centreZ), COLORS.trim));
  }
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      parts.push(coloured(at(new THREE.BoxGeometry(0.16, height, 0.16), (x * width) / 2, middle, centreZ + (z * depth) / 2), COLORS.trim));
    }
  }
  return parts;
}

function doorAndWindow() {
  const front = WALLS.centreZ + WALLS.depth / 2;
  const parts = [
    coloured(at(roundedBox(0.9, 1.6, 0.08, 0.03), -0.6, FLOOR + 0.8, front + 0.03), COLORS.door),
    coloured(at(roundedBox(0.8, 0.7, 0.06, 0.03), 0.85, FLOOR + 1.35, front + 0.03), COLORS.window),
  ];
  for (const [width, height, y] of [[0.96, 0.08, 1.74], [0.96, 0.08, 0.96], [0.08, 0.86, 1.35]]) {
    parts.push(coloured(at(new THREE.BoxGeometry(width, height, 0.08), 0.85, FLOOR + y, front + 0.07), COLORS.frame));
  }
  return parts;
}

// Plank rails along the deck's front, in two runs with the walkway's gap between. Their posts are white (the
// painted part, kit/stilt-hut-posts.js), so these are only the planks.
function frontRail(random) {
  const parts = [];
  for (const side of [-1, 1]) {
    for (const y of [FLOOR + 0.35, FLOOR + 0.68]) {
      parts.push(coloured(at(board(1.45, 0.14, 0.05, random), side * 1.375, y, 2.06), jittered(COLORS.deck, random, 0.1)));
    }
  }
  return parts;
}

// The walkway toward the beach: planks across it on two beams, on its own stilts.
function walkway(random) {
  const parts = [];
  for (const x of [-0.45, 0.45]) {
    parts.push(coloured(at(new THREE.BoxGeometry(0.12, 0.14, 4), x, DECK - 0.1, 4), COLORS.trim));
  }
  parts.push(...planks(random, { length: 4, size: 0.28, axis: 'z', across: 1.1, height: 0.07, color: COLORS.deck, place: (shape, z) => at(shape, 0, DECK - 0.02, 4 + z) }));
  for (const z of [3, 5.6]) {
    for (const x of [-0.5, 0.5]) {
      parts.push(coloured(at(new THREE.CylinderGeometry(0.1, 0.12, DECK + 1, 6), x, (DECK - 1) / 2, z), COLORS.stilt));
    }
  }
  return parts;
}

function ladder() {
  const parts = [];
  for (const z of [-0.35, 0.35]) {
    parts.push(coloured(stretch(new THREE.BoxGeometry(0.07, 1, 0.07), [2.3, -0.5, z], [2.3, DECK, z]), COLORS.trim));
  }
  for (let rung = 0; rung < 4; rung += 1) {
    parts.push(coloured(at(new THREE.BoxGeometry(0.06, 0.06, 0.7), 2.3, 0.1 + rung * 0.6, 0), COLORS.trim));
  }
  return parts;
}
