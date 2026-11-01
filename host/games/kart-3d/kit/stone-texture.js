// The kit's stone texture (M7d4d): irregular stones, crazy paving, with deep mortar between them, drawn as colour,
// relief, shade and roughness maps in a tile that repeats without a seam, as on Daisy Circuit's lighthouse
// (docs/mk8dx-reference.md). Pale grey-tan, so a part's vertex colour can darken it. Used by kit/lighthouse.js.

import { createSurface } from './surface-maps.js';
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
  const cells = Array.from({ length: STONE_SIZE * STONE_SIZE }, (_, index) => nearestStone(points, (index % STONE_SIZE) / STONE_SIZE, Math.floor(index / STONE_SIZE) / STONE_SIZE));
  surface.colors.fill((x, y) => {
    const { stone, edge } = cells[y * STONE_SIZE + x];
    const mortar = Math.min(edge / MORTAR, 1);
    const rounding = Math.min(edge / ROUNDING, 1);
    const { shade, warm } = stones[stone];
    const value = 215 + shade + (grit(x / STONE_SIZE, y / STONE_SIZE) - 0.5) * 46 - (1 - rounding) * 26;
    const stoneColor = [value, value * (0.95 - warm * 0.03), value * (0.84 - warm * 0.06)];
    return [0, 1, 2].map((channel) => 110 * (0.9 - channel * 0.06) * (1 - mortar) + stoneColor[channel] * mortar);
  });
  for (let y = 0; y < STONE_SIZE; y += 1) {
    for (let x = 0; x < STONE_SIZE; x += 1) {
      const { stone, edge } = cells[y * STONE_SIZE + x];
      const rise = smoothstep(Math.min(Math.max((edge - MORTAR) / ROUNDING, 0), 1));
      surface.setHeight(x, y, MORTAR_HEIGHT + (STONE_HEIGHT + stones[stone].lift) * rise);
    }
  }
  return surface;
}

export function createStoneMaps() {
  return drawStoneSurface().toMaps({ depth: 16, shade: { reach: 10, strength: 2.5 }, repeat: true });
}

// The stone that (u, v), in tiles, lies in, and how far (in cells) it is from the border with the next stone.
// Points are one per cell of a CELLS by CELLS grid, so the nearest and second nearest are within the 3 by 3
// cells round the pixel's own.
function nearestStone(points, u, v) {
  const [cellX, cellY] = [Math.floor(u * CELLS), Math.floor(v * CELLS)];
  let nearest = { distance: Infinity, stone: 0 };
  let second = Infinity;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const [column, row] = [((cellX + dx) % CELLS + CELLS) % CELLS, ((cellY + dy) % CELLS + CELLS) % CELLS];
      const stone = row * CELLS + column;
      const pointX = cellX + dx + points[stone][0];
      const pointY = cellY + dy + points[stone][1];
      const distance = Math.hypot(pointX - u * CELLS, pointY - v * CELLS);
      if (distance < nearest.distance) {
        second = nearest.distance;
        nearest = { distance, stone };
      } else if (distance < second) {
        second = distance;
      }
    }
  }
  return { stone: nearest.stone, edge: (second - nearest.distance) / 2 };
}

function smoothstep(share) {
  return share * share * (3 - 2 * share);
}
