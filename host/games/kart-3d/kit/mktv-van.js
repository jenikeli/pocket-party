// The kit's MKTV van (M7d2, rebuilt in M7d4c3 to the study): a white TV van with a blue stripe, a windscreen in a
// frame, a grille and headlights, side windows, door seams and handles, mirrors, bumpers, tyres with hubcaps, and
// on its roof a rack carrying a satellite dish on a mount and a Toad with a TV camera (kit/mktv-toad.js). The MKTV
// board (kit/sponsors.js) is on both its sides. Facing +z, standing on y = 0. Used by kit/props.js.

import * as THREE from 'three';
import { roundedBox, roundedCylinder, at, between, coloured, mergeShapes } from '../shape-utils.js';
import { sponsorUv } from './sponsors.js';
import { buildToad } from './mktv-toad.js';

// The MKTV board's place among the sponsors (kit/sponsors.js).
const MKTV = 3;
const LENGTH = 4.6;
const WIDTH = 2;
const ROOF = 2.33;
const WHITE = 0xf4f4f0;
const DARK = 0x1d1d20;
const GLASS = 0x1a2a44;
const STEEL = 0x9aa0a8;

// Returns the van's parts: its shape (coloured per vertex, painted) and its two printed boards (in the sponsor
// atlas's texture coordinates, the sponsors' material).
export function buildMktvVan(kit) {
  const body = mergeShapes([...bodyShell(), ...frontEnd(), ...sides(), ...wheels(), ...roof()]);
  return [
    { geometry: kit.keep(body), material: kit.materials.painted },
    { geometry: kit.keep(buildBoards()), material: kit.sponsors },
  ];
}

// The box, its stripe and the two bumpers.
function bodyShell() {
  const bumper = (z) => coloured(at(roundedBox(WIDTH + 0.12, 0.24, 0.3, 0.07), 0, 0.62, z), 0x2f3138);
  return [
    coloured(at(roundedBox(WIDTH, 1.9, LENGTH, 0.22), 0, 1.38, 0), WHITE),
    coloured(at(roundedBox(WIDTH + 0.04, 0.3, LENGTH + 0.04, 0.1), 0, 0.9, 0), 0x1d4fc4),
    bumper(LENGTH / 2 - 0.1),
    bumper(-LENGTH / 2 + 0.1),
  ];
}

// The front (+z): the windscreen in a frame, the grille and the two headlights.
function frontEnd() {
  const front = LENGTH / 2 - 0.04;
  const headlight = (x) => [
    coloured(at(roundedCylinder(0.2, 0.2, 0.08, 0.025, 10).rotateX(Math.PI / 2), x, 1.18, front), STEEL),
    coloured(at(new THREE.SphereGeometry(0.15, 10, 4, 0, 2 * Math.PI, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.5), x, 1.18, front + 0.03), 0xfff1b0),
  ];
  const bars = [0, 1, 2].map((row) => coloured(at(roundedBox(0.8, 0.045, 0.06, 0.015, { chamfered: true }), 0, 1.08 + row * 0.1, front + 0.03), 0xb8bcc4));
  return [
    coloured(at(roundedBox(WIDTH - 0.1, 0.82, 0.12, 0.05), 0, 1.86, front), 0xdcdcd6),
    coloured(at(roundedBox(WIDTH - 0.28, 0.66, 0.14, 0.04), 0, 1.86, front + 0.005), GLASS),
    coloured(at(roundedBox(1, 0.34, 0.08, 0.04), 0, 1.18, front), DARK),
    ...bars,
    ...headlight(-0.7),
    ...headlight(0.7),
  ];
}

// Both sides: a window in the cab, a door seam and handle, a mirror on an arm.
function sides() {
  return [-1, 1].flatMap((side) => {
    const x = side * (WIDTH / 2);
    return [
      coloured(at(roundedBox(0.1, 0.62, 0.95, 0.03, { chamfered: true }), x, 1.85, 1.6), GLASS),
      coloured(at(roundedBox(0.04, 1.35, 0.03, 0.01, { chamfered: true }), x, 1.5, 1.08), 0x9a9ea6),
      coloured(at(roundedBox(0.08, 0.07, 0.22, 0.02, { chamfered: true }), x, 1.42, 1.3), STEEL),
      coloured(between(new THREE.CylinderGeometry(0.025, 0.025, 1, 5), [x, 1.95, 2.05], [x + side * 0.2, 2.0, 2.05]), DARK),
      coloured(at(roundedBox(0.1, 0.3, 0.2, 0.04, { chamfered: true }), x + side * 0.24, 2.0, 2.05), DARK),
    ];
  });
}

