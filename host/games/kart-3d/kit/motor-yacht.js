// The kit's motor yacht (M7d4d), after the one on the reference seaside course's water: a white hull with a raised bow and a curved
// sheer line, a rail of posts round the foredeck, a cabin with big brown-framed windows and a lifebuoy on its side,
// a flybridge on the cabin's roof (motor-yacht-flybridge.js), and a flat transom with a swim platform. One geometry
// coloured per vertex, about 7.4 long (8 with the swim platform), facing +z, its waterline at y = 0. Takes the kit
// and returns the parts, [{ geometry, material }]. Used by the seaside surroundings.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedBox } from '../shape-utils.js';
import { deckHeight, hullBand, hullDeck, hullTransom, hullWidthAt } from './boat-hull.js';
import { evenPoints, railAlong } from './boat-rails.js';
import { buildFlybridge } from './motor-yacht-flybridge.js';

export const YACHT_HULL = Object.freeze({ length: 7.4, beam: 1.25, keel: -0.7, deck: 0.85, bowRise: 0.55, sternRise: 0.05 });
// The cabin: its length, width and height, and the z of its front face; it stands on the deck.
export const CABIN = Object.freeze({ length: 3.8, width: 2, height: 1.15, front: 1.1 });

const WHITE = 0xf8f8f4;
const TEAK = 0xc89c68;
const BROWN = 0x6b4226;
const GLASS = 0x1c2c40;
const RAIL = 0xe8e8e2;

export function buildMotorYacht({ keep }) {
  const yacht = mergeShapes([
    ...hull(),
    ...cabin(),
    ...windows(),
    ...lifebuoy(),
    ...foredeckRail(),
    ...sternRail(),
    ...swimPlatform(),
    ...buildFlybridge(cabinTop()),
  ]);
  const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
  return [{ geometry: keep(yacht), material }];
}

const cabinBase = () => deckHeight(YACHT_HULL, CABIN.front - CABIN.length / 2);
const cabinTop = () => cabinBase() + CABIN.height + 0.05;
const cabinMiddleZ = CABIN.front - CABIN.length / 2;

function hull() {
  return [
    hullBand(YACHT_HULL, YACHT_HULL.keel, -0.05, 0x203a66),
    hullBand(YACHT_HULL, -0.05, 0.2, 0x2a62c9),
    hullBand(YACHT_HULL, 0.2, 2, WHITE),
    hullTransom(YACHT_HULL, WHITE),
    hullDeck(YACHT_HULL, TEAK),
  ];
}

// The cabin box with a roof slab that overhangs it a little.
function cabin() {
  const base = cabinBase();
  return [
    coloured(at(roundedBox(CABIN.width, CABIN.height, CABIN.length, 0.15), 0, base + CABIN.height / 2, cabinMiddleZ), WHITE),
    coloured(at(roundedBox(CABIN.width + 0.15, 0.1, CABIN.length + 0.15, 0.05), 0, base + CABIN.height, cabinMiddleZ), WHITE),
  ];
}

// Big windows along both sides and across the front, each a dark pane in a brown frame.
function windows() {
  const middle = cabinBase() + 0.6;
  const parts = [];
  for (const side of [1, -1]) {
    for (const z of [-2, -0.75]) {
      parts.push(coloured(at(roundedBox(0.08, 0.62, 1.1, 0.03), side * (CABIN.width / 2), middle, z), BROWN));
      parts.push(coloured(at(roundedBox(0.1, 0.46, 0.94, 0.03), side * (CABIN.width / 2 + 0.01), middle, z), GLASS));
    }
  }
  parts.push(coloured(at(roundedBox(1.75, 0.6, 0.08, 0.03), 0, middle, CABIN.front), BROWN));
  parts.push(coloured(at(roundedBox(1.6, 0.44, 0.1, 0.03), 0, middle, CABIN.front + 0.01), GLASS));
  return parts;
}

// A lifebuoy on each side of the cabin: a red ring with four white bands, standing against the wall.
function lifebuoy() {
  const parts = [];
  for (const side of [1, -1]) {
    const place = (geometry) => at(geometry.rotateY(Math.PI / 2), side * (CABIN.width / 2 + 0.03), cabinBase() + 0.6, 0.5);
    parts.push(coloured(place(new THREE.TorusGeometry(0.22, 0.07, 6, 16)), 0xd8321f));
    for (let band = 0; band < 4; band += 1) {
      const arc = new THREE.TorusGeometry(0.22, 0.075, 6, 4, Math.PI / 6).rotateZ((band * Math.PI) / 2 + Math.PI / 6);
      parts.push(coloured(place(arc), 0xfdfbf2));
    }
  }
  return parts;
}

// Where the deck's edge is at `z` on `side`, set in a little: a point for a rail to stand on.
function edge(z, side) {
  const y = deckHeight(YACHT_HULL, z);
  return [side * (hullWidthAt(YACHT_HULL, z, y) - 0.07), y, z];
}

// The rail of posts round the foredeck, along both sides and meeting at the bow.
function foredeckRail() {
  return [1, -1].flatMap((side) => {
    const path = Array.from({ length: 9 }, (_, step) => edge(0.9 + step * 0.33, side));
    return railAlong(path, 0.32, RAIL, [1, 0.55]);
  });
}

// The rail round the aft deck, behind the cabin: along both sides and across the stern.
function sternRail() {
  const back = YACHT_HULL.length / -2 + 0.15;
  const corners = [edge(cabinMiddleZ - CABIN.length / 2, 1), edge(back, 1), edge(back, -1), edge(cabinMiddleZ - CABIN.length / 2, -1)];
  const path = corners.slice(1).flatMap((corner, leg) => evenPoints(corners[leg], corner, leg === 1 ? 4 : 2).slice(leg === 0 ? 0 : 1));
  return railAlong(path, 0.34, RAIL, [1, 0.55]);
}

// The swim platform: a low teak step behind the transom, on a white rim.
function swimPlatform() {
  const z = YACHT_HULL.length / -2 - 0.25;
  return [
    coloured(at(roundedBox(1.7, 0.1, 0.56, 0.04), 0, 0.14, z), TEAK),
    coloured(at(roundedBox(1.74, 0.04, 0.6, 0.02), 0, 0.07, z), WHITE),
  ];
}
