// Curved shapes for the karts and their drivers (M7d5): a side profile pushed out sideways with rounded edges
// (the kart's body panels), a smooth shell lofted through cross-sections (its nose and cowl), and one normal at a
// ball's seam (the drivers' heads). Used by kart-body.js, kart-shells.js and driver-parts.js.

import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

// A closed outline through `points` ([a, b] each, in order round it) with every corner rounded off over about
// `radius` (less where a side is short), so a shape cut from it has no sharp corner.
function roundedOutline(points, radius) {
  const shape = new THREE.Shape();
  const toward = (from, to, distance) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const share = Math.min(distance / length, 0.5);
    return [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share];
  };
  points.forEach((corner, index) => {
    const before = points[(index - 1 + points.length) % points.length];
    const after = points[(index + 1) % points.length];
    const [start, end] = [toward(corner, before, radius), toward(corner, after, radius)];
    if (index === 0) {
      shape.moveTo(...start);
    } else {
      shape.lineTo(...start);
    }
    shape.quadraticCurveTo(corner[0], corner[1], ...end);
  });
  shape.closePath();
  return shape;
}

// A side profile pushed out sideways: `points` ([z, y] each, in order round it) are the shape seen from
// the side, rounded at its corners by `radius`; it is `width` wide along x round x = 0, and every edge round
// its two sides is rounded by `bevel`. Indexed, so it merges with Three.js's shapes.
export function extrudedSide(points, width, { radius, bevel }) {
  const depth = Math.max(width - 2 * bevel, 0.001);
  const shape = new THREE.ExtrudeGeometry(roundedOutline(points, radius), {
    depth,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 2,
  });
  // The outline's first axis becomes z and the push x.
  shape.rotateY(-Math.PI / 2).translate(depth / 2, 0, 0);
  return creased(shape);
}

// `geometry` shaded smooth across its rounded edges and flat across its faces: Three.js's extruded shapes
// come shaded flat, triangle by triangle, so a bevel showed its steps; here two triangles meeting at less than
// `angle` share their normals. Returns a new, indexed geometry; `geometry` is disposed.
function creased(geometry, angle = Math.PI / 5) {
  // toCreasedNormals tells points apart only to a hundredth of a unit, too coarse for a kart's small bevels, so
  // the shape is scaled up meanwhile.
  geometry.scale(100, 100, 100);
  const smooth = toCreasedNormals(geometry, angle);
  smooth.scale(0.01, 0.01, 0.01);
  const indexed = mergeVertices(smooth);
  geometry.dispose();
  smooth.dispose();
  return indexed;
}

// A smooth surface through cross-sections: `rings` are arrays of THREE.Vector3, all as long, each joined to
// the next, as a shell lofted through its sections. `closed` joins each ring's last point to its first. The
// surface faces the side that (the way along a ring) x (the way from ring to ring) points to. Texture coordinates
// run along the rings (u) and from ring to ring (v). Indexed, shaded smooth.
export function loft(rings, closed = false) {
  const columns = rings[0].length;
  const positions = [];
  const uvs = [];
  rings.forEach((ring, row) => {
    ring.forEach((point, column) => {
      positions.push(point.x, point.y, point.z);
      uvs.push(column / (columns - 1), row / (rings.length - 1));
    });
  });
  const indices = [];
  for (let row = 0; row < rings.length - 1; row += 1) {
    for (let column = 0; column < (closed ? columns : columns - 1); column += 1) {
      const [a, b] = [row * columns + column, row * columns + ((column + 1) % columns)];
      indices.push(a, b, a + columns, b, b + columns, a + columns);
    }
  }
  const surface = new THREE.BufferGeometry();
  surface.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  surface.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  surface.setIndex(indices);
  surface.computeVertexNormals();
  return surface;
}

// Gives the vertices of `geometry` that sit at the same place (a ball's seam and poles, which Three.js builds
// twice) one normal, the average of theirs, so no line shows where the seam is. Returns `geometry`.
export function joinNormals(geometry) {
  const { position, normal } = geometry.attributes;
  const byPlace = new Map();
  for (let index = 0; index < position.count; index += 1) {
    const key = [position.getX(index), position.getY(index), position.getZ(index)].map((value) => value.toFixed(5)).join(',');
    byPlace.set(key, [...(byPlace.get(key) ?? []), index]);
  }
  const sum = new THREE.Vector3();
  const one = new THREE.Vector3();
  byPlace.forEach((indices) => {
    sum.set(0, 0, 0);
    indices.forEach((index) => sum.add(one.fromBufferAttribute(normal, index)));
    sum.normalize();
    indices.forEach((index) => normal.setXYZ(index, sum.x, sum.y, sum.z));
  });
  return geometry;
}
