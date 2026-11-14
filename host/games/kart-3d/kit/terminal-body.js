// The terminal's body (M9), after the reference airport course's: a concrete plinth; the hall's dark glass curtain
// wall leaning out toward the apron, framed by thin mullions and fat piers; the coloured band over it; a walkway
// on the band with a railing; the upper storey's light glass set back behind it; and the clad walls round the
// back and ends. The building faces +x from x = 0 (the foot of the hall's glass), runs along z, and stands on
// y = 0. Returns its shapes by part, { partName: [geometry] }, for kit/terminal.js to give each part its material.

import * as THREE from 'three';
import { at, between, coloured, roundedBox, shaded } from '../shape-utils.js';
import { railing } from './grandstand-steel.js';
import { projectUv } from './terminal-uv.js';
import { BAND_HEIGHT, BAND_PERIOD } from './terminal-maps.js';

export const PLINTH_TOP = 0.8;
// The hall's glass leans out this far at its top, as the band above overhangs it.
const HALL_LEAN = 1.2;
export const HALL_TOP = 9;
const BAND_FRONT = 2.4;
export const BAND_TOP = HALL_TOP + BAND_HEIGHT;
const UPPER_FRONT = -2;
const UPPER_LEAN = 0.8;
export const UPPER_TOP = 17.5;
// How far back the building reaches, and how deep the hall is behind its glass.
export const BACK = -27;
export const HALL_BACK = -14;
const WHITE = 0xf4f4f2;
const PIER_GREY = 0xd9dde2;
const CLADDING_TILE = [4, 3];

// x of a glass wall leaning from (foot, bottom) to (foot + lean, top), at height y.
const leanAt = (foot, lean, bottom, top, y) => foot + (lean * (y - bottom)) / (top - bottom);

export function buildTerminalBody(length) {
  return {
    concrete: [buildPlinth(length)],
    cladding: buildCladWalls(length),
    painted: [...buildHallFrame(length), ...buildUpperFrame(length), ...buildWalkway(length)],
    lowerGlass: [glassPane(length, 0, HALL_LEAN, PLINTH_TOP, HALL_TOP)],
    upperGlass: [glassPane(length, UPPER_FRONT, UPPER_LEAN, BAND_TOP, UPPER_TOP), ...buildBackWindows(length)],
    band: [buildBandFace(length)],
  };
}

function buildPlinth(length) {
  const plinth = coloured(at(roundedBox(BAND_FRONT - BACK + 0.4, PLINTH_TOP, length + 1.2, 0.2), (BAND_FRONT + BACK) / 2, PLINTH_TOP / 2, 0), 0xe4e0d6);
  return projectUv(plinth, 8);
}

// A box from (x1, y1) to (x2, y2) along the whole length (or `depth` long at `z`), clad, in `hex`, a little
// darker toward its foot, where less of the sky reaches it.
function cladBox([x1, y1], [x2, y2], depth, z, hex) {
  const box = coloured(at(new THREE.BoxGeometry(x2 - x1, y2 - y1, depth), (x1 + x2) / 2, (y1 + y2) / 2, z), hex);
  return projectUv(shaded(box, (x, y) => 0.85 + 0.15 * Math.min((y - y1) / 4, 1)), ...CLADDING_TILE);
}

// The solid parts round the glass: the hall's back wall (its face is the wall seen inside), the floors behind
// the band and the upper glass, and the hall's two end walls.
function buildCladWalls(length) {
  const endZ = length / 2 - 0.6;
  return [
    cladBox([BACK, PLINTH_TOP], [HALL_BACK, HALL_TOP], length, 0, 0xf6efe2),
    cladBox([BACK, HALL_TOP], [-3, BAND_TOP], length, 0, 0xffffff),
    cladBox([BACK, BAND_TOP], [UPPER_FRONT - 0.1, UPPER_TOP], length, 0, 0xffffff),
    ...[-endZ, endZ].map((z) => cladBox([HALL_BACK, PLINTH_TOP], [HALL_LEAN + 0.5, HALL_TOP], 1.2, z, 0xffffff)),
  ];
}

