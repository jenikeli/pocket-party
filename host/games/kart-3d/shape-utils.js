// Small helpers for building the 3D race's models out of Three.js's simple shapes: placing a shape, stretching
// one between two points, colouring one per vertex, and merging many into one geometry (one draw call). Used by
// the karts (karts/) and the kit's pieces (kit/). Since M7d4 also rounded cylinders and shading by position, and
// since M7d4b2 texture coordinates wrapped round a post. The karts' curved shapes are in karts/curved-shapes.js.

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
// edges. Indexed, like Three.js's own shapes, so it merges with them. About 190 triangles; `chamfered` (M7d4)
// cuts each edge with one flat face instead, about 60, for small parts repeated hundreds of times round a
// course (posts, clamps), where a curve would not show but the triangles would.
export function roundedBox(width, height, depth, radius, { chamfered = false } = {}) {
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
    bevelSegments: chamfered ? 1 : 2,
    curveSegments: chamfered ? 1 : 3,
  });
  shape.translate(0, 0, -(depth - 2 * radius) / 2);
  // Extruded shapes come unindexed; merging their identical corners indexes them, and keeps their flat faces
  // flat (corners whose normals differ stay apart).
  const welded = mergeVertices(shape);
  shape.dispose();
  return welded;
}

// A cylinder `height` tall round its middle (like Three.js's), `radiusTop` and `radiusBottom` wide, with both
// rims rounded by `bevel` (M7d4): a post, a pole or a cap whose rims catch a line of light, as MK8DX's do,
// instead of meeting its ends at a sharp crease. A lathe, so it is indexed and merges with Three.js's shapes.
export function roundedCylinder(radiusTop, radiusBottom, height, bevel, radialSegments = 12) {
  const half = height / 2;
  const rim = (radius, y, towardMiddle) =>
    [0, 1, 2].map((step) => {
      const angle = (step / 2) * (Math.PI / 2);
      return new THREE.Vector2(radius - bevel + Math.sin(angle) * bevel, y + towardMiddle * (bevel - Math.cos(angle) * bevel));
    });
  const points = [new THREE.Vector2(0, -half), ...rim(radiusBottom, -half, 1), ...rim(radiusTop, half, -1).reverse(), new THREE.Vector2(0, half)];
  return new THREE.LatheGeometry(points, radialSegments);
}

// Multiplies `geometry`'s vertex colours (from coloured) by shadeAt(x, y, z) at each vertex, and returns it
// (M7d4): darker where parts meet, as MK8DX's creases are, or lighter toward a block's top.
export function shaded(geometry, shadeAt) {
  const { position, color } = geometry.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const shade = shadeAt(position.getX(index), position.getY(index), position.getZ(index));
    color.setXYZ(index, color.getX(index) * shade, color.getY(index) * shade, color.getZ(index) * shade);
  }
  return geometry;
}

// Texture coordinates wrapped round a box-like shape standing up along y, such as a post (M7d4b2), so one picture
// of its four faces side by side covers it: u runs once round it, from the left edge of its +z face on to +x, -z
// and -x, as each face is seen from outside (a picture reads the right way round on every face); v runs from
// `bottom` (0) to `bottom + height` (1). A vertex's face is told by where it is, not by its normal, so u runs on
// round a rounded corner without a jump. Returns a new geometry without an index (each triangle then has its own
// corners, so the one where u comes back round to 0 can be given 1 instead); `geometry` is disposed.
export function wrapUv(geometry, bottom, height) {
  const wrapped = geometry.toNonIndexed();
  geometry.dispose();
  wrapped.computeBoundingBox();
  const { min, max } = wrapped.boundingBox;
  const [middleX, middleZ] = [(min.x + max.x) / 2, (min.z + max.z) / 2];
  const [halfX, halfZ] = [(max.x - min.x) / 2, (max.z - min.z) / 2];
  const perimeter = 4 * (halfX + halfZ);
  const { position, uv } = wrapped.attributes;
  const aroundAt = (index) => {
    const [x, z] = [position.getX(index) - middleX, position.getZ(index) - middleZ];
    if (Math.abs(x) / halfX > Math.abs(z) / halfZ) {
      return x > 0 ? 2 * halfX + (halfZ - z) : 4 * halfX + 2 * halfZ + (z + halfZ);
    }
    return z > 0 ? x + halfX : 2 * halfX + 2 * halfZ + (halfX - x);
  };
  for (let first = 0; first < position.count; first += 3) {
    const us = [0, 1, 2].map((corner) => aroundAt(first + corner) / perimeter);
    const crossesBack = Math.max(...us) - Math.min(...us) > 0.5;
    us.forEach((u, corner) => uv.setXY(first + corner, crossesBack && u < 0.5 ? u + 1 : u, (position.getY(first + corner) - bottom) / height));
  }
  return wrapped;
}

// Gives a shape that came without an index (extruded shapes, icosahedra) one, since shapes merged by
// mergeShapes must all have an index or all have none.
export function indexed(geometry) {
  geometry.setIndex(Array.from({ length: geometry.attributes.position.count }, (unused, index) => index));
  return geometry;
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
