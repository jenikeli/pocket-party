// The kit's layered-rock islands (M7d3), as round MK8DX's sky courses (Mario Circuit, Cloudtop Cruise): islands
// floating in the sky, a grassy top over cliffs in brown and orange bands that step in and taper to a point
// below (round trees on top come from kit/garden-props.js); and the same banded cliffs rising from the sea as the
// backdrop on the horizon.
// Every island of a kind is merged into two geometries (the grass and the rock), each island's outline wobbled
// its own way. Since M7d4c3 they also make their materials (a grass one and a rock one each). Used by the seaside
// sky.

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { createPixelImage } from './pixel-image.js';
import { createLayeredNoise, createTileNoise } from '../noise.js';
import { createRandom, between } from '../random.js';

const SEGMENTS = 36;
const BANDS = [0x9a6a3c, 0xd08a48, 0x7a5232, 0xc8955a, 0xa8643a];
// The backdrop's rock is darker: far off, the haze lightens it, and pale rock washed out to a blank white wall.
const BACKDROP_BANDS = [0x6a5a4a, 0x8a6a4a, 0x5a4a3a, 0x7a6a52, 0x6a503a];
const GRASS = 0x6cc04a;
// A floating island's cross-section, [share of its radius out, height in radii]: its grassy top, then down its
// cliffs, stepping in at each band, to its point. Every point below the top is a band of its own.
const FLOATING_TOP = [[0, 0.08], [0.5, 0.06], [0.85, 0.03], [1, 0]];
const FLOATING_CLIFF = [[1, 0], [1.03, -0.04], [0.98, -0.12], [0.9, -0.22], [0.93, -0.27], [0.8, -0.42], [0.82, -0.48], [0.62, -0.66], [0.64, -0.72], [0.38, -0.92], [0.14, -1.12], [0, -1.2]];
// A backdrop cliff's, [share of its radius, height in its heights]: from under the sea up its banded cliffs to
// its top, which is grass.
const BACKDROP_CLIFF = [[1.08, -0.05], [1, 0], [0.97, 0.24], [0.9, 0.3], [0.88, 0.55], [0.8, 0.6], [0.78, 0.86], [0.72, 0.92]];
const BACKDROP_TOP = [[0.72, 0.92], [0.5, 1], [0, 1.04]];

// `kit` is the course's (kit/kit.js), `islands` lists { x, z, y (the top's height), radius }. Returns the parts,
// [{ geometry, material }]: the grass and the rock.
export function buildFloatingIslands(kit, islands) {
  return islandParts(
    kit,
    mergeShapes(islands.map((island) => lathe(island, FLOATING_TOP, (out, up) => [out * island.radius, island.y + up * island.radius], () => GRASS))),
    mergeShapes(islands.map((island) => lathe(island, FLOATING_CLIFF, (out, up) => [out * island.radius, island.y + up * island.radius], bandColor))),
  );
}

// `cliffs` lists { x, z, radius, height }, standing on the sea at `seaLevel`. Returns the parts, as above.
export function buildBackdropCliffs(kit, cliffs, seaLevel) {
  const place = (cliff) => (out, up) => [out * cliff.radius, seaLevel + up * cliff.height];
  return islandParts(
    kit,
    mergeShapes(cliffs.map((cliff) => lathe(cliff, BACKDROP_TOP, place(cliff), () => GRASS))),
    mergeShapes(cliffs.map((cliff) => lathe(cliff, BACKDROP_CLIFF, place(cliff), (point) => BACKDROP_BANDS[point % BACKDROP_BANDS.length]))),
  );
}

// The grass and rock shapes with their materials. Each call draws its own rock texture (256 by 256): two calls cost
// less than sharing it through a cache that would have to find the kit again.
function islandParts({ keep, textures }, grass, rock) {
  return [
    { geometry: keep(grass), material: keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.grass, roughness: 0.95 })) },
    { geometry: keep(rock), material: keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: keep(createRockTexture()), roughness: 0.9 })) },
  ];
}

function bandColor(point) {
  return BANDS[point % BANDS.length];
}

// Turns a cross-section round the island's middle, every corner's distance out wobbled by its angle (two waves,
// phased by where the island is, so each has its own outline). `place(out, up)` gives a corner's [radius,
// height]; `colorOf(point)` its colour by its point in the profile. Texture coordinates run round it (a repeat
// every 8 units) and down it (every 4), so the rock's strata lie level.
function lathe(island, profile, place, colorOf) {
  const phase = island.x * 0.23 + island.z * 0.31;
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const color = new THREE.Color();
  profile.forEach(([out, up], point) => {
    const [radius, y] = place(out, up);
    color.setHex(colorOf(point));
    for (let segment = 0; segment <= SEGMENTS; segment += 1) {
      const angle = (segment / SEGMENTS) * 2 * Math.PI;
      const wobble = 1 + 0.1 * Math.sin(3 * angle + phase) + 0.06 * Math.sin(7 * angle + phase * 1.7);
      positions.push(island.x + Math.cos(angle) * radius * wobble, y, island.z + Math.sin(angle) * radius * wobble);
      colors.push(color.r, color.g, color.b);
      uvs.push((segment / SEGMENTS) * Math.round((2 * Math.PI * Math.max(radius, 1)) / 8), y / 4);
      if (point > 0 && segment > 0) {
        const here = point * (SEGMENTS + 1) + segment;
        const above = here - (SEGMENTS + 1);
        indices.push(above - 1, above, here, above - 1, here, here - 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Rock in level strata: soft blotches, fine grit, and dark cracks along the layers and down them. Pale, so each
// band's colour tints it.
export function createRockTexture() {
  const random = createRandom(97);
  const size = 256;
  const image = createPixelImage(size, size);
  const blotches = createLayeredNoise(random, 4, 3);
  const strata = createTileNoise(random, 2, 24);
  image.fill((x, y) => {
    const value = 200 + (blotches(x / size, y / size) - 0.5) * 60 + (strata(x / size, y / size) - 0.5) * 50 + (random() - 0.5) * 20;
    return [value, value * 0.95, value * 0.9];
  });
  for (let crack = 0; crack < 26; crack += 1) {
    let x = random() * size;
    let y = random() * size;
    const level = random() < 0.6;
    for (let step = 0; step < 40; step += 1) {
      image.dot(x, y, 0.8, [90, 70, 55]);
      x += level ? 1.5 : between(random, -0.8, 0.8);
      y += level ? between(random, -0.6, 0.6) : 1.5;
    }
  }
  return image.toTexture();
}