// One wall of glass along the whole length, its foot at x = `foot` and y = `bottom`, leaning out `lean` by y =
// `top`, facing +x.
function glassPane(length, foot, lean, bottom, top) {
  const pane = new THREE.PlaneGeometry(length - 1.2, Math.hypot(top - bottom, lean)).rotateY(Math.PI / 2);
  pane.rotateZ(-Math.atan2(lean, top - bottom));
  return coloured(at(pane, foot + lean / 2, (bottom + top) / 2, 0), 0xffffff);
}

// The hall's glass framed: a fat pier every band period (where the band's pattern repeats), a thin mullion every
// 4 units between, and two transoms along it, all leaning with the glass.
function buildHallFrame(length) {
  const parts = [];
  const lean = (y) => leanAt(0, HALL_LEAN, PLINTH_TOP, HALL_TOP, y);
  for (let z = -length / 2 + 4; z < length / 2 - 2; z += 4) {
    const pier = Math.round((z + length / 2) / 4) % (BAND_PERIOD / 4) === 0;
    const [shape, out, hex] = pier ? [roundedBox(1.1, 1, 0.8, 0.18), 0.5, PIER_GREY] : [roundedBox(0.2, 1, 0.22, 0.05, { chamfered: true }), 0.1, WHITE];
    parts.push(coloured(between(shape, [lean(PLINTH_TOP) + out, PLINTH_TOP, z], [lean(HALL_TOP) + out, HALL_TOP, z]), hex));
  }
  for (const y of [PLINTH_TOP + 0.15, 3.6, 6.3]) {
    parts.push(coloured(between(roundedBox(0.24, 1, 0.2, 0.06, { chamfered: true }), [lean(y) + 0.12, y, -length / 2 + 0.6], [lean(y) + 0.12, y, length / 2 - 0.6]), WHITE));
  }
  return parts;
}

// The upper storey's glass framed: a mullion every 4 units and a transom halfway up.
function buildUpperFrame(length) {
  const parts = [];
  const lean = (y) => leanAt(UPPER_FRONT, UPPER_LEAN, BAND_TOP, UPPER_TOP, y);
  for (let z = -length / 2 + 2; z < length / 2 - 1; z += 4) {
    parts.push(coloured(between(roundedBox(0.24, 1, 0.24, 0.06, { chamfered: true }), [lean(BAND_TOP) + 0.1, BAND_TOP, z], [lean(UPPER_TOP) + 0.1, UPPER_TOP, z]), WHITE));
  }
  const y = (BAND_TOP + UPPER_TOP) / 2;
  parts.push(coloured(between(roundedBox(0.22, 1, 0.2, 0.06, { chamfered: true }), [lean(y) + 0.1, y, -length / 2], [lean(y) + 0.1, y, length / 2]), WHITE));
  return parts;
}

// The band as a rounded white box over the hall's glass (its front face carries the band's map, buildBandFace),
// the walkway's floor on it and a railing along the walkway's edge.
function buildWalkway(length) {
  const band = coloured(at(roundedBox(BAND_FRONT + 3, BAND_HEIGHT, length + 0.4, 0.12), (BAND_FRONT - 3) / 2, HALL_TOP + BAND_HEIGHT / 2, 0), WHITE);
  const floor = coloured(at(roundedBox(BAND_FRONT - UPPER_FRONT + 0.2, 0.12, length, 0.04), (BAND_FRONT + UPPER_FRONT) / 2, BAND_TOP + 0.04, 0), 0xb8bec6);
  return [band, floor, ...railing([BAND_FRONT - 0.25, BAND_TOP, -length / 2 + 0.3], [BAND_FRONT - 0.25, BAND_TOP, length / 2 - 0.3], 1.1, 1.6)];
}

// The band's front face, just proud of its box, its map repeating every band period along the terminal.
function buildBandFace(length) {
  const face = new THREE.PlaneGeometry(length + 0.2, BAND_HEIGHT).rotateY(Math.PI / 2);
  const { uv } = face.attributes;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setX(index, (uv.getX(index) * (length + 0.2)) / BAND_PERIOD);
  }
  return coloured(at(face, BAND_FRONT + 0.03, HALL_TOP + BAND_HEIGHT / 2, 0), 0xffffff);
}

// Long windows round the upper storey's back, seen from the far side of the course.
function buildBackWindows(length) {
  const strip = new THREE.BoxGeometry(0.2, 2.6, length - 8);
  return [coloured(at(strip, BACK - 0.05, (BAND_TOP + UPPER_TOP) / 2, 0), 0xffffff)];
}
