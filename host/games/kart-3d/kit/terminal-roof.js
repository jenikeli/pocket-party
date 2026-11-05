// The terminal's roof (M9): the fat blue roof edge, the standing-seam roof on it, a long glass skylight down its
// middle, the machines at the back, flags along the front edge, and the airport's sign standing on struts: its
// letters are a picture cut out of a clear background (kit/terminal-pictures.js), layered a few times one behind
// the other, the back ones dark, so from the side they read as thick letters for a few triangles. Returns shapes
// by part, as kit/terminal-body.js does.

import * as THREE from 'three';
import { at, between, coloured, roundedBox, roundedCylinder } from '../shape-utils.js';
import { BACK, UPPER_TOP } from './terminal-body.js';
import { CORAL, SUN_YELLOW } from './terminal-maps.js';
import { SIGN_ASPECT } from './terminal-pictures.js';
import { projectUv } from './terminal-uv.js';

const EDGE_HEIGHT = 1.7;
const EDGE_FRONT = 0.4;
export const ROOF_TOP = UPPER_TOP + EDGE_HEIGHT;
const ROOF_BLUE = 0x2a6fd6;
const STEEL = 0xb8bec6;
const SKYLIGHT = { x: -14, width: 9, rise: 2.8 };
const SIGN = { x: -5, height: 10, lift: 2.4, layers: 5, layerGap: 0.08 };
const FLAG_EVERY = 20;

export function buildTerminalRoof(length) {
  const edge = coloured(at(roundedBox(EDGE_FRONT - BACK + 0.6, EDGE_HEIGHT, length + 1.6, 0.4), (EDGE_FRONT + BACK - 0.6) / 2, UPPER_TOP + EDGE_HEIGHT / 2, 0), ROOF_BLUE);
  const trim = coloured(at(roundedBox(EDGE_FRONT - BACK + 0.8, 0.3, length + 1.8, 0.12), (EDGE_FRONT + BACK - 0.6) / 2, UPPER_TOP + 0.1, 0), 0xf4f4f2);
  const roof = new THREE.PlaneGeometry(-BACK - 0.2, length + 0.8).rotateX(-Math.PI / 2);
  return {
    gloss: [edge, ...buildFlags(length, 'cloth')],
    painted: [trim, ...buildSkylightTrim(length), ...buildMachines(length), ...buildFlags(length, 'poles'), ...buildSignStruts()],
    roof: [projectUv(coloured(at(roof, BACK / 2, ROOF_TOP + 0.01, 0), 0xffffff), 4)],
    skylight: [buildSkylight(length)],
    sign: buildSignLayers(),
  };
}

