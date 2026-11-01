// Small helpers for the stilt hut's planks and thatch (M7d4d): a plank whose texture coordinates are scaled and
// shifted so a long thin part shows a patch of the tile, not the whole tile squeezed onto it. Used by
// kit/stilt-hut-wood.js, kit/stilt-hut-roof.js and kit/stilt-hut-flowers.js.

import * as THREE from 'three';
import { between } from '../random.js';

// Scales `geometry`'s texture coordinates by (scaleU, scaleV) from a random spot in the tile, so neighbours differ.
export function patchUv(geometry, random, scaleU, scaleV) {
  const { uv } = geometry.attributes;
  const [shiftU, shiftV] = [random(), random()];
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, shiftU + uv.getX(index) * scaleU, shiftV + uv.getY(index) * scaleV);
  }
  return geometry;
}

// A board `width` by `height` by `depth`, its texture a patch of the tile (see patchUv).
export function board(width, height, depth, random) {
  return patchUv(new THREE.BoxGeometry(width, height, depth), random, between(random, 0.2, 0.35), between(random, 0.2, 0.35));
}

// A colour `hex` made lighter or darker by up to `spread` (0.1 is one tenth), by a number from `random`.
export function jittered(hex, random, spread) {
  const factor = 1 + between(random, -spread, spread);
  return new THREE.Color(hex).multiplyScalar(factor).getHex();
}
