// The shapes and maps of the baggage conveyor (M9 task K, kit/baggage-conveyor.js): the belt's drawn cleats, the
// frame with its side rails, legs and the two housings the belt runs into (each with a rubber curtain over its
// mouth), the housings' signs, and the cargo that rides the belt (a suitcase and a crate, white so each instance
// is tinted its own colour). The conveyor runs along z, centred on its origin, its belt top at BELT_TOP.

import * as THREE from 'three';
import { at, coloured, mergeShapes } from '../shape-utils.js';
import { PAINT, box } from './airport-vehicle-parts.js';
import { createSurface } from './surface-maps.js';
import { createSignTexture, NAVY, SUN_YELLOW } from './hangar-maps.js';

export const BELT_WIDTH = 3.4;
export const BELT_TOP = 0.84;
export const HOUSING_LENGTH = 2.4;
// The belt's cleat pattern repeats every TILE units along it.
export const TILE = 2;
const HOUSING_HEIGHT = 3.4;
const MOUTH_HEIGHT = 1.6;
const RAIL_X = BELT_WIDTH / 2 + 0.15;

// The belt's maps: dark rubber with a raised cleat every half unit and a yellow edge line each side, across the
// belt (x) and TILE long (y); repeating along it. Returns the four maps of surface-maps.js's toMaps.
export function createBeltMaps() {
  const pixelsPerUnit = 64;
  const surface = createSurface(BELT_WIDTH, TILE, pixelsPerUnit, { color: [34, 37, 46], roughness: 0.85, base: 100 });
  for (let cleat = 0; cleat < TILE * 2; cleat += 1) {
    surface.panel({ left: 0.3, bottom: cleat * 0.5 + 0.1, width: BELT_WIDTH - 0.6, height: 0.28 }, { lift: 45, bevel: 0.08, paint: { color: [62, 66, 78], roughness: 0.7 } });
  }
  const line = 0.14 * pixelsPerUnit;
  surface.colors.rect(0.05 * pixelsPerUnit, 0, line, surface.height, [245, 194, 27]);
  surface.colors.rect(surface.width - 0.05 * pixelsPerUnit - line, 0, line, surface.height, [245, 194, 27]);
  return surface.toMaps({ depth: 2, shade: { reach: 0.08, strength: 0.7 }, repeat: true });
}

// The housings' sign, "BAGGAGE" in white on navy over a yellow stripe.
export function createHousingSign() {
  return createSignTexture({ text: 'BAGGAGE', board: NAVY, ink: 0xffffff, stripe: SUN_YELLOW, width: 512, height: 64 });
}

// A sign quad for the housing at `end` (-1 or 1), facing the belt (the one at +z faces back toward -z), its middle
// at (0, y, z).
export function housingSignQuad(end, y, z) {
  const quad = new THREE.PlaneGeometry(BELT_WIDTH + 0.4, 0.45);
  return at(end > 0 ? quad.rotateY(Math.PI) : quad, 0, y, z);
}

// Where a housing's face (the side the belt comes out of) is, in z, for a conveyor `length` long.
export const faceZ = (length) => length / 2 - HOUSING_LENGTH;
// How high the housings' signs hang: between the mouth's frame and the roof.
export const SIGN_HEIGHT = HOUSING_HEIGHT - 0.45;

// The frame in painted shapes: side rails with hazard-striped tops, legs, the belt's under-body and the two housings.
export function conveyorFrame(length) {
  const run = 2 * faceZ(length);
  const parts = [box(PAINT.darkGrey, [BELT_WIDTH + 0.2, 0.3, run], [0, BELT_TOP - 0.25, 0], 0.05)];
  for (const side of [-1, 1]) {
    parts.push(box(PAINT.navy, [0.3, 0.6, run], [side * RAIL_X, BELT_TOP + 0.02, 0], 0.1));
    for (let stripe = 0; stripe < Math.floor(run); stripe += 1) {
      parts.push(box(stripe % 2 === 0 ? PAINT.yellow : PAINT.black, [0.34, 0.12, 0.96], [side * RAIL_X, BELT_TOP + 0.38, -run / 2 + stripe + 0.5], 0.04));
    }
    for (let leg = 0; leg <= Math.floor(run / 5); leg += 1) {
      const z = -run / 2 + 0.5 + (leg * (run - 1)) / Math.floor(run / 5);
      parts.push(box(PAINT.grey, [0.32, BELT_TOP - 0.3, 0.32], [side * RAIL_X, (BELT_TOP - 0.3) / 2, z], 0.08), box(PAINT.darkGrey, [0.7, 0.1, 0.7], [side * RAIL_X, 0.05, z], 0.04));
    }
  }
  return [...parts, ...[-1, 1].flatMap((end) => housing(end, faceZ(length)))];
}

