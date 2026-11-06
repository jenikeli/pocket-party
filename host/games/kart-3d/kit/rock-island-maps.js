// The rocky islands' rock (M9, from "M9: rock study" in docs/3d-findings.md): layered limestone, drawn as colour,
// relief, shade and roughness maps in a tile that repeats without a seam, and the one material made from them per
// course. The fine scale of the study's rock: level bands of rock (strata) a little apart in tone, a soft band
// now and then worn back, fine lines (laminae) in each, upright cracks (joints) cutting each band into blocks, and
// each block a flat plane at its own slight tilt with a crisp chamfered edge, not a rounded pillow (the Seaside
// rock's slabs, kit/rock-maps.js, read as pebbles). Dark streaks run down where water runs.
// Pale, so each facet's vertex colour tints it. Used by kit/rock-island.js.

import * as THREE from 'three';
import { createSurface } from './surface-maps.js';
import { createLayeredNoise, createTileNoise } from '../noise.js';
import { createRandom, between } from '../random.js';

export const ISLAND_ROCK_SIZE = 512;
// Bands this many pixels tall, at least and at most (the tile is laid on 12 units square: about 1 to 3.5 units).
// Only this share of the bands' tops is a seam; the others meet the band above in tone alone.
const BAND = [40, 150];
const SEAMED = 0.35;
// A block's plane tilts at most this much (height per pixel), and its edge is chamfered over this many pixels.
const TILT = 0.16;
const CHAMFER = 6;
const SEAM = 1;
const BLOCK_HEIGHT = 150;
const SEAM_HEIGHT = 40;
const SOFT_BAND_DEPTH = 45;
const SEAM_COLOR = [118, 106, 92];
// How far (pixels) the bands' edges and the joints wander; each pixel's colour is between warm and grey.
const WANDER = 14;
const WARM = [1, 0.96, 0.89];
const GREY = [0.96, 0.97, 0.98];

const materials = new WeakMap();

// `kit` is the course's (kit/kit.js). Returns the islands' rock material, drawing its maps the first time.
export function islandRockMaterial({ keep }) {
  if (!materials.has(keep)) {
    const { map, normalMap, aoMap, roughnessMap } = drawIslandRockSurface().toMaps({ depth: 18, shade: { reach: 10, strength: 2.5 }, repeat: true });
    const maps = { map: keep(map), normalMap: keep(normalMap), aoMap: keep(aoMap), roughnessMap: keep(roughnessMap) };
    materials.set(keep, keep(new THREE.MeshStandardMaterial({ vertexColors: true, ...maps, roughness: 1 })));
  }
  return materials.get(keep);
}

// The surface (kit/surface-maps.js) with the strata, joints, blocks and streaks drawn on it. The bands'
// edges and the joints wander a little (no rock is cut with a ruler), every block's plane is roughened at two
// scales, and its colour drifts between warm and grey in patches.
export function drawIslandRockSurface() {
  const random = createRandom(907);
  const size = ISLAND_ROCK_SIZE;
  const bands = planBands(random);
  const noises = {
    grit: createLayeredNoise(random, 16, 3),
    rough: createLayeredNoise(random, 8, 3),
    streaks: createTileNoise(random, 24, 3),
    blotches: createLayeredNoise(random, 3, 2),
    hue: createTileNoise(random, 5, 5),
    wanderDown: createTileNoise(random, 10, 4),
    wanderAcross: createTileNoise(random, 4, 10),
  };
  const located = locateBlocks(bands, noises);
  const surface = createSurface(size, size, 1, { color: SEAM_COLOR, roughness: 1, base: SEAM_HEIGHT });
  surface.colors.fill((x, y) => rockColor(bands, located, y * size + x, noises));
  surface.roughnesses.fill(() => [235, 235, 235]);
  for (let index = 0; index < size * size; index += 1) {
    const [band, block] = [bands[located.band[index]], bands[located.band[index]].blocks[located.block[index]]];
    const [u, v] = [(index % size) / size, Math.floor(index / size) / size];
    const plane = BLOCK_HEIGHT + block.lift + block.tilt[0] * (located.along[index] - block.width / 2) + block.tilt[1] * (located.down[index] - (band.top + band.bottom) / 2);
    const chamfer = Math.min(Math.max(located.edge[index] - SEAM, 0) / CHAMFER, 1);
    const rough = (noises.rough(u, v) - 0.5) * 60 + (noises.grit(u, v) - 0.5) * 24;
    surface.setHeight(index % size, Math.floor(index / size), SEAM_HEIGHT + (plane - band.soft - SEAM_HEIGHT) * chamfer + rough);
  }
  return surface;
}

