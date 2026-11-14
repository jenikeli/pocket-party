// The kit's stone texture (M7d4d): irregular stones, crazy paving, with deep mortar between them, drawn as colour,
// relief, shade and roughness maps in a tile that repeats without a seam, as on the reference seaside course's lighthouse
// (docs/kart-reference.md). Pale grey-tan, so a part's vertex colour can darken it. Used by kit/lighthouse.js.

import { createSurface } from './surface-maps.js';
import { nearestCell } from './cell-noise.js';
import { createLayeredNoise } from '../noise.js';
import { createRandom, between } from '../random.js';

export const STONE_SIZE = 512;
// Stones across the tile each way: one point per cell, so about this many stones along each side.
const CELLS = 6;
// The mortar's width and the stones' rounded edge, in cells.
const MORTAR = 0.05;
const ROUNDING = 0.16;
const MORTAR_HEIGHT = 30;
const STONE_HEIGHT = 150;

// The surface (kit/surface-maps.js) with the stones drawn on it, before it is turned into maps. Each stone is the
// area nearest one random point (a Voronoi cell); how far a pixel is from the nearest other point, compared with
// its own, tells how near it is to the stone's edge. Points wrap round the tile, so it tiles.
export function drawStoneSurface() {
  const random = createRandom(73);
  const points = Array.from({ length: CELLS * CELLS }, () => [between(random, 0.15, 0.85), between(random, 0.15, 0.85)]);
  const stones = Array.from({ length: CELLS * CELLS }, () => ({ shade: between(random, -26, 20), lift: between(random, -18, 18), warm: between(random, 0, 1) }));
  const grit = createLayeredNoise(random, 8, 4);
  const surface = createSurface(STONE_SIZE, STONE_SIZE, 1, { color: [150, 142, 130], roughness: 0.9, base: MORTAR_HEIGHT });
  // Which stone each pixel is in and how far from its edge, worked out once for the colours and the relief.
  const cells = Array.from({ length: STONE_SIZE * STONE_SIZE }, (_, index) => nearestCell(points, CELLS, CELLS, (index % STONE_SIZE) / STONE_SIZE, Math.floor(index / STONE_SIZE) / STONE_SIZE));
  surface.colors.fill((x, y) => {
    const { cell: stone, edge } = cells[y * STONE_SIZE + x];
    const mortar = Math.min(edge / MORTAR, 1);
    const rounding = Math.min(edge / ROUNDING, 1);
    const { shade, warm } = stones[stone];
    const value = 215 + shade + (grit(x / STONE_SIZE, y / STONE_SIZE) - 0.5) * 46 - (1 - rounding) * 26;
    const stoneColor = [value, value * (0.95 - warm * 0.03), value * (0.84 - warm * 0.06)];
    return [0, 1, 2].map((channel) => 110 * (0.9 - channel * 0.06) * (1 - mortar) + stoneColor[channel] * mortar);
  });
  for (let y = 0; y < STONE_SIZE; y += 1) {
    for (let x = 0; x < STONE_SIZE; x += 1) {
      const { cell: stone, edge } = cells[y * STONE_SIZE + x];
      const rise = smoothstep(Math.min(Math.max((edge - MORTAR) / ROUNDING, 0), 1));
      surface.setHeight(x, y, MORTAR_HEIGHT + (STONE_HEIGHT + stones[stone].lift) * rise);
    }
  }
  return surface;
}

export function createStoneMaps() {
  return drawStoneSurface().toMaps({ depth: 16, shade: { reach: 10, strength: 2.5 }, repeat: true });
}

function smoothstep(share) {
  return share * share * (3 - 2 * share);
}
