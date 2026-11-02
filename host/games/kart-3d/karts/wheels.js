// Our go-kart's tyres (M7d5), in the style of MK8DX's standard tyres: fat black tyres with a deep block tread and a
// big gold hub filling most of the outer face, with a centre cap, turned round the axle from one outline. The
// tread's blocks are built (raised columns round the tyre, staggered either side of a middle groove); the
// lettering, the hub's five holes and the rims that glow in anti-gravity are drawn on the wheel's maps
// (wheel-maps.js), whose texture coordinates run round the wheel (u) and along the outline (v, WHEEL_OUTLINE).
// Used by kart-models.js.

import * as THREE from 'three';

// The outline turned round the axle, from the middle of the outer face round to the middle of the inner one:
// [radius share, sideways share (1 the outer face, -1 the inner), v, part]. Radii are shares of the tyre's
// radius and sideways places of half its width, so front and rear wheels share one set of maps. A part of 'tread'
// is raised into a block (to the full radius) where the tread's pattern says so, and sunk otherwise.
export const WHEEL_OUTLINE = Object.freeze([
  [0, 0.8, 0, 'cap'], [0.11, 0.78, 0.05, 'cap'], [0.16, 0.68, 0.1, 'cap'],
  [0.2, 0.6, 0.11, 'hub'], [0.58, 0.6, 0.29, 'hub'],
  [0.63, 0.72, 0.32, 'rim'], [0.7, 0.67, 0.36, 'rim'],
  [0.76, 0.88, 0.4, 'side'], [0.9, 0.98, 0.5, 'side'], [0.97, 0.86, 0.57, 'side'],
  [1, 0.7, 0.61, 'tread'], [1, 0.16, 0.69, 'tread'],
  [0.92, 0, 0.71, 'groove'],
  [1, -0.16, 0.73, 'tread'], [1, -0.7, 0.81, 'tread'],
  [0.97, -0.86, 0.85, 'side'], [0.86, -0.97, 0.89, 'side'],
  [0.66, -0.8, 0.93, 'rim'], [0, -0.7, 1, 'hub'],
].map(Object.freeze));
// How deep the tread's gaps are, as a share of the radius.
const TREAD_DEPTH = 0.1;
// Round each tyre, its blocks are this many steps long and their gaps as long; the two rows are staggered by
// one block.
const BLOCK_STEPS = 2;

// The wheel for one of kart-layout.js's WHEELS ({ radius, width, front, side }), its middle at the origin and its
// axle along x, the outer face toward the kart's outside. Rear tyres get more steps round, for their size.
export function buildWheel({ radius, width, front, side }) {
  const steps = front ? 36 : 48;
  const wheel = turnedOutline(radius, width / 2, steps);
  // Turned round the axle along y, the outer face up: tipped onto x, toward the kart's left, and for the right
  // side turned round to face the other way (a turn, not a mirror, so the lettering reads the right way round).
  wheel.rotateZ(-Math.PI / 2);
  if (side < 0) {
    wheel.rotateY(Math.PI);
  }
  return wheel;
}

// The outline turned `steps` times round the y axis, as Three.js's LatheGeometry, but with the tread's blocks raised
// column by column. Indexed, shaded smooth, with the seam where the turn meets itself shaded as one.
function turnedOutline(radius, halfWidth, steps) {
  const positions = [];
  const uvs = [];
  for (let step = 0; step <= steps; step += 1) {
    const angle = (step / steps) * Math.PI * 2;
    WHEEL_OUTLINE.forEach(([radiusShare, sideways, v, part]) => {
      const reach = radius * (part === 'tread' ? treadShare(step, sideways) : radiusShare);
      positions.push(Math.sin(angle) * reach, sideways * halfWidth, Math.cos(angle) * reach);
      // u runs backward round the turn, so the lettering reads clockwise seen from outside the outer face.
      uvs.push(1 - step / steps, v);
    });
  }
  const columns = WHEEL_OUTLINE.length;
  const indices = [];
  for (let step = 0; step < steps; step += 1) {
    for (let point = 0; point < columns - 1; point += 1) {
      const [a, b] = [step * columns + point, step * columns + point + 1];
      const [c, d] = [a + columns, b + columns];
      // The outline runs down from the outer face, so this winding faces out.
      indices.push(a, b, c, b, d, c);
    }
  }
  const wheel = new THREE.BufferGeometry();
  wheel.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  wheel.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  wheel.setIndex(indices);
  wheel.computeVertexNormals();
  joinSeam(wheel, steps, columns);
  return wheel;
}

// The tread's radius share at one step round: a block's top (the full radius) or a gap. The outer row's blocks
// sit where the inner row's gaps are.
function treadShare(step, sideways) {
  const row = sideways > 0 ? 0 : 1;
  const raised = Math.floor(step / BLOCK_STEPS + row) % 2 === 0;
  return raised ? 1 : 1 - TREAD_DEPTH;
}

// The first and last steps are the same points (u 1 and 0); their normals are averaged, so no line shows there.
function joinSeam(wheel, steps, columns) {
  const { normal } = wheel.attributes;
  const shared = new THREE.Vector3();
  for (let point = 0; point < columns; point += 1) {
    const [first, last] = [point, steps * columns + point];
    shared.fromBufferAttribute(normal, first).add(new THREE.Vector3().fromBufferAttribute(normal, last)).normalize();
    normal.setXYZ(first, shared.x, shared.y, shared.z);
    normal.setXYZ(last, shared.x, shared.y, shared.z);
  }
}
