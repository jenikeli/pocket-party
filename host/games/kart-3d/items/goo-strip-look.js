// The honey-gold goo of the sticky walls (M8c): its drawn maps (amber colour with pale streaks and bubbles, and
// the relief of the same bubbles so it glistens), its material, and the strips of it along the course's walls.
// A strip is a thick bead hugging a wall with drips hanging below it, built once per course from the track's
// stations. A vertex shader lets the drips grow down (ooze in) and climb back up (dry away) with one number, so
// the whole course moves with one uniform. Used by sticky-walls-look.js.

import * as THREE from 'three';
import { createPixelImage } from '../kit/pixel-image.js';
import { createRandom, between } from '../random.js';

const SIZE = 256;
// How glossy the goo is: this rough keeps the sun's highlight under the bloom threshold (a smaller number makes a
// smaller, brighter glint, which blooms on High quality).
export const GLOSS = 0.3;
const SEED = 61;
// Where the goo stands on a wall: the wall's top above the road, how far its back is out past the road's edge
// (where the kit's walls and rails have their face: plain-wall.js leans from 0.14 to 0.2, guardrail.js's beams
// stand 0.02 to 0.14 out), how far the bead bulges from there at its fattest, and the least and most the drips
// hang below the top.
const WALL_TOP = 0.78;
const FACE_OUT = 0.15;
const BEAD_THICKNESS = 0.18;
const HANG_RANGE = [0.3, 0.75];
// Stations closer than this along the wall share one vertex row (the strip needs no more detail).
const ROW_SPACING = 1.1;
// The goo's texture repeats every this many units along the wall.
const TILE_LENGTH = 3;
// How much later (share of the ooze) the last drip starts than the first, so they do not all move together.
const STAGGER = 0.6;
// The three vertices of a row, top to bottom: [share of the hang, bulge from the wall (units)].
const ROW = [[0, 0.03], [0.5, BEAD_THICKNESS], [1, 0.05]];

// Returns { map, normalMap }, both repeating.
export function createGooMaps() {
  const random = createRandom(SEED);
  const colors = createPixelImage(SIZE, SIZE);
  const heights = createPixelImage(SIZE, SIZE);
  colors.fill((x, y) => {
    // Deep amber in the thick middle of the bead (the picture's middle rows), paler and yellower where the goo is
    // thin at its top and tips, with slow lighter streaks running down the drips.
    const thin = Math.abs(y / SIZE - 0.5) * 2;
    const streak = Math.sin((x / SIZE) * Math.PI * 6 + Math.sin((y / SIZE) * Math.PI * 2) * 1.5);
    return [226 + 29 * thin, 140 + 70 * thin + streak * 12, 22 + 70 * thin + streak * 8];
  });
  heights.fill(() => [128, 128, 128]);
  for (let index = 0; index < 90; index += 1) {
    const [x, y, radius] = [random() * SIZE, random() * SIZE, between(random, 2, 7)];
    heights.dot(x, y, radius, [225, 225, 225]);
    colors.dot(x, y, radius * 0.8, [250, 196, 80]);
    colors.dot(x - radius * 0.3, y - radius * 0.3, radius * 0.3, [255, 240, 190]);
  }
  return { map: colors.toTexture(), normalMap: heights.toReliefTexture({ depth: 5 }) };
}

// The goo's material from its maps, and `uniforms.grow` (0 gone, 1 fully down), the one number that moves it.
// The vertex shader lifts each vertex up the road's normal (not world y, so banked walls drip right) by the part of its hang not yet grown, each drip starting a little
// after the one before (its `drip.y`).
export function createGooMaterial(maps) {
  const uniforms = { grow: { value: 0 } };
  const material = new THREE.MeshStandardMaterial({
    map: maps.map, normalMap: maps.normalMap, roughness: GLOSS, emissive: 0x2a1400, emissiveIntensity: 0.25, side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.grow = uniforms.grow;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 drip;\nattribute vec3 roadUp;\nuniform float grow;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float own = clamp(grow * ${(1 + STAGGER).toFixed(2)} - drip.y * ${STAGGER.toFixed(2)}, 0.0, 1.0);
        transformed += roadUp * drip.x * (1.0 - own * own * (3.0 - 2.0 * own));`);
  };
  material.customProgramCacheKey = () => 'goo-strip';
  return { material, uniforms };
}

// One geometry of goo along every wall of `track`, both sides, only where there is a wall and no gap. Each vertex
// carries `drip`: how far it hangs below the wall's top (it is placed there) and its drip's start in the ooze.
export function buildGooStrips(track) {
  const random = createRandom(SEED + 1);
  const strips = { positions: [], drips: [], ups: [], uvs: [], indices: [] };
  for (const side of [-1, 1]) {
    let previousRow = -1;
    let lastS = -Infinity;
    for (const station of track.stations) {
      const wall = side > 0 ? station.wallRight : station.wallLeft;
      if (!wall || station.gap) {
        previousRow = -1;
        continue;
      }
      if (station.s - lastS < ROW_SPACING) {
        continue;
      }
      lastS = station.s;
      const row = strips.positions.length / 3;
      // Cubing the random number makes most drips short and a few long, as real drips are.
      addRow(strips, station, side, HANG_RANGE[0] + (HANG_RANGE[1] - HANG_RANGE[0]) * random() ** 3, random());
      if (previousRow >= 0) {
        joinRows(strips.indices, previousRow, row);
      }
      previousRow = row;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(strips.positions, 3));
  geometry.setAttribute('drip', new THREE.Float32BufferAttribute(strips.drips, 2));
  geometry.setAttribute('roadUp', new THREE.Float32BufferAttribute(strips.ups, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(strips.uvs, 2));
  geometry.setIndex(strips.indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Three vertices at `station` on `side`'s wall: the top on the wall, a fat middle bulging out, the bottom of a
// drip `hang` units down. `start` is the drip's share of the ooze's delay.
function addRow(strips, station, side, hang, start) {
  const { point, right, normal } = station;
  const edge = station.halfWidth + (side > 0 ? station.shoulderRight : station.shoulderLeft);
  ROW.forEach(([share, bulge]) => {
    const lateral = side * (edge + FACE_OUT - bulge);
    const height = WALL_TOP - hang * share;
    strips.positions.push(
      point.x + right.x * lateral + normal.x * height,
      point.y + right.y * lateral + normal.y * height,
      point.z + right.z * lateral + normal.z * height,
    );
    strips.drips.push(hang * share, start);
    strips.ups.push(normal.x, normal.y, normal.z);
    strips.uvs.push(station.s / TILE_LENGTH, share);
  });
}

// Two triangles for each of the two bands between a row of three vertices (index `first`) and the next (`second`).
// The material draws both faces, so the winding does not matter.
function joinRows(indices, first, second) {
  for (let band = 0; band < 2; band += 1) {
    const [a, b, c, d] = [first + band, first + band + 1, second + band, second + band + 1];
    indices.push(a, c, b, b, c, d);
  }
}
