// The sand the sandcastle and its pile are made of (M8b): its grain, drawn pixel by pixel as a tile that repeats
// (a near-white colour picture with fine grains, darker specks and bright crumbs, and its relief, a normal map,
// from a height field of the same grains, pits and lumps, so it catches the light as packed damp sand does); its
// material; and how a shape is finished in it: its vertex colours darkened where the sand is wet at its foot and in
// a crease, and its grain's texture coordinates. Used by sandcastle-look.js and road-object-drawing.js.

import * as THREE from 'three';
import { shaded } from '../shape-utils.js';
import { createPixelImage } from '../kit/pixel-image.js';
import { createLayeredNoise } from '../noise.js';
import { createRandom, between } from '../random.js';

const SIZE = 256;
const SEED = 83;
// The grain tile is this many units across.
const GRAIN_TILE = 1.1;
// The wet sand reaches this high (units) and darkens the sand to this share; a crease darkens it to CREASE_SHADE
// within CREASE_REACH units of its height.
const WET_LINE = 0.2;
const WET_SHADE = 0.68;
const CREASE_SHADE = 0.86;
const CREASE_REACH = 0.08;
const level = (value) => [value, value, value];

// Returns { map, normalMap }, both repeating.
export function createSandMaps() {
  const random = createRandom(SEED);
  const colors = createPixelImage(SIZE, SIZE);
  const heights = createPixelImage(SIZE, SIZE);
  const patches = createLayeredNoise(random, 4, 3);
  const lumps = createLayeredNoise(random, 8, 2);
  colors.fill((x, y) => {
    const value = 236 + (patches(x / SIZE, y / SIZE) - 0.5) * 22 + (random() - 0.5) * 16;
    return [value, value * 0.97, value * 0.92];
  });
  heights.fill((x, y) => level(128 + (lumps(x / SIZE, y / SIZE) - 0.5) * 90 + (random() - 0.5) * 34));
  // Little pits pressed into the sand and crumbs stuck on it.
  for (let index = 0; index < 160; index += 1) {
    const [x, y, radius] = [random() * SIZE, random() * SIZE, between(random, 1, 2.6)];
    heights.dot(x, y, radius, level(60));
    colors.dot(x, y, radius * 0.7, [196, 182, 160]);
  }
  for (let index = 0; index < 140; index += 1) {
    const [x, y, radius] = [random() * SIZE, random() * SIZE, between(random, 0.8, 1.8)];
    heights.dot(x, y, radius, level(220));
    colors.dot(x, y, radius, [255, 252, 244]);
  }
  for (let index = 0; index < 700; index += 1) {
    colors.dot(random() * SIZE, random() * SIZE, between(random, 0.3, 0.8), [168, 140, 104]);
  }
  return { map: colors.toTexture(), normalMap: heights.toReliefTexture({ depth: 3 }) };
}

// The sand's material from its maps (createSandMaps), the colour from each vertex (finishInSand).
export function createSandMaterial(maps) {
  return new THREE.MeshStandardMaterial({ vertexColors: true, map: maps.map, normalMap: maps.normalMap, roughness: 0.95 });
}

// `geometry` (coloured per vertex, standing on y = 0 in units) shaded wet and darker at its foot, darker round the
// crease at `creaseHeight` (where towers meet the mound) and a little lighter toward its top, and given its
// grain's texture coordinates. Returns it.
export function finishInSand(geometry, creaseHeight) {
  shaded(geometry, (x, y) => {
    const wet = WET_SHADE + (1 - WET_SHADE) * smoothstep(Math.min(Math.max(y / WET_LINE, 0), 1));
    const inCrease = CREASE_SHADE + (1 - CREASE_SHADE) * smoothstep(Math.min(Math.abs(y - creaseHeight) / CREASE_REACH, 1));
    return wet * inCrease * (0.96 + 0.06 * y);
  });
  return projectUv(geometry);
}

// Texture coordinates from where each vertex is, seen along the axis its face looks most toward (a picture thrown
// on from three sides), so the grain is the same size on every part whatever its shape.
function projectUv(geometry) {
  const { position, normal, uv } = geometry.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
    const [nx, ny, nz] = [Math.abs(normal.getX(index)), Math.abs(normal.getY(index)), Math.abs(normal.getZ(index))];
    const [u, v] = ny >= nx && ny >= nz ? [x, z] : nx >= nz ? [z, y] : [x, y];
    uv.setXY(index, u / GRAIN_TILE, v / GRAIN_TILE);
  }
  return geometry;
}

function smoothstep(share) {
  return share * share * (3 - 2 * share);
}
