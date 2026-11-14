// The apron's small wheeled things (M9 task J), after the reference airport course: the baggage train (a coral tug
// pulling three carts of suitcases), the ULD dolly (two grey freight containers on blue dollies) and the
// follow-me car (a yellow chequered airport car with a lit "FOLLOW ME" board). Chunky and soft like the game's.
// Each builder takes the kit and returns its painted shape, [{ geometry, material }] (the car adds its board);
// facing +z, centred on its middle. Used by kit/props.js.

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { PAINT, box, wheelSets, rod } from './airport-vehicle-parts.js';
import { createSignTexture } from './hangar-maps.js';

const SUITCASE_COLOURS = [PAINT.coral, PAINT.navy, PAINT.yellow, 0x1f9e6e, PAINT.blue];

function painted(kit, shapes) {
  return { geometry: kit.keep(mergeShapes(shapes)), material: kit.materials.painted };
}

// The tug at the head of the train: a fat coral body with a seat, a windscreen, a roof on posts and a hitch.
function tug(z) {
  return [
    box(PAINT.darkGrey, [1.3, 0.3, 2.1], [0, 0.55, z], 0.1),
    box(PAINT.coral, [1.5, 0.7, 2.1], [0, 0.95, z], 0.15),
    box(PAINT.navy, [1.1, 0.35, 0.7], [0, 1.45, z - 0.5], 0.1),
    box(PAINT.glass, [1.2, 0.55, 0.08], [0, 1.6, z + 0.35], 0.02),
    ...[-1, 1].flatMap((side) => [-0.2, 0.35].map((back) => rod(PAINT.darkGrey, [side * 0.6, 1.2, z + back], [side * 0.6, 2.1, z + back], 0.06))),
    box(PAINT.white, [1.6, 0.14, 1.4], [0, 2.15, z + 0.1], 0.06),
    box(PAINT.orange, [0.4, 0.12, 0.25], [0, 2.3, z + 0.1], 0.04),
    box(PAINT.yellow, [1.55, 0.25, 0.2], [0, 0.6, z + 1.05], 0.08),
    ...wheelSets([z - 0.65, z + 0.65], 0.7, 0.4, 0.3, true),
  ];
}

// A baggage cart: a blue bed with a fat navy rim, three suitcases of the airlines' colours with a handle each,
// and a draw bar at the front.
function cart(z, seed) {
  const cases = [-0.45, 0.1, 0.55].flatMap((x, index) => {
    const colour = SUITCASE_COLOURS[(seed + index) % SUITCASE_COLOURS.length];
    const [height, caseZ] = [0.65 + 0.12 * ((seed + index) % 2), z - 0.35 + 0.15 * (index % 2)];
    return [
      box(colour, [0.7, height, 0.95], [x, 0.8 + height / 2, caseZ], 0.14),
      box(PAINT.black, [0.4, 0.08, 0.08], [x, 0.8 + height + 0.04, caseZ], 0.01),
    ];
  });
  return [
    box(PAINT.darkBlue, [1.7, 0.3, 2.3], [0, 0.55, z], 0.08),
    box(PAINT.blue, [1.8, 0.3, 2.4], [0, 0.8, z], 0.1),
    ...[-1, 1].map((side) => box(PAINT.navy, [0.18, 0.5, 2.4], [side * 0.82, 1.0, z], 0.07)),
    box(PAINT.navy, [1.8, 0.5, 0.18], [0, 1.0, z - 1.1], 0.07),
    ...cases,
    rod(PAINT.darkGrey, [0, 0.5, z + 1.2], [0, 0.5, z + 1.7], 0.07),
    ...wheelSets([z - 0.7, z + 0.7], 0.8, 0.3, 0.25),
  ];
}

// The tug at the front (+z) and three carts behind it, each 2.8 apart.
export function buildBaggageTrain(kit) {
  return [painted(kit, [...tug(4.25), ...[0, 1, 2].flatMap((index) => cart(1.45 - index * 2.8, index))])];
}

