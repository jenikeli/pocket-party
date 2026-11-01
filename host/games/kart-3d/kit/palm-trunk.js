// The kit's palm trunk, crown knob and coconuts (M7d4c4, after the Blender palm of tools/blender/palm.py): a
// stack of 12 scales, each a plump shell whose lip flares out over the scale below and hangs in 8 rounded teeth,
// its top tucked in under the next lip, as on MK8DX's Daisy Circuit palms. Vertex colours shade it (light at the
// lip, dark in the crease under the next one) and tint the crown's balls; texture coordinates point into
// kit/palm-textures.js's bark. Used by kit/palm.js.

import * as THREE from 'three';
import { at, coloured, mergeShapes } from '../shape-utils.js';
import { BARK_LIP_V, BARK_TOP_V, BARK_UNDER_V, PLAIN_V } from './palm-textures.js';

const HEIGHT = 8.5;
const LEAN = 1.6;
const SCALES = 12;
const FOOT_RADIUS = 0.4;
const TOP_RADIUS = 0.24;
// A scale's lip is this much wider than the trunk's core (0.47 at the foot, inside the palm's reach of 0.5), and
// its top tucks in to this much under the next scale's lip.
const FLARE = 1.18;
const TUCK = 0.9;
const TEETH = 8;
// Four columns to a tooth, so its lower edge can be round (with two, every tooth was a sharp V).
const COLUMNS = 32;
// A scale's rows, from its lip (0) to its tucked top (1), with the shade of each: the lip is in the light, the
// top rows in the crease under the next scale's lip (the shade Blender's bake gives).
const ROWS = [
  { t: 0, shade: 1.05 },
  { t: 0.3, shade: 1 },
  { t: 0.65, shade: 0.52 },
  { t: 1, shade: 0.3 },
];
// The underside of a lip, from the scale below's tucked top out to the lip's edge: always in shadow.
const UNDER_SHADES = [0.3, 0.42];

// The trunk's centre line at `share` (0 at the foot, 1 at the crown): it rises straight and bends over near the
// top, a quadratic curve.
export function trunkPoint(share) {
  return new THREE.Vector3(LEAN * share * share, HEIGHT * share, 0);
}

// A point `radius` out from the centre line at `share`, `angle` round it, in the plane square to the line: `cos`
// along the way the lean bends, `sin` across it (z).
function sectionPoint(share, angle, radius) {
  const tangent = new THREE.Vector2(2 * LEAN * share, HEIGHT).normalize();
  const centre = trunkPoint(share);
  return [centre.x + tangent.y * Math.cos(angle) * radius, centre.y - tangent.x * Math.cos(angle) * radius, Math.sin(angle) * radius];
}

// 0 at a notch between two teeth, 1 at a tooth's lowest point: each tooth a rounded scallop (half a sine), sharp
// only at the notches; every other scale is turned half a tooth, so the teeth sit like a fish's scales.
function scallop(angle, scale) {
  const x = (angle * TEETH) / (2 * Math.PI) + 0.5 * (scale % 2);
  return Math.sin(Math.PI * (x - Math.floor(x)));
}

// A point on scale `scale`, from its lip (t = 0: flared out, its teeth hanging over the scale below) to its top
// (t = 1: tucked in under the next lip). The radius curves in like a bell, so each scale looks plump.
function scalePoint(scale, angle, t) {
  const lip = Math.max(0, (scale - 0.15 - 0.25 * scallop(angle, scale)) / SCALES);
  const share = lip + t * ((scale + 1.05) / SCALES - lip);
  const core = FOOT_RADIUS + (TOP_RADIUS - FOOT_RADIUS) * share;
  return sectionPoint(share, angle, core * (TUCK + (FLARE - TUCK) * (1 - t) ** 2));
}

// Returns the trunk, crown knob and coconuts as one geometry.
export function buildTrunk() {
  const parts = Array.from({ length: SCALES }, (_, scale) => buildScale(scale));
  const top = trunkPoint(1);
  parts.push(plain(new THREE.SphereGeometry(1, 10, 5).scale(0.45, 0.38, 0.45), top.x, top.y + 0.12, top.z, 0x7d7a34));
  for (let nut = 0; nut < 3; nut += 1) {
    const angle = (nut / 3) * 2 * Math.PI + 0.5;
    parts.push(plain(new THREE.SphereGeometry(0.22, 10, 5), top.x + Math.cos(angle) * 0.34, top.y - 0.3, top.z + Math.sin(angle) * 0.34, 0x6a4420));
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

// One scale: the underside of its lip (none on the first, which stands flat on y = 0), then its outside from the
// lip up. The lip's edge is two rows at the same place, one ending the underside and one starting the outside,
// so the edge stays sharp in the light rather than rounded over. Texture u runs once round, turned a whole number
// of teeth on each scale (so the bark does not repeat up the trunk) and half a tooth more on every other, so the
// teeth always fall at the same place in the picture.
function buildScale(scale) {
  const turn = (((scale * 3) % TEETH) + 0.5 * (scale % 2)) / TEETH;
  const rows = [];
  if (scale > 0) {
    rows.push({ point: (angle) => scalePoint(scale - 1, angle, 1), shade: UNDER_SHADES[0], v: BARK_UNDER_V });
    rows.push({ point: (angle) => scalePoint(scale, angle, 0), shade: UNDER_SHADES[1], v: BARK_LIP_V - 0.01, faceless: true });
  }
  for (const { t, shade } of ROWS) {
    rows.push({ point: (angle) => scalePoint(scale, angle, t), shade, v: BARK_LIP_V + t * (BARK_TOP_V - BARK_LIP_V) });
  }
  return gridGeometry(rows, turn);
}

// A tube of COLUMNS + 1 columns (the first and last at the same place, as the texture needs both) through
// `rows`; no faces between a row marked `faceless` and the next.
function gridGeometry(rows, turn) {
  const columns = COLUMNS + 1;
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  rows.forEach((row, rowIndex) => {
    for (let column = 0; column < columns; column += 1) {
      positions.push(...row.point((column / COLUMNS) * 2 * Math.PI));
      colors.push(row.shade, row.shade, row.shade);
      uvs.push(column / COLUMNS + turn, row.v);
      if (rowIndex > 0 && column < COLUMNS && !rows[rowIndex - 1].faceless) {
        const a = (rowIndex - 1) * columns + column;
        indices.push(a, a + columns, a + 1, a + 1, a + columns, a + columns + 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  joinSeam(geometry.attributes.normal, rows.length, columns);
  return geometry;
}

// A row's first and last column are the same line, so they get one shared normal, or a seam would show in the
// light.
function joinSeam(normals, rowCount, columns) {
  for (let row = 0; row < rowCount; row += 1) {
    const [first, last] = [row * columns, row * columns + columns - 1];
    const joined = new THREE.Vector3(normals.getX(first) + normals.getX(last), normals.getY(first) + normals.getY(last), normals.getZ(first) + normals.getZ(last)).normalize();
    normals.setXYZ(first, joined.x, joined.y, joined.z);
    normals.setXYZ(last, joined.x, joined.y, joined.z);
  }
}
