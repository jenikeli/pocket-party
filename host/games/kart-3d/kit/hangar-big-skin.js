// The big hangar's skin (M9): the arched roof of blue corrugated sheet with five long skylights, a white
// ceiling under it, a trim along each end's curve, the glazed gables over the doors, the door leaves rolled
// open into their pockets past both sides, the sign (HANGAR 1 and our emblem) over the front doors and the
// floor markings in the ring's infield. Shapes in the hangar's frame (kit/hangar-plan.js), sorted by material. Used by
// kit/hangar-big.js.

import * as THREE from 'three';
import { at, coloured, roundedBox } from '../shape-utils.js';
import { archSheet, archTrim, grid, inSheetTiles } from './hangar-parts.js';
import { HEADER_DEPTH, LEAVES_PER_SIDE, pocketWidth } from './hangar-big-frame.js';
import { CORAL, NAVY } from './hangar-maps.js';

const ROOF_BLUE = 0x4f86d0;
const CEILING = 0xe4e8ec;
const TRIM = 0xf4f4f0;
const DOOR_WHITE = 0xeef0f2;
const DOOR_WINDOWS = 0x9ccbea;
// The skylights' bands across the roof, as shares of its half width from the middle (-1 one side, 1 the
// other): half the roof, so the sun reaches most of the ring in long stripes.
const SKYLIGHTS = [[-0.82, -0.62], [-0.46, -0.26], [-0.1, 0.1], [0.26, 0.46], [0.62, 0.82]];
// The roof reaches this far past the ribs at the sides and the ends.
const OVERHANG = 1;
// The glazing's tile (kit/hangar-maps.js): 4 units wide, 3 tall.
const GLAZING_TILE = [4, 3];
// The sign: this share of the span wide, a quarter as tall, standing on the header.
const SIGN_SHARE = 0.3;

// { sheet, glass }: the roof's sheets and trims, and its skylights and the gables' glazing.
export function roofShapes(plan) {
  const { length, width, archY } = plan;
  const half = width / 2;
  const edges = [-1 - OVERHANG / half, ...SKYLIGHTS.flat(), 1 + OVERHANG / half];
  const [fromX, toX] = [-length / 2 - OVERHANG, length / 2 + OVERHANG];
  const sheet = [];
  const glass = [];
  for (let band = 0; band < edges.length - 1; band += 1) {
    const [fromZ, toZ] = [edges[band] * half, edges[band + 1] * half];
    const steps = Math.max(2, Math.round((toZ - fromZ) / 2));
    if (band % 2 === 0) {
      sheet.push(archSheet(archY, { fromZ, toZ, fromX, toX, lift: 0.15, steps, hex: ROOF_BLUE }));
      sheet.push(archSheet(archY, { fromZ, toZ, fromX, toX, lift: 0, inside: true, steps, hex: CEILING }));
    } else {
      glass.push(archSheet(archY, { fromZ, toZ, fromX, toX, lift: 0.08, steps, hex: 0xffffff, tile: GLAZING_TILE }));
    }
  }
  for (const end of [-1, 1]) {
    sheet.push(archTrim(archY, { x: end * (length / 2 + OVERHANG), halfWidth: half + OVERHANG, below: 0.7, above: 0.35, hex: TRIM }));
    glass.push(gableGlazing(plan, end * length / 2));
  }
  return { sheet, glass };
}

// The glazed gable at the end `x`: from the header up to the roof, across the span.
function gableGlazing({ width, eave, archY }, x) {
  const steps = 30;
  return grid(steps, 1, (column, row) => {
    const z = -width / 2 + (width * column) / steps;
    const y = row === 0 ? eave : archY(z) - 0.1;
    return { position: [x, y, z], normal: [Math.sign(x), 0, 0], uv: [z / GLAZING_TILE[0], (y - eave) / GLAZING_TILE[1]] };
  }, 0xffffff);
}

// The door leaves at both ends, rolled open: LEAVES_PER_SIDE leaves stacked in the pocket past each side, each
// on its own track a little further out, white sheet with a coral kick band and a band of windows.
export function doorShapes({ length, width, eave }) {
  const leafWidth = pocketWidth(width) - 0.4;
  const height = eave - HEADER_DEPTH - 0.2;
  const shapes = [];
  for (const end of [-1, 1]) {
    for (const side of [-1, 1]) {
      for (let leaf = 0; leaf < LEAVES_PER_SIDE; leaf += 1) {
        const x = end * (length / 2 + 0.7 + leaf * 0.75);
        const z = side * (width / 2 + 0.2 + leafWidth / 2 + leaf * 0.05);
        shapes.push(...doorLeaf(x, z, leafWidth, height));
      }
    }
  }
  return shapes;
}

function doorLeaf(x, z, leafWidth, height) {
  const body = inSheetTiles(roundedBox(0.5, height, leafWidth, 0.12, { chamfered: true }));
  return [
    coloured(at(body, x, 0.1 + height / 2, z), DOOR_WHITE),
    coloured(at(roundedBox(0.62, 1.4, leafWidth - 0.2, 0.1, { chamfered: true }), x, 0.85, z), CORAL),
    coloured(at(roundedBox(0.58, 1.6, leafWidth - 1.2, 0.1, { chamfered: true }), x, height * 0.72, z), DOOR_WINDOWS),
  ];
}

// { board, face }: the sign over the front doors (where the road comes in), standing on the header: a
// navy-rimmed board (painted), and its face (the sign's picture, kit/hangar-maps.js) just in front.
export function signShapes({ length, width, eave }) {
  const signWidth = width * SIGN_SHARE;
  const signHeight = signWidth / 4;
  const [x, y] = [length / 2 + 0.6, eave + 0.6 + signHeight / 2];
  const board = coloured(at(roundedBox(0.6, signHeight + 0.8, signWidth + 0.8, 0.25), x, y, 0), NAVY);
  const face = at(new THREE.PlaneGeometry(signWidth, signHeight).rotateY(Math.PI / 2), x + 0.32, y, 0);
  return { board, face };
}

// The floor markings over the ring's infield: the outline (kit/hangar-plan.js's infield) as a flat shape just
// above the floor, its texture coordinates laid out as createFloorMarkings draws them. Returns { geometry,
// bounds }.
export function floorDecal({ infield }) {
  const bounds = {
    minX: Math.min(...infield.map(([x]) => x)), maxX: Math.max(...infield.map(([x]) => x)),
    minZ: Math.min(...infield.map(([, z]) => z)), maxZ: Math.max(...infield.map(([, z]) => z)),
  };
  // The shape is drawn in (z, x) and turned so that its (z, x, up) become the hangar's (z, x, y): a turn (the
  // axes swap round in a cycle), so its face, toward its own up, faces the sky.
  const shape = new THREE.Shape(infield.map(([x, z]) => new THREE.Vector2(z, x)));
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.applyMatrix4(new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  const { position, uv } = geometry.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const [x, z] = [position.getX(index), position.getZ(index)];
    uv.setXY(index, (z - bounds.minZ) / (bounds.maxZ - bounds.minZ), (x - bounds.minX) / (bounds.maxX - bounds.minX));
  }
  geometry.translate(0, 0.03, 0);
  return { geometry, bounds };
}
