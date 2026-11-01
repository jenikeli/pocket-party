// Small helpers for the circuit props (cones, tyre stacks, warp pipes, giant mushrooms; M7d4c5): a lathe from
// [radius, height] points, colouring a shape per vertex by where the vertex is, a colour blend, and smoothing a
// lathe's seam. Used by kit/cone.js, tyre-stack.js, warp-pipe.js and giant-mushroom.js.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// A shape turned round the y axis from `points` ([radius, height] each, listed from the bottom up), `columns`
// slices round. Three.js's lathe makes outward-facing faces for points listed bottom to top.
export function lathe(points, columns) {
  return new THREE.LatheGeometry(points.map(([radius, height]) => new THREE.Vector2(radius, height)), columns);
}

// Gives every vertex of `geometry` the colour hexAt(x, y, z) (a hex number), for a material with vertexColors.
export function paintBy(geometry, hexAt) {
  const { position } = geometry.attributes;
  const colors = [];
  const color = new THREE.Color();
  for (let index = 0; index < position.count; index += 1) {
    color.set(hexAt(position.getX(index), position.getY(index), position.getZ(index)));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

// The colour `amount` (0 to 1) of the way from hex `from` to hex `to`, as a hex number.
export function blend(from, to, amount) {
  return new THREE.Color(from).lerp(new THREE.Color(to), Math.min(Math.max(amount, 0), 1)).getHex();
}

// The angle round the y axis of the point (x, z): 0 toward +z, turning toward +x.
export function angleAround(x, z) {
  return Math.atan2(x, z);
}

// `geometry` (a lathe whose vertices were moved) with its seam joined and its normals worked out again, so a
// bumpy surface shades smoothly all the way round. Gets zeroed texture coordinates so it merges with the lathes
// and boxes that have them.
export function smoothed(geometry) {
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  const joined = mergeVertices(geometry, 1e-4);
  joined.computeVertexNormals();
  joined.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(joined.attributes.position.count * 2), 2));
  geometry.dispose();
  return joined;
}