// One dolly: a blue bed on four small wheels with a draw bar, carrying a fat grey container (a ULD) with ribs, a
// darker lid and a hatch.
function dolly(z, tint) {
  const ribs = [-1, 0, 1].map((rib) => box(PAINT.darkGrey, [0.12, 1.2, 0.08], [rib * 0.65, 1.5, z + 1.2], 0.02));
  return [
    box(PAINT.darkBlue, [2.2, 0.25, 2.7], [0, 0.45, z], 0.08),
    box(PAINT.blue, [2.3, 0.2, 2.8], [0, 0.65, z], 0.1),
    box(PAINT.yellow, [2.3, 0.14, 0.35], [0, 0.78, z + 1.2], 0.04),
    ...wheelSets([z - 0.9, z + 0.9], 1.0, 0.3, 0.25),
    rod(PAINT.darkGrey, [0, 0.4, z + 1.4], [0, 0.4, z + 1.9], 0.07),
    box(tint, [2.15, 1.35, 2.45], [0, 1.5, z], 0.18),
    box(PAINT.darkGrey, [2.2, 0.16, 2.5], [0, 2.2, z], 0.07),
    box(PAINT.navy, [0.8, 0.4, 0.08], [0.4, 1.7, z + 1.24], 0.03),
    ...ribs,
  ];
}

// Two dollies coupled, the second's container a shade darker.
export function buildUldDolly(kit) {
  return [painted(kit, [...dolly(1.45, 0xaab0b8), ...dolly(-1.65, 0x8d939c)])];
}

// The car's body: a fat yellow body and cabin with glass, a chequered band (two rows of squares) along each side,
// a light bar on the roof and a dark board for the sign. Exported for the test, which has no canvas for the board.
export function followMeCarShape() {
  const chequers = [-1, 1].flatMap((side) => [0, 1].flatMap((row) => Array.from({ length: 8 }, (unused, index) => {
    const colour = (index + row) % 2 === 0 ? PAINT.black : PAINT.white;
    return box(colour, [0.06, 0.14, 0.27], [side * 0.65, 0.55 + row * 0.14, -1 + index * 0.27 + 0.13], 0.01);
  })));
  return [
    box(PAINT.darkGrey, [1.2, 0.3, 2.5], [0, 0.4, 0], 0.08),
    box(PAINT.yellow, [1.4, 0.6, 2.5], [0, 0.75, 0], 0.18),
    box(PAINT.yellow, [1.2, 0.5, 1.3], [0, 1.3, -0.2], 0.18),
    box(PAINT.glass, [1.24, 0.34, 1.1], [0, 1.32, -0.2], 0.08),
    ...chequers,
    box(PAINT.navy, [1.8, 0.6, 0.14], [0, 1.95, -0.2], 0.05),
    box(PAINT.white, [1.1, 0.12, 0.3], [0, 1.64, -0.2], 0.05),
    box(PAINT.orange, [0.3, 0.12, 0.2], [-0.35, 1.76, 0.1], 0.04),
    box(PAINT.orange, [0.3, 0.12, 0.2], [0.35, 1.76, 0.1], 0.04),
    box(PAINT.white, [0.3, 0.2, 0.08], [-0.45, 0.82, 1.25], 0.03),
    box(PAINT.white, [0.3, 0.2, 0.08], [0.45, 0.82, 1.25], 0.03),
    box(PAINT.darkGrey, [1.5, 0.22, 0.25], [0, 0.5, 1.2], 0.08),
    ...wheelSets([-0.8, 0.8], 0.65, 0.38, 0.3, true),
  ];
}

// The "FOLLOW ME" board's two faces, drawn on one map, on the roof board's front and back.
function signFaces(kit) {
  const map = kit.keep(createSignTexture({ text: 'FOLLOW ME', board: PAINT.yellow, ink: PAINT.black, stripe: PAINT.coral, width: 512, height: 128 }));
  const faces = [0, Math.PI].map((turn) => new THREE.PlaneGeometry(1.7, 0.5).rotateY(turn).translate(0, 1.95, -0.2 + Math.cos(turn) * 0.08));
  return { geometry: kit.keep(mergeShapes(faces)), material: kit.keep(new THREE.MeshStandardMaterial({ map, roughness: 0.5 })) };
}

export function buildFollowMeCar(kit) {
  return [painted(kit, followMeCarShape()), signFaces(kit)];
}
