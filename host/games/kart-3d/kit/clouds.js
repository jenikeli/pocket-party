// The kit's cumulus cloud (M7d3; M7c's with more puffs and shading): puffs heaped in two layers on a flat base,
// white on top and blue-grey underneath, as MK8DX's big clouds are. One geometry coloured per vertex, about 30
// across and 7.5 tall above y = 0, its base flat. Used by the seaside surroundings.

import * as THREE from 'three';
import { at, mergeShapes } from '../shape-utils.js';

const TOP = new THREE.Color(0xffffff);
const UNDERSIDE = new THREE.Color(0xc3cfe2);
const HEIGHT = 7.5;
// [x, y, z, radius] for each puff: a wide low layer and a smaller one heaped on it.
const PUFFS = [
  [0, 1, 0, 6.5], [-7.5, 0.5, 1, 5], [7.5, 0.6, -1, 5.5], [-3, 0.5, -4.5, 4.5], [4, 0.5, 4.5, 4.5], [-12.5, 0, -1, 3.5], [12.5, 0, 1, 3.8],
  [-2, 4.2, 0.5, 4.2], [3.5, 3.6, -0.5, 3.8], [-6.5, 3, 0, 3], [0.5, 6, 0, 2.6],
];

export function buildCloud() {
  const cloud = mergeShapes(PUFFS.map(([x, y, z, radius]) => at(new THREE.SphereGeometry(radius, 9, 6).scale(1, 0.72, 0.85), x, y, z)));
  const { position, normal } = cloud.attributes;
  const colors = [];
  const color = new THREE.Color();
  for (let index = 0; index < position.count; index += 1) {
    // Everything below the base is pressed flat onto it, facing down.
    if (position.getY(index) < 0) {
      position.setY(index, 0);
      normal.setXYZ(index, 0, -1, 0);
    }
    color.lerpColors(UNDERSIDE, TOP, Math.min(1, (position.getY(index) / HEIGHT) * 1.8));
    colors.push(color.r, color.g, color.b);
  }
  cloud.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return cloud;
}
