// Small helpers for building the 3D race's models out of Three.js's simple shapes: placing a shape, stretching
// one between two points, colouring one per vertex, and merging many into one geometry (one draw call). Used by
// kart-shapes.js, seaside-scenery.js, seaside-props.js and trackside.js.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function at(geometry, x, y, z) {
  return geometry.translate(x, y, z);
}

// A shape 1 long along y (a cylinder, capsule or box), stretched and turned to reach from `from` to `to`
// ([x, y, z] each).
export function between(geometry, from, to) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const direction = end.clone().sub(start);
  geometry.scale(1, direction.length(), 1);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  return geometry.translate(...start.add(end).multiplyScalar(0.5).toArray());
}

// Gives every vertex of `geometry` the colour `hex`, for a material with vertexColors.
export function coloured(geometry, hex) {
  const color = new THREE.Color(hex);
  const colors = [];
  for (let index = 0; index < geometry.attributes.position.count; index += 1) {
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

// One geometry from many, which are disposed. Three.js's shapes are all indexed with position, normal and uv;
// merged shapes must all have colours or none.
export function mergeShapes(geometries) {
  const merged = mergeGeometries(geometries);
  if (!merged) {
    throw new Error('Shapes could not be merged (their attributes differ)');
  }
  geometries.forEach((geometry) => geometry.dispose());
  return merged;
}
