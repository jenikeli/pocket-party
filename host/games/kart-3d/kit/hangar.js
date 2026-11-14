// A small hangar for the taxiway's side (M9), after the references' blister and general-aviation hangars
// (test-results/reference/m9/H/): white corrugated walls under a curved roof in the airline's colour, a big
// two-leaf door on the front with one leaf slid half open on a dark inside, the airline's name on a sign over
// it, a band of the airline's second colour round the foot, windows and a small door along the sides. A landmark:
// it stands on its own origin, its door facing +x, `width` across (z) and `depth` deep (x). Used by the airport's dressing (airport-scenery.js) and kit-shots.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedBox } from '../shape-utils.js';
import { extruded } from './extruded.js';
import { archShape } from './hangar-plan.js';
import { archSheet, archTrim, hangarMaterials, hangarMesh, inSheetTiles, member } from './hangar-parts.js';
import { createSignTexture, CORAL, NAVY, SUN_YELLOW } from './hangar-maps.js';

// Our airlines: the roof and sign in the first colour, the foot band in the second.
export const AIRLINES = Object.freeze({
  'Palm Air': [0x1f9e6e, SUN_YELLOW],
  'Coral Wings': [CORAL, NAVY],
  'Skipjack Air': [NAVY, 0x3fa9e0],
});
const WALL_WHITE = 0xf1f2f4;
const INSIDE = 0x2b313c;
const TRIM = 0xf8f8f6;
const WALL = 0.3;

// { object, update(dt, race) }; update does nothing.
export function buildHangar(kit, { width, depth, airline = 'Palm Air' }) {
  const colours = AIRLINES[airline];
  if (!colours) {
    throw new Error(`Unknown airline "${airline}". Known: ${Object.keys(AIRLINES).join(', ')}`);
  }
  const materials = hangarMaterials(kit);
  const shapes = hangarShapes(width, depth, colours);
  const object = new THREE.Group();
  object.name = `hangar-${airline}`;
  object.add(
    hangarMesh(kit.keep(mergeShapes(shapes.sheet)), materials.sheet),
    hangarMesh(kit.keep(mergeShapes(shapes.painted)), materials.steel),
    hangarMesh(kit.keep(shapes.sign), signMaterial(kit, airline)),
  );
  return { object, update() {} };
}

// The hangar's shapes by material: { sheet, painted, sign } (sign one geometry). Plain shapes, unit tested.
export function hangarShapes(width, depth, [first, second]) {
  const wallHeight = Math.min(Math.max(width * 0.3, 5), 8);
  const roofY = archShape(width, wallHeight, width * 0.2);
  const door = { width: width - 4, height: wallHeight - 0.6 };
  const [front, back] = [depth / 2, -depth / 2];
  const sheet = [
    archSheet(roofY, { fromZ: -width / 2 - 0.4, toZ: width / 2 + 0.4, fromX: back - 0.5, toX: front + 0.5, lift: 0.12, steps: 16, hex: first }),
    archSheet(roofY, { fromZ: -width / 2, toZ: width / 2, fromX: back, toX: front, inside: true, steps: 16, hex: INSIDE }),
    ...[-1, 1].map((side) => coloured(at(inSheetTiles(roundedBox(depth, wallHeight, WALL, 0.08)), 0, wallHeight / 2, side * (width / 2 - WALL / 2)), WALL_WHITE)),
    gable(roofY, width, wallHeight, front - WALL / 2, door),
    gable(roofY, width, wallHeight, back + WALL / 2, null),
    ...doorLeaves(front, door, second),
  ];
  const painted = [
    ...[-1, 1].map((end) => archTrim(roofY, { x: end * (depth / 2 + 0.5), halfWidth: width / 2 + 0.4, below: 0.5, above: 0.3, hex: TRIM })),
    ...[-1, 1].flatMap((side) => sideDetail(width, depth, wallHeight, side, [first, second])),
    ...inside(width, depth, wallHeight),
    member([front + 0.9, door.height + 0.25, -door.width / 2 - 1], [front + 0.9, door.height + 0.25, door.width / 2 + 1], 0.35, NAVY),
  ];
  return { sheet, painted, sign: signFace(roofY, width, front, wallHeight) };
}

// An end wall at `x`: the roof's outline down to the ground, with the door's opening cut out if `door` is given.
function gable(roofY, width, wallHeight, x, door) {
  const half = width / 2 - 0.05;
  const outline = new THREE.Shape();
  outline.moveTo(-half, 0);
  if (door) {
    outline.lineTo(-door.width / 2, 0);
    outline.lineTo(-door.width / 2, door.height);
    outline.lineTo(door.width / 2, door.height);
    outline.lineTo(door.width / 2, 0);
  }
  outline.lineTo(half, 0);
  for (let step = 0; step <= 16; step += 1) {
    const z = half - (2 * half * step) / 16;
    outline.lineTo(z, roofY(z) - 0.05);
  }
  const wall = inSheetTiles(extruded(outline, { depth: WALL, bevelEnabled: false })).translate(0, 0, -WALL / 2).rotateY(Math.PI / 2);
  return coloured(wall.translate(x, 0, 0), WALL_WHITE);
}