// Which band and block each pixel is in, worked out once for the colours and the relief, in typed arrays (a
// quarter of a million pixels): `band` and `block` (indices), `edge` and `along` (blockAt's), and `down`, how far
// down the tile the pixel lies once the bands' edges have wandered.
function locateBlocks(bands, noises) {
  const size = ISLAND_ROCK_SIZE;
  const count = size * size;
  const located = { band: new Uint8Array(count), block: new Uint8Array(count), edge: new Float64Array(count), along: new Float64Array(count), down: new Float64Array(count) };
  const bandOf = new Int32Array(size);
  bands.forEach((band, index) => bandOf.fill(index, band.top, band.bottom));
  for (let index = 0; index < count; index += 1) {
    const [x, y] = [index % size, Math.floor(index / size)];
    const [u, v] = [x / size, y / size];
    const down = wrap(y + (noises.wanderDown(u, v) - 0.5) * WANDER, size);
    located.band[index] = bandOf[Math.floor(down)];
    located.down[index] = down;
    blockAt(bands[located.band[index]], x + (noises.wanderAcross(u, v) - 0.5) * WANDER, down, located, index);
  }
  return located;
}

// A pixel's colour: its band's and block's tone, laminae, patches, streaks where water runs and grit, warm or
// grey by patch, darkening into a seam at the block's edge.
function rockColor(bands, located, index, noises) {
  const size = ISLAND_ROCK_SIZE;
  const band = bands[located.band[index]];
  const block = band.blocks[located.block[index]];
  const [u, v] = [(index % size) / size, Math.floor(index / size) / size];
  const lamina = Math.sin(((located.down[index] - band.top) / band.lamina) * Math.PI * 2) > 0.85 ? -7 : 0;
  const stain = Math.max(noises.streaks(u, v) - 0.5, 0) * 110;
  const blotch = (noises.blotches(u, v) - 0.5) * 70;
  const value = 222 + band.tone + block.shade + blotch + lamina - stain + (noises.grit(u, v) - 0.5) * 50;
  const hue = noises.hue(u, v);
  const face = Math.min(Math.max(located.edge[index] - SEAM, 0) / CHAMFER, 1);
  return [0, 1, 2].map((channel) => SEAM_COLOR[channel] * (1 - face) + value * (WARM[channel] * (1 - hue) + GREY[channel] * hue) * face);
}

// Level bands down the tile, each its own tone, some soft (worn back), each with its joints (upright cracks at a
// slight slant) and the blocks between them, a plane each.
function planBands(random) {
  const bands = [];
  let top = 0;
  while (top < ISLAND_ROCK_SIZE) {
    let bottom = top + Math.round(between(random, BAND[0], BAND[1]));
    if (ISLAND_ROCK_SIZE - bottom < BAND[0]) {
      bottom = ISLAND_ROCK_SIZE;
    }
    const jointCount = 2 + Math.floor(random() * 3);
    const joints = Array.from({ length: jointCount }, () => random() * ISLAND_ROCK_SIZE).sort((a, b) => a - b);
    const blocks = joints.map((joint, index) => {
      const width = (joints[(index + 1) % jointCount] - joint + ISLAND_ROCK_SIZE) % ISLAND_ROCK_SIZE || ISLAND_ROCK_SIZE;
      return { width, lift: between(random, -18, 18), shade: between(random, -12, 12), tilt: [between(random, -TILT, TILT), between(random, -TILT, TILT)] };
    });
    const soft = random() < 0.25;
    bands.push({
      top, bottom, joints, blocks, slant: between(random, -0.15, 0.15), seamed: random() < SEAMED,
      tone: between(random, -16, 14) - (soft ? 14 : 0), soft: soft ? SOFT_BAND_DEPTH : 0, lamina: between(random, 7, 14),
    });
    top = bottom;
  }
  // A seam between two bands is the lower one's top: the band above needs to know it too.
  bands.forEach((band, index) => (band.seamedBelow = bands[(index + 1) % bands.length].seamed));
  return bands;
}

// Which block of `band` the spot (x, down) is in (pixels; `down` within the band), how far it is from the block's
// nearest edge (a joint, or the band's top or bottom where a seam runs), and how far along the block from its
// left joint, written into `located` (locateBlocks's) at `index`.
function blockAt(band, x, down, located, index) {
  const size = ISLAND_ROCK_SIZE;
  const across = wrap(x - band.slant * (down - band.top), size);
  let blockIndex = band.joints.length - 1;
  band.joints.forEach((joint, at) => {
    if (across >= joint) {
      blockIndex = at;
    }
  });
  const block = band.blocks[blockIndex];
  const along = wrap(across - band.joints[blockIndex], size);
  const fromTop = band.seamed ? down - band.top + 0.5 : Infinity;
  const fromBottom = band.seamedBelow ? band.bottom - down - 0.5 : Infinity;
  located.block[index] = blockIndex;
  located.along[index] = along;
  located.edge[index] = Math.min(along, block.width - along, fromTop, fromBottom);
}

function wrap(value, size) {
  return ((value % size) + size) % size;
}