// Four tyres with a rounded sidewall, each with a hubcap and a centre cap.
function wheels() {
  return [-1, 1].flatMap((side) => [-1.45, 1.45].flatMap((z) => {
    const x = side * 0.92;
    const outer = side * 1.09;
    return [
      coloured(at(roundedCylinder(0.42, 0.42, 0.3, 0.1, 16).rotateZ(Math.PI / 2), x, 0.42, z), DARK),
      coloured(at(roundedCylinder(0.25, 0.25, 0.06, 0.02, 12).rotateZ(Math.PI / 2), outer, 0.42, z), 0xd8dadf),
      coloured(at(roundedCylinder(0.08, 0.08, 0.1, 0.03, 8).rotateZ(Math.PI / 2), outer + side * 0.01, 0.42, z), STEEL),
    ];
  }));
}

// The roof rack (two rails and three cross bars on posts), the dish on its mount toward the back, and the Toad
// with his camera toward the front.
function roof() {
  const rail = (from, to) => coloured(between(new THREE.CylinderGeometry(0.03, 0.03, 1, 5), from, to), STEEL);
  const top = ROOF + 0.18;
  const parts = [];
  for (const x of [-0.75, 0.75]) {
    parts.push(rail([x, top, -1.9], [x, top, 1.7]));
    for (const z of [-1.9, 1.7]) {
      parts.push(rail([x, ROOF, z], [x, top, z]));
    }
  }
  for (const z of [-1.9, -0.1, 1.7]) {
    parts.push(rail([-0.75, top, z], [0.75, top, z]));
  }
  parts.push(
    coloured(at(roundedCylinder(0.2, 0.26, 0.1, 0.03, 10), 0, top + 0.05, -1.1), STEEL),
    coloured(at(new THREE.CylinderGeometry(0.06, 0.08, 0.4, 6), 0, top + 0.3, -1.1), STEEL),
    ...dish(top + 0.5),
    ...buildToad().map((toad) => toad.translate(0, top, 0.7)),
  );
  return parts;
}

// The dish: a shallow paraboloid bowl made of two surfaces, an inner one (seen from the front, in light grey) and
// an outer one wound the other way round (so the back shows too, instead of vanishing as one-sided shapes do),
// with a rim and a feed horn on an arm in front. Tilted to look up and forward.
function dish(height) {
  const points = (offset) => Array.from({ length: 9 }, (_, step) => {
    const radius = (step / 8) * 0.62;
    return new THREE.Vector2(radius, 0.55 * radius * radius + offset);
  });
  const inner = new THREE.LatheGeometry(points(0), 16);
  const outer = new THREE.LatheGeometry(points(-0.035).reverse(), 16);
  const rim = new THREE.TorusGeometry(0.62, 0.025, 5, 16).rotateX(Math.PI / 2).translate(0, 0.55 * 0.62 * 0.62 - 0.01, 0);
  const horn = between(new THREE.CylinderGeometry(0.02, 0.05, 1, 6), [0, 0.25, 0], [0, 0.45, 0]);
  const arm = between(new THREE.CylinderGeometry(0.015, 0.015, 1, 4), [0, 0.2, 0.55 * 0], [0, 0.45, 0]);
  const shapes = [coloured(inner, 0xf0f2f6), coloured(outer, 0xc8ccd4), coloured(rim, 0xf0f2f6), coloured(horn, DARK), coloured(arm, STEEL)];
  return shapes.map((shape) => shape.rotateX(0.7).translate(0, height, -1.1));
}

// A board on each side of the van, facing out, reading left to right from beside it.
function buildBoards() {
  const boards = [-1, 1].map((side) => {
    const board = new THREE.PlaneGeometry(3, 0.94);
    const uv = board.attributes.uv;
    for (let index = 0; index < uv.count; index += 1) {
      uv.setXY(index, ...sponsorUv(MKTV, uv.getX(index), uv.getY(index)));
    }
    return board.rotateY((side * Math.PI) / 2).translate(side * (WIDTH / 2 + 0.01), 1.5, -0.3);
  });
  return mergeShapes(boards);
}
