// The kit's hot-air balloon (M7d3), for a sky course: an envelope of gores in two colours in turn, narrowing to
// its mouth, a burner under it on four ropes, and a wicker basket. One geometry coloured per vertex, about 11
// tall, the basket's floor at y = 0. Used by the seaside sky.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes, roundedBox } from '../shape-utils.js';

const GORES = 12;
const RADIUS = 3.6;
const MIDDLE = 7;

// `colors` are the gores' two colours, in turn.
export function buildBalloon(colors) {
  const gores = Array.from({ length: GORES }, (_, gore) => {
    const shape = new THREE.SphereGeometry(RADIUS, 3, 14, (gore / GORES) * 2 * Math.PI, (2 * Math.PI) / GORES);
    // A teardrop: the lower half narrows toward the mouth.
    const position = shape.attributes.position;
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index) / RADIUS;
      const squeeze = y < 0 ? 1 + y * 0.6 : 1;
      position.setXYZ(index, position.getX(index) * squeeze, position.getY(index) * 1.15, position.getZ(index) * squeeze);
    }
    shape.computeVertexNormals();
    return coloured(at(shape, 0, MIDDLE, 0), colors[gore % 2]);
  });
  const mouth = MIDDLE - RADIUS * 1.15;
  const ropes = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) =>
    coloured(between(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), [x * 0.55, 1.1, z * 0.55], [x * 1.2, mouth + 0.6, z * 1.2]), 0x4a3a2a),
  );
  return mergeShapes([
    ...gores,
    ...ropes,
    coloured(at(new THREE.CylinderGeometry(0.35, 0.3, 0.5, 8), 0, mouth - 0.2, 0), 0x6a6a70),
    coloured(at(roundedBox(1.3, 1.1, 1.3, 0.12), 0, 0.55, 0), 0xa8783e),
    coloured(at(new THREE.TorusGeometry(0.66, 0.07, 6, 4).rotateX(Math.PI / 2).rotateY(Math.PI / 4), 0, 1.12, 0), 0x7a5232),
  ]);
}
