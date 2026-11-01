// The kit's sailboat (M7d3; M7d4d rebuilt): a lofted white hull with a blue stripe at the waterline, a wooden deck
// with a rail round it, portholes and a line of fenders along the side, a small cabin with windows, a mast with a
// boom, and a mainsail and a jib. One geometry coloured per vertex (the sails are flat, so its material is seen
// from both sides), about 6 long, facing +z, its waterline at y = 0. Takes the kit and returns the parts,
// [{ geometry, material }]. Used by the seaside surroundings.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes, roundedBox } from '../shape-utils.js';
import { deckHeight, hullBand, hullDeck, hullTransom, hullWidthAt } from './boat-hull.js';
import { evenPoints, railAlong } from './boat-rails.js';

export const SAILBOAT_HULL = Object.freeze({ length: 6, beam: 1.05, keel: -0.8, deck: 0.62, bowRise: 0.3, sternRise: 0.05 });

const WHITE = 0xf6f6f2;
const BLUE = 0x2a62c9;
const DARK = 0x2a4050;
const PORTHOLE_Z = [-1.9, -1.2, -0.5, 1.2, 1.9];
const FENDER_Z = [-1.55, -0.85, 0.85, 1.55];
const MAST_Z = 0.6;

export function buildSailboat({ keep }) {
  const deckAtMast = deckHeight(SAILBOAT_HULL, MAST_Z);
  const boat = mergeShapes([
    ...hull(),
    ...cabin(),
    ...portholes(),
    ...fenders(),
    ...lifelines(),
    coloured(at(new THREE.CylinderGeometry(0.06, 0.08, 6.4, 6), 0, deckAtMast + 3.2, MAST_Z), 0xd8d8d0),
    coloured(between(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), [0, 1.7, MAST_Z], [0, 1.7, -2.2]), 0xd8d8d0),
    coloured(sail([0, 1.85, 0.55], [0, 6.7, 0.55], [0, 1.85, -2.1]), 0xfdfbf2),
    coloured(sail([0, 6.2, 0.75], [0, 1.3, 2.7], [0, 1.3, 0.75]), 0xffd6a0),
  ]);
  const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide }));
  return [{ geometry: keep(boat), material }];
}

function hull() {
  return [
    hullBand(SAILBOAT_HULL, SAILBOAT_HULL.keel, -0.1, 0x203a66),
    hullBand(SAILBOAT_HULL, -0.1, 0.3, BLUE),
    hullBand(SAILBOAT_HULL, 0.3, 1.2, WHITE),
    hullTransom(SAILBOAT_HULL, WHITE),
    hullDeck(SAILBOAT_HULL, 0xc89c68),
  ];
}

// The cabin and its strip of windows, standing on the deck behind the mast.
function cabin() {
  const base = deckHeight(SAILBOAT_HULL, -0.6);
  return [
    coloured(at(roundedBox(1.2, 0.6, 1.6, 0.12), 0, base + 0.3, -0.6), WHITE),
    coloured(at(roundedBox(1.22, 0.22, 1.1, 0.06), 0, base + 0.4, -0.6), DARK),
  ];
}

// A round dark window with a pale rim, set into the hull's white side above the blue stripe.
function portholes() {
  const parts = [];
  for (const z of PORTHOLE_Z) {
    for (const side of [1, -1]) {
      const x = side * hullWidthAt(SAILBOAT_HULL, z, 0.46);
      const rim = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10).rotateZ(Math.PI / 2);
      const glass = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10).rotateZ(Math.PI / 2);
      parts.push(coloured(at(rim, x, 0.46, z), 0xb8bcc0), coloured(at(glass, x + side * 0.01, 0.46, z), DARK));
    }
  }
  return parts;
}

// Blue fenders hanging over the side between the portholes.
function fenders() {
  return FENDER_Z.flatMap((z) => [1, -1].map((side) => {
    const x = side * (hullWidthAt(SAILBOAT_HULL, z, 0.4) + 0.07);
    return coloured(at(new THREE.CapsuleGeometry(0.065, 0.2, 2, 6), x, 0.4, z), BLUE);
  }));
}

// Lifelines along both sides of the deck, closing round the stern.
function lifelines() {
  const spec = SAILBOAT_HULL;
  const edge = (z, side) => [side * (hullWidthAt(spec, z, deckHeight(spec, z)) - 0.08), deckHeight(spec, z), z];
  const sides = [1, -1].flatMap((side) => {
    const path = Array.from({ length: 9 }, (_, step) => edge(-2.7 + step * 0.65, side));
    return railAlong(path, 0.4, 0xd8d8d0);
  });
  return [...sides, ...railAlong(evenPoints(edge(-2.7, 1), edge(-2.7, -1), 2), 0.4, 0xd8d8d0)];
}

// A flat three-cornered sail, indexed with a normal and texture coordinates like Three.js's shapes, so it merges
// with them.
function sail(a, b, c) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 0], 2));
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();
  return geometry;
}
