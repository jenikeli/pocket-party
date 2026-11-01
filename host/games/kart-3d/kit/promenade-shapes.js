// The shapes of the promenade railing (M7d4c3), the toy-proportioned posts and stone pillars of Daisy Circuit's
// seafront (docs/mk8dx-reference.md, "The kit's objects up close"): a fat blue post with a flared foot, collars and
// a big ball on top; a stone pillar of a plinth, a block shaft and an overhanging cap; the plaque's disc and rim;
// and the lantern that stands on every other pillar. Each is modelled standing on y = 0, the road along z. Drawing
// only, no canvas needed, so the unit tests can check them. Used by kit/promenade-rail.js.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedBox, roundedCylinder, wrapUv } from '../shape-utils.js';

export const IRON = 0x3a6fc8;
const DARK_IRON = 0x2b4f94;
const BRASS = 0xd8b04a;
// The pillar: its width (square), the heights of its plinth and its shaft, and the cap slab's.
export const PILLAR = { width: 0.7, plinth: 0.2, shaft: 1.3, cap: 0.14 };
export const PILLAR_TOP = PILLAR.plinth + PILLAR.shaft + PILLAR.cap + 0.1;
// How far the pillar's widest part (the cap slab) reaches from its middle, across the road.
export const PILLAR_REACH = (PILLAR.width + 0.18) / 2;
export const PLAQUE_RADIUS = 0.2;
const TRIM = { plinth: 0xa88458, cap: 0xe6cca0 };
const GLASS_WIDTH = 0.2;
const GLASS_HEIGHT = 0.3;
const LANTERN_FLOOR = PILLAR_TOP + 0.26;

// An iron post about twice as fat as M7d4a's: a flared foot with a step, a shaft with a collar under the top rail,
// a neck and a ball twice the shaft's width.
export function buildPost() {
  return mergeShapes([
    coloured(at(roundedCylinder(0.12, 0.155, 0.14, 0.03, 12), 0, 0.07, 0), IRON),
    coloured(at(roundedCylinder(0.1, 0.12, 0.06, 0.02, 12), 0, 0.17, 0), IRON),
    coloured(at(roundedCylinder(0.08, 0.088, 0.95, 0.015, 10), 0, 0.6, 0), IRON),
    coloured(at(roundedCylinder(0.115, 0.115, 0.07, 0.02, 12), 0, 0.78, 0), IRON),
    coloured(at(roundedCylinder(0.105, 0.105, 0.05, 0.015, 12), 0, 1.06, 0), IRON),
    coloured(at(new THREE.SphereGeometry(0.15, 12, 8), 0, 1.16, 0), IRON),
  ]);
}

// The pillar's shaft, a plain square block wrapped for the block texture (kit/promenade-detail.js).
export function buildPillarShaft() {
  const { width, plinth, shaft } = PILLAR;
  return wrapUv(at(roundedBox(width, shaft, width, 0.04), 0, plinth + shaft / 2, 0), plinth, shaft);
}

// The pillar's plinth in two steps and its cap slab and top block, coloured per vertex; the shaft stands between.
export function buildPillarTrim() {
  const { width, plinth, shaft, cap } = PILLAR;
  const slabMiddle = plinth + shaft + cap / 2;
  return mergeShapes([
    coloured(at(roundedBox(width + 0.14, 0.12, width + 0.14, 0.03), 0, 0.06, 0), TRIM.plinth),
    coloured(at(roundedBox(width + 0.06, 0.08, width + 0.06, 0.025), 0, 0.16, 0), TRIM.plinth),
    coloured(at(roundedBox(width + 0.18, cap, width + 0.18, 0.045), 0, slabMiddle, 0), TRIM.cap),
    coloured(at(roundedBox(width - 0.14, 0.1, width - 0.14, 0.03), 0, plinth + shaft + cap + 0.05, 0), TRIM.cap),
  ]);
}

// The plaques' faces, a disc on each face across the road, carrying the flower in maps: texture coordinates
// cover the disc, which is how a circle is made.
export function buildPlaqueDiscs() {
  const middle = PILLAR.plinth + PILLAR.shaft * 0.55;
  return mergeShapes(
    [-1, 1].map((face) => at(new THREE.CircleGeometry(PLAQUE_RADIUS, 28).rotateY((face * Math.PI) / 2), face * (PILLAR.width / 2 + 0.014), middle, 0)),
  );
}

// The plaques' raised brass rims, standing out from the disc.
export function buildPlaqueRims() {
  const middle = PILLAR.plinth + PILLAR.shaft * 0.55;
  return mergeShapes(
    [-1, 1].map((face) => coloured(at(new THREE.TorusGeometry(PLAQUE_RADIUS - 0.012, 0.026, 6, 28).rotateY(Math.PI / 2), face * (PILLAR.width / 2 + 0.018), middle, 0), BRASS)),
  );
}

// The lantern's iron: a short post on a flared foot, a base plate, four corner frames, a top ring, a pyramid roof
// and a finial.
export function buildLanternIron() {
  const frame = GLASS_WIDTH / 2 + 0.012;
  const bodyMiddle = LANTERN_FLOOR + 0.02 + GLASS_HEIGHT / 2;
  const top = LANTERN_FLOOR + 0.02 + GLASS_HEIGHT;
  const corners = [-1, 1].flatMap((x) => [-1, 1].map((z) => coloured(at(roundedBox(0.04, GLASS_HEIGHT + 0.02, 0.04, 0.012, { chamfered: true }), x * frame, bodyMiddle, z * frame), DARK_IRON)));
  return mergeShapes([
    coloured(at(roundedCylinder(0.07, 0.1, 0.08, 0.02, 10), 0, PILLAR_TOP + 0.04, 0), DARK_IRON),
    coloured(at(roundedCylinder(0.03, 0.04, LANTERN_FLOOR - PILLAR_TOP - 0.06, 0.008, 8), 0, (PILLAR_TOP + LANTERN_FLOOR) / 2 + 0.01, 0), DARK_IRON),
    coloured(at(roundedBox(0.3, 0.04, 0.3, 0.012, { chamfered: true }), 0, LANTERN_FLOOR + 0.01, 0), DARK_IRON),
    ...corners,
    coloured(at(roundedBox(0.3, 0.04, 0.3, 0.012, { chamfered: true }), 0, top + 0.01, 0), DARK_IRON),
    coloured(at(new THREE.ConeGeometry(0.25, 0.2, 4).rotateY(Math.PI / 4), 0, top + 0.13, 0), DARK_IRON),
    coloured(at(new THREE.SphereGeometry(0.04, 8, 6), 0, top + 0.25, 0), DARK_IRON),
  ]);
}

// The lantern's four panes of glass, set in the frames (one box, seen through from every side).
export function buildLanternGlass() {
  return at(new THREE.BoxGeometry(GLASS_WIDTH, GLASS_HEIGHT, GLASS_WIDTH), 0, LANTERN_FLOOR + 0.02 + GLASS_HEIGHT / 2, 0);
}
