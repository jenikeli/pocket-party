// The kit's straw thatch maps (M7d3, redrawn in M7d4d with kit/surface-maps.js): a tile that repeats without a
// seam, for the stilt huts' roofs, with colour, relief, shade and roughness. Pale straw, so a part's own colour
// tints it; the straws run down the tile in bunches, each row's lip overlapping the one below. Used by
// kit/stilt-hut.js.

import { createSurface } from './surface-maps.js';
import { createRandom, between } from '../random.js';

const STRAW = [236, 200, 128];
const STRAW_DARK = [92, 62, 28];
const STRAW_LIGHT = [255, 236, 170];
const PIXELS_PER_UNIT = 256;
const ROWS = 4;

// Returns { map, normalMap, aoMap, roughnessMap }, a one by one unit tile that repeats.
export function createThatchMaps() {
  const random = createRandom(71);
  const surface = createSurface(1, 1, PIXELS_PER_UNIT, { color: STRAW, roughness: 0.95, base: 140 });
  for (let row = 0; row < ROWS; row += 1) {
    drawRow(surface, random, row);
  }
  return surface.toMaps({ depth: 6, shade: { reach: 0.03, strength: 1.6 }, repeat: true });
}

// One row: many thin straws running down it, some sunk and dark, some raised and light, then a shadowed lip at
// the row's foot where the row above overlaps it.
function drawRow(surface, random, row) {
  const top = 1 - row / ROWS;
  const bottom = 1 - (row + 1) / ROWS;
  for (let strand = 0; strand < 38; strand += 1) {
    const x = random();
    const from = [x, top - between(random, 0.01, 0.06)];
    const to = [x + between(random, -0.02, 0.02), bottom + between(random, 0.0, 0.05)];
    const raised = random() < 0.4;
    surface.groove(from, to, {
      size: between(random, 0.008, 0.016),
      depth: raised ? -between(random, 15, 30) : between(random, 25, 55),
      color: raised ? STRAW_LIGHT : STRAW_DARK,
      amount: raised ? 0.5 : 0.45,
      roughness: 1,
    });
  }
  surface.groove([0, bottom], [1, bottom], { size: 0.03, depth: 70, color: STRAW_DARK, amount: 0.7, roughness: 1 });
}