// The door's two leaves on their tracks in front of the wall: one closed over the left half, the other slid
// most of the way over it, so a third of the opening shows the dark inside. White, with a band in `second`.
function doorLeaves(front, door, second) {
  const leafWidth = door.width / 2 + 0.3;
  const leaves = [{ x: front + 0.45, z: -door.width / 4 }, { x: front + 0.85, z: -door.width / 4 + leafWidth * 0.4 }];
  return leaves.flatMap(({ x, z }) => [
    coloured(at(inSheetTiles(roundedBox(0.3, door.height, leafWidth, 0.08, { chamfered: true })), x, door.height / 2, z), WALL_WHITE),
    coloured(at(roundedBox(0.36, 0.8, leafWidth - 0.1, 0.06, { chamfered: true }), x, door.height * 0.55, z), second),
    coloured(at(roundedBox(0.36, 0.5, leafWidth - 0.1, 0.06, { chamfered: true }), x, 0.25, z), 0x3a3e46),
  ]);
}

// Along the side `side` (-1 or 1): the foot band in the airline's second colour, a stripe of its first under
// the gutter, the gutter, corner posts, three windows and a small door.
function sideDetail(width, depth, wallHeight, side, [first, second]) {
  const z = side * (width / 2 + 0.02);
  const shapes = [
    coloured(at(roundedBox(depth + 0.1, 0.9, 0.12, 0.04), 0, 0.45, z), second),
    coloured(at(roundedBox(depth + 0.1, 0.7, 0.12, 0.04), 0, wallHeight - 0.85, z), first),
    member([-depth / 2 - 0.4, wallHeight, z], [depth / 2 + 0.4, wallHeight, z], 0.3, TRIM),
    ...[-1, 1].map((end) => coloured(at(roundedBox(0.5, wallHeight, 0.5, 0.1, { chamfered: true }), end * depth / 2, wallHeight / 2, z), TRIM)),
    coloured(at(roundedBox(1, 2.1, 0.14, 0.05), -depth / 2 + 2.5, 1.05 + 0.02, z), second),
  ];
  for (let window = 0; window < 3; window += 1) {
    const x = depth / 2 - 3 - window * 3;
    shapes.push(coloured(at(roundedBox(1.9, 1.2, 0.14, 0.05), x, 2.6, z), TRIM));
    shapes.push(coloured(at(new THREE.BoxGeometry(1.6, 0.9, 0.16), x, 2.6, z), 0x30506e));
  }
  return shapes;
}

// The dark inside seen through the open door: the back wall and the sides' inner faces.
function inside(width, depth, wallHeight) {
  const inner = width / 2 - WALL - 0.05;
  return [
    coloured(at(new THREE.PlaneGeometry(2 * inner, wallHeight).rotateY(Math.PI / 2), -depth / 2 + WALL + 0.05, wallHeight / 2, 0), INSIDE),
    ...[-1, 1].map((side) => coloured(at(new THREE.PlaneGeometry(depth - 2 * WALL, wallHeight).rotateY(side > 0 ? Math.PI : 0), 0, wallHeight / 2, side * inner), INSIDE)),
  ];
}

// The sign's face over the door, just in front of the gable, four times as wide as tall (as its picture): up to
// 0.6 of the width across, lower and narrower where the roof comes down over its corners.
function signFace(roofY, width, front, wallHeight) {
  const widest = width * 0.6;
  const signHeight = Math.min(widest / 4, roofY(widest / 2) - wallHeight - 0.4);
  const plane = new THREE.PlaneGeometry(signHeight * 4, signHeight).rotateY(Math.PI / 2);
  return at(plane, front + 0.05, wallHeight + 0.15 + signHeight / 2, 0);
}

// The airline's sign material, made once per course for each airline.
const signsFor = new WeakMap();

function signMaterial(kit, airline) {
  if (!signsFor.has(kit.materials)) {
    signsFor.set(kit.materials, new Map());
  }
  const signs = signsFor.get(kit.materials);
  if (!signs.has(airline)) {
    const [first, second] = AIRLINES[airline];
    const map = kit.keep(createSignTexture({ text: airline.toUpperCase(), board: 0xffffff, ink: first, stripe: second, width: 512, height: 128 }));
    signs.set(airline, kit.keep(new THREE.MeshStandardMaterial({ map, roughness: 0.5 })));
  }
  return signs.get(airline);
}
