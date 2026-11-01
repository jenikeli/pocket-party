// The kit's palm trunk, crown knob and coconuts (M7d4c2): a stack of rings, each a short cone whose scalloped
// lip flares out over the top of the ring below (as on MK8DX's Daisy Circuit palms), with texture coordinates
// into kit/palm-textures.js's bark. Vertex colours shade it (dark under each lip) and tint the crown's balls.
// Used by kit/palm.js.

import * as THREE from 'three';
import { at, coloured, mergeShapes } from '../shape-utils.js';
import { BARK_V_FROM, PLAIN_V } from './palm-textures.js';

const HEIGHT = 8.5;
const LEAN = 1.6;
const RINGS = 12;
const SEGMENTS = 20;
const SCALLOPS = 5;
const FOOT_RADIUS = 0.4;
const TOP_RADIUS = 0.24;
// How far a ring's lip hangs below its start at the deepest scallop, as a share of the ring's height.
const SCALLOP_DROP = 0.35;
// A ring's three rows, from its lip's edge to where it tucks under the ring above: how far up the ring (as a
// share of its height; more than 1 tucks it under the next lip), the radius against the trunk's, the shade and
// the bark texture's height. The top row is dark because the lip above leaves it in shadow.
const ROWS = [
  { up: 0, radius: 1.08, shade: 0.55, v: BARK_V_FROM },
  { up: 0.22, radius: 1.24, shade: 1.05, v: 0.45 },
  { up: 1.4, radius: 0.84, shade: 0.4, v: 1 },
];

// The trunk's centre line at `share` (0 at the foot, 1 at the crown): it rises straight and bends over near the
// top, a quadratic curve.
export function trunkPoint(share) {
  return new THREE.Vector3(LEAN * share * share, HEIGHT * share, 0);
}

function radiusAt(share) {
  return FOOT_RADIUS + (TOP_RADIUS - FOOT_RADIUS) * share;
}

// How deep the lip hangs at `turn` (0 to 1 round the ring): rounded scallops with a point between each pair.
function scallopAt(turn) {
  return Math.abs(Math.sin(turn * SCALLOPS * Math.PI)) ** 0.6;
}

// Returns the trunk, crown knob and coconuts as one geometry.
export function buildTrunk() {
  const parts = Array.from({ length: RINGS }, (_, ring) => buildRing(ring));
  const top = trunkPoint(1);
  parts.push(plain(new THREE.SphereGeometry(0.42, 12, 8), top.x, top.y, top.z, 0x7a8e32));
  for (let nut = 0; nut < 3; nut += 1) {
    const angle = (nut / 3) * 2 * Math.PI;
    parts.push(plain(new THREE.SphereGeometry(0.22, 8, 6), top.x + Math.cos(angle) * 0.32, top.y - 0.32, top.z + Math.sin(angle) * 0.32, 0x5a3a1c));
  }
  return mergeShapes(parts);
}

// A ball that takes one flat colour: its texture coordinates all point at the bark texture's plain strip.
function plain(sphere, x, y, z, hex) {
  const uv = sphere.attributes.uv;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, 0.5, PLAIN_V);
  }
  return coloured(at(sphere, x, y, z), hex);
}

// One ring: SEGMENTS round by the three ROWS up. Ring 0 has no scallop, so the foot stands flat on y = 0, and
// no ring reaches past the crown.
function buildRing(ring) {
  const size = 1 / RINGS;
  const positions = [];
  const colors = [];
  const uvs = [];
  for (const row of ROWS) {
    for (let segment = 0; segment <= SEGMENTS; segment += 1) {
      const turn = segment / SEGMENTS;
      const drop = row.up === 0 && ring > 0 ? SCALLOP_DROP * size * scallopAt(turn) : 0;
      const share = Math.min(ring * size + row.up * size - drop, 1);
      const centre = trunkPoint(share);
      const tangent = trunkPoint(share + 0.001).sub(centre).normalize();
      // Round the centre line in the plane the lean bends in (sideways) and across it (z).
      const sideways = new THREE.Vector2(tangent.y, -tangent.x);
      const radius = radiusAt(share) * row.radius;
      const angle = turn * 2 * Math.PI;
      positions.push(centre.x + sideways.x * Math.cos(angle) * radius, centre.y + sideways.y * Math.cos(angle) * radius, Math.sin(angle) * radius);
      colors.push(row.shade, row.shade, row.shade);
      uvs.push(turn, row.v);
    }
  }
  return ringGeometry(positions, colors, uvs);
}

function ringGeometry(positions, colors, uvs) {
  const columns = SEGMENTS + 1;
  const indices = [];
  for (let row = 0; row < ROWS.length - 1; row += 1) {
    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      const a = row * columns + segment;
      indices.push(a, a + columns, a + 1, a + 1, a + columns, a + columns + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  joinSeam(geometry.attributes.normal, columns);
  return geometry;
}

// A ring's first and last column are the same line (the texture needs both), so they get one shared normal, or
// a seam would show in the light.
function joinSeam(normals, columns) {
  for (let row = 0; row < ROWS.length; row += 1) {
    const [first, last] = [row * columns, row * columns + columns - 1];
    const joined = new THREE.Vector3(normals.getX(first) + normals.getX(last), normals.getY(first) + normals.getY(last), normals.getZ(first) + normals.getZ(last)).normalize();
    normals.setXYZ(first, joined.x, joined.y, joined.z);
    normals.setXYZ(last, joined.x, joined.y, joined.z);
  }
}
