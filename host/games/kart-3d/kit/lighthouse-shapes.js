// Shapes for the lighthouse (M7d4d) that are not boxes or cylinders: arched windows and doors, and the
// weathervane's clover. Used by kit/lighthouse-tower.js and kit/lighthouse-top.js.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// An arch `width` wide and `height` tall standing on y = 0, its top a half circle, pushed out `depth` along +z
// from z = 0 with its edges rounded by `bevel`. With a `border`, only a frame that wide round an opening.
export function archGeometry({ width, height, depth, bevel, border = 0 }) {
  const shape = archPath(new THREE.Shape(), width, height);
  if (border > 0) {
    shape.holes.push(archPath(new THREE.Path(), width - 2 * border, height - border, border));
  }
  const extruded = new THREE.ExtrudeGeometry(shape, { depth: Math.max(depth - 2 * bevel, 0.001), bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 8 });
  extruded.translate(0, 0, bevel);
  const indexed = mergeVertices(extruded);
  extruded.dispose();
  return indexed;
}

// The arch's outline on `path`, `foot` above y = 0 at its bottom.
function archPath(path, width, height, foot = 0) {
  const radius = width / 2;
  path.moveTo(-radius, foot);
  path.lineTo(radius, foot);
  path.lineTo(radius, height - radius);
  path.absarc(0, height - radius, radius, 0, Math.PI, false);
  path.lineTo(-radius, foot);
  return path;
}

// A clover of four round leaves in the x-y plane, `leaf` the leaves' radius, centred on the origin, `thickness` thick.
export function cloverGeometry(leaf, thickness) {
  const leaves = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, y]) => new THREE.CylinderGeometry(leaf, leaf, thickness, 12).rotateX(Math.PI / 2).translate(x * leaf, y * leaf, 0));
  const centre = new THREE.BoxGeometry(leaf * 1.4, leaf * 1.4, thickness).rotateZ(Math.PI / 4);
  return [...leaves, centre];
}