// The skylight: a long glass ridge with its ends closed, as an indexed shape with its own corners per face so
// each face is flat. Its map's panes run along it (u along z) and up its slopes.
function buildSkylight(length) {
  const half = length * 0.35;
  const [left, right, top] = [SKYLIGHT.x - SKYLIGHT.width / 2, SKYLIGHT.x + SKYLIGHT.width / 2, ROOF_TOP + SKYLIGHT.rise];
  const slope = Math.hypot(SKYLIGHT.width / 2, SKYLIGHT.rise);
  const faces = [
    // Each face: its corners [x, y, z] and their [u, v].
    [[[right, ROOF_TOP, half], [right, ROOF_TOP, -half], [SKYLIGHT.x, top, -half], [SKYLIGHT.x, top, half]], [[0, 0], [2 * half, 0], [2 * half, slope], [0, slope]]],
    [[[left, ROOF_TOP, -half], [left, ROOF_TOP, half], [SKYLIGHT.x, top, half], [SKYLIGHT.x, top, -half]], [[0, 0], [2 * half, 0], [2 * half, slope], [0, slope]]],
    [[[left, ROOF_TOP, half], [right, ROOF_TOP, half], [SKYLIGHT.x, top, half]], [[0, 0], [SKYLIGHT.width, 0], [SKYLIGHT.width / 2, SKYLIGHT.rise]]],
    [[[right, ROOF_TOP, -half], [left, ROOF_TOP, -half], [SKYLIGHT.x, top, -half]], [[0, 0], [SKYLIGHT.width, 0], [SKYLIGHT.width / 2, SKYLIGHT.rise]]],
  ];
  const positions = [];
  const uvs = [];
  const index = [];
  for (const [corners, cornerUvs] of faces) {
    const first = positions.length / 3;
    corners.forEach((corner, cornerIndex) => {
      positions.push(...corner);
      uvs.push(cornerUvs[cornerIndex][0] / 4, cornerUvs[cornerIndex][1] / 4);
    });
    index.push(first, first + 1, first + 2);
    if (corners.length === 4) {
      index.push(first, first + 2, first + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return coloured(geometry, 0xffffff);
}

// A white curb round the skylight's foot and a cap along its ridge.
function buildSkylightTrim(length) {
  const half = length * 0.35;
  const curb = (x) => coloured(at(roundedBox(0.5, 0.5, 2 * half + 0.5, 0.12, { chamfered: true }), x, ROOF_TOP + 0.2, 0), 0xf4f4f2);
  const ridge = coloured(between(roundedBox(0.35, 1, 0.35, 0.1, { chamfered: true }), [SKYLIGHT.x, ROOF_TOP + SKYLIGHT.rise + 0.05, -half], [SKYLIGHT.x, ROOF_TOP + SKYLIGHT.rise + 0.05, half]), 0xf4f4f2);
  return [curb(SKYLIGHT.x - SKYLIGHT.width / 2), curb(SKYLIGHT.x + SKYLIGHT.width / 2), ridge];
}

// Air-conditioning units along the roof's back, each with a fan on top.
function buildMachines(length) {
  const parts = [];
  for (let z = -length * 0.4; z <= length * 0.4; z += length * 0.16) {
    parts.push(coloured(at(roundedBox(3, 1.4, 2.4, 0.2), BACK + 4, ROOF_TOP + 0.7, z), 0xc8ccd2));
    parts.push(coloured(at(roundedCylinder(0.8, 0.8, 0.14, 0.04, 16), BACK + 4, ROOF_TOP + 1.45, z), 0x3a3f46));
  }
  return parts;
}

// Flags along the roof's front edge: 'poles' gives the poles and their balls, 'cloth' the flags, coral and yellow
// in turn, rippling as in a steady breeze from -z.
function buildFlags(length, kind) {
  const parts = [];
  let count = 0;
  for (let z = -length / 2 + FLAG_EVERY / 2; z < length / 2; z += FLAG_EVERY, count += 1) {
    const x = EDGE_FRONT - 0.6;
    if (kind === 'poles') {
      parts.push(coloured(at(roundedCylinder(0.09, 0.1, 5.5, 0.03, 6), x, ROOF_TOP + 2.75, z), STEEL));
      parts.push(coloured(at(new THREE.SphereGeometry(0.18, 8, 6), x, ROOF_TOP + 5.55, z), STEEL));
    } else {
      const cloth = new THREE.BoxGeometry(0.05, 1.6, 2.6, 1, 1, 8);
      const { position } = cloth.attributes;
      for (let index = 0; index < position.count; index += 1) {
        const along = position.getZ(index) + 1.3;
        position.setX(index, position.getX(index) + Math.sin(along * 2.2) * 0.12 * along);
      }
      cloth.computeVertexNormals();
      parts.push(coloured(at(cloth, x, ROOF_TOP + 4.6, z + 1.4), count % 2 === 0 ? SUN_YELLOW : CORAL));
    }
  }
  return parts;
}

// The sign's letters, SIGN.layers planes one behind the other: the front one in the picture's own colours, the
// rest darkened to the letters' sides.
function buildSignLayers() {
  const width = SIGN.height * SIGN_ASPECT;
  return Array.from({ length: SIGN.layers }, (_, layer) => {
    const plane = new THREE.PlaneGeometry(width, SIGN.height).rotateY(Math.PI / 2);
    return coloured(at(plane, SIGN.x - layer * SIGN.layerGap, ROOF_TOP + SIGN.lift + SIGN.height / 2, 0), layer === 0 ? 0xffffff : 0x3d5a8a);
  });
}

// Four posts behind the sign, braced by a rail, on foot plates on the roof.
function buildSignStruts() {
  const x = SIGN.x - SIGN.layers * SIGN.layerGap - 0.2;
  const top = ROOF_TOP + SIGN.lift + SIGN.height * 0.7;
  const posts = [-15, -5, 5, 15].flatMap((z) => [
    coloured(at(roundedCylinder(0.14, 0.14, top - ROOF_TOP, 0.04, 8), x, (top + ROOF_TOP) / 2, z), STEEL),
    coloured(at(roundedBox(0.8, 0.12, 0.8, 0.04, { chamfered: true }), x, ROOF_TOP + 0.06, z), STEEL),
  ]);
  const rail = coloured(between(new THREE.CylinderGeometry(0.1, 0.1, 1, 8), [x, ROOF_TOP + SIGN.lift + 2, -17], [x, ROOF_TOP + SIGN.lift + 2, 17]), STEEL);
  return [...posts, rail];
}

// How high the sign's top stands, for the terminal's height.
export const SIGN_TOP = ROOF_TOP + SIGN.lift + SIGN.height;
