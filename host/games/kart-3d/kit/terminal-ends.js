// The terminal's round ends (M9), as the round pavilion with a blue dome at the end of the reference airport course's terminal
// in the reference game: at each end a drum of light glass, its outer half standing out past the end walls, framed by white
// mullions, belted at the hall's top by a coral and yellow band, under a blue rim and a low blue dome that rises
// over the roof. They break the long box's outline from the apron and from the air. Also the plant rooms on the
// roof. Returns shapes by part, as kit/terminal-body.js does.

import * as THREE from 'three';
import { at, between, coloured, roundedBox, roundedCylinder } from '../shape-utils.js';
import { BAND_TOP, HALL_TOP, PLINTH_TOP, UPPER_TOP } from './terminal-body.js';
import { ROOF_TOP } from './terminal-roof.js';
import { CORAL, SUN_YELLOW } from './terminal-maps.js';

const DRUM = { x: -12, inset: 4, radius: 11, mullions: 12 };
const ROOF_BLUE = 0x2a6fd6;
const WHITE = 0xf4f4f2;
// How far past the end walls the drums reach.
export const END_REACH = DRUM.radius - DRUM.inset;

export function buildTerminalEnds(length) {
  const parts = { painted: [], gloss: [], upperGlass: [] };
  for (const side of [-1, 1]) {
    const z = side * (length / 2 - DRUM.inset);
    // The outer half, toward the end: Three.js's cylinders start at +z, so the +z end's half starts a quarter back.
    const thetaStart = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    const half = (radius, height, y, segments = 24) => at(new THREE.CylinderGeometry(radius, radius, height, segments, 1, true, thetaStart, Math.PI), DRUM.x, y, z);
    parts.upperGlass.push(coloured(half(DRUM.radius, UPPER_TOP - PLINTH_TOP, (UPPER_TOP + PLINTH_TOP) / 2), 0xffffff));
    parts.gloss.push(coloured(half(DRUM.radius + 0.25, HALL_TOP + 1.2 - (HALL_TOP + 0.2), HALL_TOP + 0.7), CORAL));
    parts.gloss.push(coloured(half(DRUM.radius + 0.22, BAND_TOP - (HALL_TOP + 1.2), (BAND_TOP + HALL_TOP + 1.2) / 2), SUN_YELLOW));
    parts.painted.push(...buildMullions(z, side));
    parts.gloss.push(...buildDome(z));
  }
  parts.painted.push(...buildPlantRooms(length));
  return parts;
}

// White mullions round the drum's outer half, and white rings at its foot and at the floors.
function buildMullions(z, side) {
  const parts = [];
  for (let mullion = 0; mullion <= DRUM.mullions; mullion += 1) {
    // Round the outer half, as the drum's glass (buildTerminalEnds): the -z end's half is the +z end's turned round.
    const angle = -Math.PI / 2 + (mullion / DRUM.mullions) * Math.PI + (side > 0 ? 0 : Math.PI);
    const [x, dz] = [DRUM.x + Math.sin(angle) * (DRUM.radius + 0.1), Math.cos(angle) * (DRUM.radius + 0.1)];
    parts.push(coloured(between(roundedBox(0.3, 1, 0.3, 0.08, { chamfered: true }), [x, PLINTH_TOP, z + dz], [x, UPPER_TOP, z + dz]), WHITE));
  }
  for (const y of [PLINTH_TOP + 0.2, BAND_TOP + 0.15]) {
    const ring = new THREE.TorusGeometry(DRUM.radius + 0.12, 0.18, 6, 24, Math.PI).rotateX(Math.PI / 2).rotateY(side > 0 ? 0 : Math.PI);
    parts.push(coloured(at(ring, DRUM.x, y, z), WHITE));
  }
  return parts;
}

// The blue rim over the drum (as the roof's edge) and the low dome on it, with a white cap on top.
function buildDome(z) {
  const dome = new THREE.SphereGeometry(DRUM.radius + 0.4, 32, 8, 0, 2 * Math.PI, 0, Math.PI / 2).scale(1, 0.32, 1);
  return [
    coloured(at(roundedCylinder(DRUM.radius + 0.6, DRUM.radius + 0.6, ROOF_TOP - UPPER_TOP, 0.35, 32), DRUM.x, (ROOF_TOP + UPPER_TOP) / 2, z), ROOF_BLUE),
    coloured(at(dome, DRUM.x, ROOF_TOP, z), ROOF_BLUE),
    coloured(at(roundedCylinder(1.4, 1.6, 0.8, 0.2, 16), DRUM.x, ROOF_TOP + (DRUM.radius + 0.4) * 0.32 + 0.2, z), WHITE),
  ];
}

// Two white plant rooms on the roof's back, each with louvres along its front and a coral door.
function buildPlantRooms(length) {
  const parts = [];
  for (const z of [-length * 0.3, length * 0.3]) {
    parts.push(coloured(at(roundedBox(6, 3, 10, 0.3), -22, ROOF_TOP + 1.5, z), WHITE));
    parts.push(coloured(at(roundedBox(0.2, 2.1, 1.3, 0.06), -18.95, ROOF_TOP + 1.05, z + 3), CORAL));
    for (let louvre = 0; louvre < 5; louvre += 1) {
      parts.push(coloured(at(roundedBox(0.16, 0.14, 5, 0.05, { chamfered: true }), -18.95, ROOF_TOP + 1 + louvre * 0.32, z - 1.5), 0x9aa1aa));
    }
  }
  return parts;
}
