// The kit's small trackside props (M7d2), our own toy versions of MK8DX's: a traffic cone, a stack of tyres, a
// green warp pipe and a giant red mushroom with white spots. Each is one shape coloured per vertex, standing on
// y = 0 round its middle, so a whole set of one prop draws as one instanced mesh. Used by kit/props.js.

import * as THREE from 'three';
import { at, coloured, mergeShapes } from '../shape-utils.js';

// An orange cone about 0.75 tall with a white band, on a black square foot.
export function buildCone() {
  return mergeShapes([
    coloured(at(new THREE.BoxGeometry(0.52, 0.06, 0.52), 0, 0.03, 0), 0x1d1d1f),
    coloured(at(new THREE.ConeGeometry(0.22, 0.7, 16), 0, 0.41, 0), 0xff6a14),
    coloured(at(new THREE.CylinderGeometry(0.135, 0.165, 0.12, 16), 0, 0.38, 0), 0xf4f4f0),
  ]);
}

// Four tyres stacked flat, about 1 tall, each with a dark disc filling its middle.
export function buildTyreStack() {
  return mergeShapes(
    [0, 1, 2, 3].flatMap((level) => {
      const y = 0.13 + level * 0.25;
      return [
        coloured(at(new THREE.TorusGeometry(0.36, 0.13, 8, 18).rotateX(Math.PI / 2), 0, y, 0), 0x1d1d20),
        coloured(at(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 14), 0, y, 0), 0x0e0e10),
      ];
    }),
  );
}

// A green warp pipe about 2.7 tall: the pipe, a wider rim round its top, and the dark inside.
export function buildWarpPipe() {
  return mergeShapes([
    coloured(at(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 24), 0, 1.1, 0), 0x2fbf3a),
    coloured(at(new THREE.CylinderGeometry(1.12, 1.12, 0.55, 24), 0, 2.45, 0), 0x3fd84a),
    coloured(at(new THREE.CircleGeometry(0.9, 24).rotateX(-Math.PI / 2), 0, 2.73, 0), 0x0c2a10),
  ]);
}

// A giant mushroom about 5 tall: a pale stem and a wide red cap with white spots.
export function buildGiantMushroom() {
  const capRadius = 3;
  const capHeight = 0.7;
  const capBottom = 2.7;
  const spots = [[0, 1.2], [0.85, 0.6], [2.4, 0.75], [3.9, 0.65], [5.2, 0.8], [1.6, 1.15], [4.6, 1.15]].map(([turn, tilt]) => {
    // A flattened ball on the cap's surface, turned to lie along it.
    const normal = new THREE.Vector3(Math.sin(tilt) * Math.cos(turn), Math.cos(tilt) / capHeight, Math.sin(tilt) * Math.sin(turn)).normalize();
    const spot = new THREE.SphereGeometry(0.7, 12, 6).scale(1, 0.3, 1);
    spot.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal));
    const surface = [Math.sin(tilt) * Math.cos(turn) * capRadius, capBottom + Math.cos(tilt) * capRadius * capHeight, Math.sin(tilt) * Math.sin(turn) * capRadius];
    return coloured(at(spot, ...surface), 0xffffff);
  });
  return mergeShapes([
    coloured(at(new THREE.CylinderGeometry(0.85, 1.05, capBottom + 0.2, 20), 0, (capBottom + 0.2) / 2, 0), 0xf4e8d0),
    coloured(at(new THREE.SphereGeometry(capRadius, 28, 12, 0, 2 * Math.PI, 0, Math.PI / 2).scale(1, capHeight, 1), 0, capBottom, 0), 0xe0281e),
    coloured(at(new THREE.CircleGeometry(capRadius, 28).rotateX(Math.PI / 2), 0, capBottom, 0), 0xf0dcb8),
    ...spots,
  ]);
}
