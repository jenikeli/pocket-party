// A five-petal flower with a yellow middle (M7d4c5), as MK8DX's hedges and planters carry: round petals round a
// small dome, flat on a surface and standing a little off it. About 55 triangles. Used by kit/hedge.js and
// kit/planter.js.

import * as THREE from 'three';
import { coloured, mergeShapes } from '../shape-utils.js';

const PETALS = 5;
const MIDDLE = 0xffd02a;

// A flower of `size` (its radius, about) at `position` ([x, y, z]) facing along `normal` ([x, y, z], the way the
// surface it sits on faces), its petals in `petalColor` (hex), turned `spin` radians about its middle.
export function buildFlower({ position, normal, size, petalColor, spin }) {
  const parts = Array.from({ length: PETALS }, (_, petal) => {
    const geometry = new THREE.CircleGeometry(0.5, 6).scale(0.8, 1, 1).translate(0, 0.52, 0.03);
    return coloured(geometry.rotateZ(spin + (petal / PETALS) * 2 * Math.PI), petalColor);
  });
  parts.push(coloured(new THREE.SphereGeometry(0.28, 6, 3).scale(1, 1, 0.55).translate(0, 0, 0.05), MIDDLE));
  const flower = mergeShapes(parts).scale(size, size, size);
  const facing = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...normal).normalize());
  return flower.applyQuaternion(facing).translate(...position);
}
