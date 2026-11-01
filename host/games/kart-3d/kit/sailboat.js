// The kit's sailboat (M7d3; M7c's boat with more parts): a white hull with a blue band, a wooden deck, a small
// cabin with windows, a mast with a boom, and a mainsail and a jib. One geometry coloured per vertex (the sails
// are flat, so its material is seen from both sides), about 6 long, facing +z, its waterline at y = 0. Takes the
// kit and returns the parts, [{ geometry, material }]. Used by the seaside surroundings.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes, roundedBox } from '../shape-utils.js';

export function buildSailboat({ keep }) {
  const hull = new THREE.SphereGeometry(1, 16, 6, 0, 2 * Math.PI, Math.PI / 2, Math.PI / 2).scale(1.1, 0.8, 3);
  const boat = mergeShapes([
    coloured(hull, 0xf6f6f2),
    coloured(at(new THREE.CylinderGeometry(1.12, 1.12, 0.22, 16).scale(1, 1, 3), 0, -0.08, 0), 0x2a62c9),
    coloured(at(new THREE.CylinderGeometry(1.02, 1.02, 0.08, 16).scale(1, 1, 3), 0, 0.06, 0), 0xc89c68),
    coloured(at(roundedBox(1.2, 0.6, 1.6, 0.12), 0, 0.4, -0.6), 0xf6f6f2),
    coloured(at(roundedBox(1.22, 0.22, 1.1, 0.06), 0, 0.5, -0.6), 0x2a4050),
    coloured(at(new THREE.CylinderGeometry(0.06, 0.08, 7, 6), 0, 3.5, 0.6), 0xd8d8d0),
    coloured(between(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), [0, 1.1, 0.6], [0, 1.1, -2.2]), 0xd8d8d0),
    coloured(sail([0, 1.25, 0.55], [0, 6.8, 0.55], [0, 1.25, -2.1]), 0xfdfbf2),
    coloured(sail([0, 6.3, 0.75], [0, 0.6, 2.7], [0, 0.6, 0.75]), 0xffd6a0),
  ]);
  const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide }));
  return [{ geometry: keep(boat), material }];
}

// A flat three-cornered sail, indexed with a normal and texture coordinates like Three.js's shapes, so it merges
// with them.
function sail(a, b, c) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 0], 2));
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();
  return geometry;
}
