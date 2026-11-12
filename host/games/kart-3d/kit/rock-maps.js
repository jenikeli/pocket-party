// The kit's rock (M7d4d): big rounded slabs in rough courses with dark seams between them, as on Mario Circuit's
// and Toad Circuit's cliffs (docs/mk8dx-reference.md), drawn as colour, relief, shade and roughness maps in a tile
// that repeats without a seam, and the one rock material made from them, drawn once per course and used by the
// beach islands' rocks (the floating islands and backdrop cliffs it was made for went in M10). Pale, so each
// part's vertex colour (warm tan to orange) tints it. Used by kit/beach-island.js.

import * as THREE from 'three';
import { createSurface } from './surface-maps.js';
import { nearestCell } from './cell-noise.js';
import { createLayeredNoise } from '../noise.js';
import { createRandom, between } from '../random.js';

export const ROCK_SIZE = 512;
// Slabs across the tile and down it. The pieces lay the tile on twice as wide as it is tall, so the slabs come out
// about twice as wide as they are tall: courses of flat slabs, not round stones.
const COLUMNS = 3;
const ROWS = 2;
// The seam's half width and the slab's rounded edge, in cells.
const SEAM = 0.025;
const ROUNDING = 0.25;
const SEAM_HEIGHT = 30;
const SLAB_HEIGHT = 160;
const SEAM_COLOR = [96, 74, 58];
const CRACKS = 14;

// One rock material per course. Keyed by the course's keep, which every copy of the kit (kitPart in kit/kit.js)
// shares, so the sky's islands and the sea's rocks find the same one.
const materials = new WeakMap();

// `kit` is the course's (kit/kit.js). Returns the rock material, drawing its maps the first time it is asked for.
export function rockMaterial({ keep }) {
  if (!materials.has(keep)) {
    const { map, normalMap, aoMap, roughnessMap } = createRockMaps();
    const maps = { map: keep(map), normalMap: keep(normalMap), aoMap: keep(aoMap), roughnessMap: keep(roughnessMap) };
    materials.set(keep, keep(new THREE.MeshStandardMaterial({ vertexColors: true, ...maps, roughness: 1 })));
  }
  return materials.get(keep);
}

export function createRockMaps() {
  return drawRockSurface().toMaps({ depth: 20, shade: { reach: 12, strength: 3 }, repeat: true });
}

// The surface (kit/surface-maps.js) with the slabs drawn on it. Each slab is the area nearest one random point (a
// Voronoi cell), one point per cell of a COLUMNS by ROWS grid, kept to the middle half of its row so the slabs lie
// in rough courses; how far a pixel is from the next slab tells how near it is to a seam. Each slab is lighter at its
// top, as the study's rock is, and stands out its own way.
export function drawRockSurface() {
  const random = createRandom(131);
  const points = Array.from({ length: COLUMNS * ROWS }, () => [between(random, 0.05, 0.95), between(random, 0.25, 0.75)]);
  const slabs = Array.from({ length: COLUMNS * ROWS }, () => ({ shade: between(random, -22, 18), lift: between(random, -30, 30) }));
  const grit = createLayeredNoise(random, 8, 4);
  const surface = createSurface(ROCK_SIZE, ROCK_SIZE, 1, { color: SEAM_COLOR, roughness: 1, base: SEAM_HEIGHT });
  // Which slab each pixel is in, how far from its seam and how far below its point (in cells), and its grit,
  // worked out once for the colours and the relief.
  const cells = Array.from({ length: ROCK_SIZE * ROCK_SIZE }, (_, index) => nearestCell(points, COLUMNS, ROWS, (index % ROCK_SIZE) / ROCK_SIZE, Math.floor(index / ROCK_SIZE) / ROCK_SIZE));
  const grits = Float32Array.from(cells, (_, index) => grit((index % ROCK_SIZE) / ROCK_SIZE, Math.floor(index / ROCK_SIZE) / ROCK_SIZE) - 0.5);
  const gritAt = (x, y) => grits[y * ROCK_SIZE + x];
  surface.colors.fill((x, y) => {
    const { cell: slab, edge, below } = cells[y * ROCK_SIZE + x];
    const face = Math.min(edge / SEAM, 1);
    const rounding = Math.min(edge / ROUNDING, 1);
    const value = 222 + slabs[slab].shade + gritAt(x, y) * 50 - (1 - rounding) * 30 - below * 40;
    return [0, 1, 2].map((channel) => SEAM_COLOR[channel] * (1 - face) + value * [1, 0.96, 0.9][channel] * face);
  });
  surface.roughnesses.fill((x, y) => (cells[y * ROCK_SIZE + x].edge < SEAM ? [255, 255, 255] : [225, 225, 225]));
  for (let y = 0; y < ROCK_SIZE; y += 1) {
    for (let x = 0; x < ROCK_SIZE; x += 1) {
      const { cell: slab, edge } = cells[y * ROCK_SIZE + x];
      const rise = smoothstep(Math.min(Math.max((edge - SEAM) / ROUNDING, 0), 1));
      surface.setHeight(x, y, SEAM_HEIGHT + (SLAB_HEIGHT + slabs[slab].lift + gritAt(x, y) * 40) * rise);
    }
  }
  drawCracks(surface, random);
  return surface;
}

// A few thin cracks across the slabs' faces, each a short line bent twice.
function drawCracks(surface, random) {
  for (let crack = 0; crack < CRACKS; crack += 1) {
    let from = [random() * ROCK_SIZE, random() * ROCK_SIZE];
    for (let bend = 0; bend < 3; bend += 1) {
      const to = [from[0] + between(random, -24, 24), from[1] + between(random, -14, 14)];
      surface.groove(from, to, { size: 2, depth: 40, color: SEAM_COLOR, amount: 0.6, roughness: 1 });
      from = to;
    }
  }
}

function smoothstep(share) {
  return share * share * (3 - 2 * share);
}
