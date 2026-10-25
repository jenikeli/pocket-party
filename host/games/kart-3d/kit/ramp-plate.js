// The kit's ramp plate (M7d2): a riveted steel plate over each jump's ramp, from where the road starts climbing
// to the lip, with big white chevrons painted on it, as on Mario Kart Stadium's ramps. Drawing only; where the
// ramps are comes from kit/road-marks.js. Used by kit/road.js.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { createPixelImage } from './pixel-image.js';
import { addRoadRect, stretchedOver } from './road-rects.js';
import { rampSpans } from './road-marks.js';
import { createRandom } from '../random.js';

const LIFT = 0.02;
const SIZE = 256;
const PLATES_ALONG = 4;
const CHEVRONS = 3;

// Returns { meshes, dispose() } (no meshes on a course without a jump).
export function buildRampPlates(track) {
  const builder = createStripBuilder();
  const spans = rampSpans(track);
  for (const span of spans) {
    const rect = { fromS: span.fromS, toS: span.toS, fromLateral: -span.halfWidth, toLateral: span.halfWidth };
    addRoadRect(builder, track, rect, LIFT, 0xffffff, stretchedOver(rect));
  }
  if (spans.length === 0) {
    return { meshes: [], dispose() {} };
  }
  const material = new THREE.MeshStandardMaterial({ map: drawPlate(), metalness: 0.3, roughness: 0.45 });
  // Over the road's asphalt, so it is pulled toward the camera a little to win where the two meet.
  Object.assign(material, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(builder.build(), material);
  mesh.receiveShadow = true;
  function dispose() {
    mesh.geometry.dispose();
    material.map.dispose();
    material.dispose();
  }
  return { meshes: [mesh], dispose };
}

// Stretched once over the plate, its front (the lip) at the top: grey steel in PLATES_ALONG plates with dark
// seams and bolts along them, a bolted border, and white chevrons pointing up the ramp.
function drawPlate() {
  const random = createRandom(53);
  const image = createPixelImage(SIZE, SIZE);
  image.fill((x, y) => {
    const value = 150 + (random() - 0.5) * 18 + Math.sin(y * 0.9) * 3;
    return [value, value + 2, value + 6];
  });
  for (let index = 0; index <= PLATES_ALONG; index += 1) {
    const y = Math.min((index * SIZE) / PLATES_ALONG, SIZE - 4);
    image.rect(0, y, SIZE, 3, [62, 64, 70]);
  }
  image.rect(0, 0, 8, SIZE, [96, 100, 108]);
  image.rect(SIZE - 8, 0, 8, SIZE, [96, 100, 108]);
  for (let chevron = 0; chevron < CHEVRONS; chevron += 1) {
    drawChevron(image, SIZE * (0.12 + (0.5 * chevron) / (CHEVRONS - 1)));
  }
  for (let along = 6; along < SIZE; along += 16) {
    for (const x of [4, SIZE - 4]) {
      bolt(image, x, along);
    }
  }
  for (let index = 0; index <= PLATES_ALONG; index += 1) {
    for (let x = 20; x < SIZE; x += 24) {
      bolt(image, x, Math.min((index * SIZE) / PLATES_ALONG, SIZE - 4) + 6);
    }
  }
  return image.toTexture({ repeat: false });
}

// A white chevron, its apex at canvas row `apexY`, pointing up (toward the lip).
function drawChevron(image, apexY) {
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 16; x < SIZE - 16; x += 1) {
      const apex = apexY + Math.abs(x - SIZE / 2) * 0.55;
      if (y >= apex && y < apex + 22) {
        image.mix(x, y, [250, 250, 246]);
      }
    }
  }
}

function bolt(image, x, y) {
  image.dot(x, y, 2.4, [88, 90, 96]);
  image.dot(x - 0.7, y - 0.7, 1.1, [222, 224, 230]);
}