// A housing at `end` (-1 or 1): a fat coral body over a navy foot with a white roof, its mouth framed in yellow,
// and a rubber curtain of nine strips hanging over the mouth.
function housing(end, face) {
  const z = end * (face + HOUSING_LENGTH / 2);
  const mouthZ = end * face;
  const strips = Array.from({ length: 9 }, (unused, index) => box(PAINT.navy, [0.34, MOUTH_HEIGHT - 0.15, 0.06], [(index - 4) * 0.37, BELT_TOP + (MOUTH_HEIGHT - 0.15) / 2 + 0.15, mouthZ + end * 0.03], 0.02));
  return [
    box(PAINT.coral, [BELT_WIDTH + 0.9, HOUSING_HEIGHT - 0.3, HOUSING_LENGTH], [0, 0.15 + (HOUSING_HEIGHT - 0.3) / 2, z], 0.3),
    box(PAINT.navy, [BELT_WIDTH + 1.0, 0.5, HOUSING_LENGTH + 0.1], [0, 0.25, z], 0.15),
    box(PAINT.white, [BELT_WIDTH + 1.1, 0.22, HOUSING_LENGTH + 0.2], [0, HOUSING_HEIGHT - 0.05, z], 0.1),
    box(PAINT.black, [BELT_WIDTH, MOUTH_HEIGHT, 0.1], [0, BELT_TOP + MOUTH_HEIGHT / 2, mouthZ + end * 0.02], 0.03),
    box(PAINT.yellow, [BELT_WIDTH + 0.3, 0.14, 0.16], [0, BELT_TOP + MOUTH_HEIGHT + 0.07, mouthZ + end * 0.04], 0.05),
    ...[-1, 1].map((side) => box(PAINT.yellow, [0.14, MOUTH_HEIGHT, 0.16], [side * (BELT_WIDTH / 2 + 0.07), BELT_TOP + MOUTH_HEIGHT / 2, mouthZ + end * 0.04], 0.05)),
    ...strips,
  ];
}

// A suitcase, white with dark straps, a handle and two little wheels, standing on y = 0: 0.8 across (x), 0.62
// tall, 0.45 deep.
export function suitcaseShape() {
  return mergeShapes([
    box(0xffffff, [0.8, 0.58, 0.45], [0, 0.35, 0], 0.14),
    box(PAINT.darkGrey, [0.1, 0.6, 0.48], [-0.22, 0.35, 0], 0.03),
    box(PAINT.darkGrey, [0.1, 0.6, 0.48], [0.22, 0.35, 0], 0.03),
    box(PAINT.black, [0.32, 0.08, 0.1], [0, 0.69, 0], 0.03),
    ...[-0.28, 0.28].map((x) => coloured(at(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8).rotateZ(Math.PI / 2), x, 0.06, 0.1), 0x15151a)),
  ]);
}

// A crate, white (tinted wood by its instance) with dark corner straps and a lid band, 0.9 square.
export function crateShape() {
  const strap = (x, z) => box(PAINT.darkGrey, [0.14, 0.92, 0.14], [x, 0.45, z], 0.03);
  return mergeShapes([
    box(0xffffff, [0.9, 0.84, 0.9], [0, 0.44, 0], 0.12),
    strap(-0.4, -0.4), strap(0.4, -0.4), strap(-0.4, 0.4), strap(0.4, 0.4),
    box(PAINT.darkGrey, [0.94, 0.1, 0.94], [0, 0.7, 0], 0.04),
  ]);
}
