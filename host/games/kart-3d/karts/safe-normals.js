// Normals the GPU can always shade (M7d5): a triangle whose corners' normals are near zero, or point more than a
// right angle apart, is given flat normals of its own. Across such a triangle the normal the GPU blends between its
// corners passes through (almost) nothing; the iPad's GPU keeps that blend in half precision, where it became NaN
// or infinity, and bloom spread that one pixel over the whole frame as a cyan or green flash. They are the folds of
// thin shapes (a lip, a ribbon's edge) and the tips where a shape closes to a point, a few dozen triangles a kart,
// so flat shading there does not show. Used by design-shapes.js; countBadTriangles by the designs' unit test.

import * as THREE from 'three';

// A corner's normal shorter than this is near zero.
const SHORTEST_NORMAL = 0.5;
// Two corners' normals whose dot product is below this point more than a right angle apart.
const WIDEST_SPREAD = 0;

// How many of `geometry`'s triangles (indexed, with normals) the GPU may not shade.
export function countBadTriangles(geometry) {
  return findBadTriangles(geometry).length;
}

// `geometry` with each bad triangle given three corners of its own, copied from its old ones but with the
// triangle's own (flat) normal. Returns `geometry` itself when nothing is bad; otherwise a new geometry, and
// `geometry` is disposed.
export function withSafeNormals(geometry) {
  const bad = findBadTriangles(geometry);
  if (bad.length === 0) {
    return geometry;
  }
  const index = Array.from(geometry.index.array);
  const vertexCount = geometry.attributes.position.count;
  const safe = new THREE.BufferGeometry();
  Object.entries(geometry.attributes).forEach(([name, attribute]) => {
    const size = attribute.itemSize;
    const values = new Float32Array((vertexCount + bad.length * 3) * size);
    values.set(attribute.array);
    bad.forEach((first, badIndex) => {
      for (let corner = 0; corner < 3; corner += 1) {
        const from = index[first + corner];
        const to = vertexCount + badIndex * 3 + corner;
        for (let component = 0; component < size; component += 1) {
          values[to * size + component] = attribute.array[from * size + component];
        }
      }
    });
    safe.setAttribute(name, new THREE.BufferAttribute(values, size));
  });
  const position = safe.attributes.position;
  const normal = safe.attributes.normal;
  const faceNormal = new THREE.Vector3();
  bad.forEach((first, badIndex) => {
    const corners = [0, 1, 2].map((corner) => vertexCount + badIndex * 3 + corner);
    flatNormal(position, corners, faceNormal);
    corners.forEach((vertex, corner) => {
      normal.setXYZ(vertex, faceNormal.x, faceNormal.y, faceNormal.z);
      index[first + corner] = vertex;
    });
  });
  safe.setIndex(index);
  geometry.dispose();
  return safe;
}

// The first index (into geometry.index) of each bad triangle. A triangle with no area draws no pixel, so it is
// never bad.
function findBadTriangles(geometry) {
  const { index } = geometry;
  const { position, normal } = geometry.attributes;
  if (!index || !normal) {
    return [];
  }
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const faceNormal = new THREE.Vector3();
  const bad = [];
  for (let first = 0; first < index.count; first += 3) {
    const vertices = [index.getX(first), index.getX(first + 1), index.getX(first + 2)];
    if (flatNormal(position, vertices, faceNormal).lengthSq() === 0) {
      continue;
    }
    vertices.forEach((vertex, corner) => corners[corner].fromBufferAttribute(normal, vertex));
    const tooShort = corners.some((corner) => corner.length() < SHORTEST_NORMAL);
    const spread = Math.min(corners[0].dot(corners[1]), corners[1].dot(corners[2]), corners[2].dot(corners[0]));
    if (tooShort || spread < WIDEST_SPREAD) {
      bad.push(first);
    }
  }
  return bad;
}

// Sets `target` to the unit normal of the triangle through `vertices` (three indices into `position`), or to zero
// if it has no area, and returns it.
function flatNormal(position, vertices, target) {
  const [a, b, c] = vertices.map((vertex) => new THREE.Vector3().fromBufferAttribute(position, vertex));
  target.crossVectors(b.sub(a), c.sub(a));
  const length = target.length();
  return length < 1e-12 ? target.set(0, 0, 0) : target.divideScalar(length);
}
