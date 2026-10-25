// Small helpers for building the 3D race's models out of Three.js's simple shapes: placing a shape, stretching
// one between two points, colouring one per vertex, and merging many into one geometry (one draw call). Used by
// kart-shapes.js, seaside-scenery.js, seaside-props.js, trackside.js and the kit's pieces (kit/).

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

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

// A box `width` by `height` by `depth` round its middle with every edge rounded by about `radius`, for the
// kit's chunky, toy-like pieces: a rounded rectangle pushed out along z with rounded (bevelled) front and back
// edges. Indexed, like Three.js's own shapes, so it merges with them.
export function roundedBox(width, height, depth, radius) {
  const halfWidth = width / 2 - radius;
  const halfHeight = height / 2 - radius;
  const corner = radius / 2;
  const outline = new THREE.Shape();
  outline.moveTo(-halfWidth + corner, -halfHeight);
  outline.lineTo(halfWidth - corner, -halfHeight);
  outline.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + corner);
  outline.lineTo(halfWidth, halfHeight - corner);
  outline.quadraticCurveTo(halfWidth, halfHeight, halfWidth - corner, halfHeight);
  outline.lineTo(-halfWidth + corner, halfHeight);
  outline.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - corner);
  outline.lineTo(-halfWidth, -halfHeight + corner);
  outline.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + corner, -halfHeight);
  const shape = new THREE.ExtrudeGeometry(outline, {
    depth: Math.max(depth - 2 * radius, 0.001),
    bevelEnabled: true,
    bevelSize: radius,
    bevelThickness: radius,
    bevelSegments: 2,
    curveSegments: 3,
  });
  shape.translate(0, 0, -(depth - 2 * radius) / 2);
  // Extruded shapes come unindexed; merging their identical corners indexes them, and keeps their flat faces
  // flat (corners whose normals differ stay apart).
  const indexed = mergeVertices(shape);
  shape.dispose();
  return indexed;
}

// One geometry from many, which are disposed. Three.js's shapes (and roundedBox) are all indexed with position,
// normal and uv; merged shapes must all have colours or none.
export function mergeShapes(geometries) {
  const merged = mergeGeometries(geometries);
  if (!merged) {
    throw new Error('Shapes could not be merged (their attributes differ)');
  }
  geometries.forEach((geometry) => geometry.dispose());
  return merged;
}
