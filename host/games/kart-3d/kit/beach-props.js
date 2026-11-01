// The kit's beach and harbour props (M7d3), our own toy versions of what stands about on MK8DX's seaside courses:
// a striped beach parasol, a sun lounger, surfboards stuck in the sand, a lifebuoy on a post and a stack of
// barrels. Each is one geometry coloured per vertex, standing on y = 0 and facing +z (toward the road). Each
// builder takes the kit and returns the prop's parts, [{ geometry, material }]. Used by kit/props.js.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes, roundedBox } from '../shape-utils.js';

const WOOD = 0xb58a5a;
const WHITE = 0xf6f4ee;
const PARASOL_COLORS = [0xe8402f, WHITE];
const TOWEL = 0x2f9be8;

// A parasol 3 across on a pole leaning a little: eight panels in two colours in turn, a valance, a finial.
export function buildParasol(kit) {
  return [{ geometry: kit.keep(parasolShape(PARASOL_COLORS)), material: kit.materials.painted }];
}

function parasolShape(colors) {
  const tip = [0.25, 2.6, 0];
  const panels = Array.from({ length: 8 }, (_, panel) => {
    const shape = new THREE.ConeGeometry(1.5, 0.55, 2, 1, true, (panel / 8) * 2 * Math.PI, (2 * Math.PI) / 8);
    return coloured(at(shape, tip[0], tip[1] - 0.28, tip[2]), colors[panel % 2]);
  });
  // A short valance hangs round the rim, in the panels' colours.
  const valance = Array.from({ length: 8 }, (_, panel) => {
    const shape = new THREE.CylinderGeometry(1.5, 1.5, 0.16, 3, 1, true, (panel / 8) * 2 * Math.PI, (2 * Math.PI) / 8);
    return coloured(at(shape, tip[0], tip[1] - 0.63, tip[2]), colors[panel % 2]);
  });
  return mergeShapes([
    ...panels,
    ...valance,
    coloured(between(new THREE.CylinderGeometry(0.04, 0.05, 1, 6), [0, 0, 0], tip), WHITE),
    coloured(at(new THREE.SphereGeometry(0.08, 8, 6), tip[0], tip[1] + 0.02, tip[2]), colors[0]),
  ]);
}

// A sun lounger about 2 long along x: a wooden frame on four legs, a slatted bed and a raised back, a towel.
export function buildLounger(kit) {
  return [{ geometry: kit.keep(loungerShape(TOWEL)), material: kit.materials.painted }];
}

function loungerShape(towel) {
  const parts = [];
  for (const x of [-0.85, 0.85]) {
    for (const z of [-0.3, 0.3]) {
      parts.push(coloured(at(new THREE.BoxGeometry(0.06, 0.3, 0.06), x, 0.15, z), WOOD));
    }
  }
  parts.push(coloured(at(roundedBox(1.3, 0.07, 0.68, 0.02), -0.2, 0.33, 0), WOOD));
  for (let slat = 0; slat < 5; slat += 1) {
    parts.push(coloured(at(new THREE.BoxGeometry(0.18, 0.03, 0.64), -0.75 + slat * 0.28, 0.38, 0), 0xc89c68));
  }
  const back = roundedBox(0.7, 0.06, 0.68, 0.02).rotateZ(0.6);
  parts.push(coloured(at(back, 0.72, 0.58, 0), WOOD));
  parts.push(coloured(at(new THREE.BoxGeometry(1.1, 0.03, 0.5), -0.25, 0.41, 0), towel));
  return mergeShapes(parts);
}

// Three surfboards stuck upright in the sand, fanned out, each in its colour with a stripe down it.
export function buildSurfboards(kit) {
  return [{ geometry: kit.keep(surfboardsShape()), material: kit.materials.plastic }];
}

function surfboardsShape() {
  const boards = [[0xffd21e, 0xe8402f], [0x2f9be8, WHITE], [0xff8fc8, 0x8a4fd8]];
  return mergeShapes(
    boards.flatMap(([body, stripe], index) => {
      const lean = (index - 1) * 0.18;
      const board = new THREE.SphereGeometry(0.28, 12, 10).scale(1, 4.2, 0.18).rotateZ(lean);
      const band = new THREE.SphereGeometry(0.285, 12, 10, 0, 2 * Math.PI, 0.25, 0.3).scale(1, 4.2, 0.2).rotateZ(lean);
      const x = (index - 1) * 0.62;
      return [coloured(at(board, x, 0.95, 0), body), coloured(at(band, x, 0.95, 0), stripe)];
    }),
  );
}

// A lifebuoy, red and white in quarters, hung on a white post with a little roof.
export function buildLifebuoyPost(kit) {
  return [{ geometry: kit.keep(lifebuoyPostShape()), material: kit.materials.painted }];
}

function lifebuoyPostShape() {
  const quarters = Array.from({ length: 4 }, (_, quarter) => {
    const ring = new THREE.TorusGeometry(0.34, 0.09, 8, 6, Math.PI / 2).rotateZ((quarter * Math.PI) / 2);
    return coloured(at(ring, 0, 1.25, 0.12), quarter % 2 === 0 ? 0xe8402f : WHITE);
  });
  return mergeShapes([
    ...quarters,
    coloured(at(roundedBox(0.16, 2, 0.16, 0.03), 0, 1, 0), WHITE),
    coloured(at(roundedBox(0.5, 0.06, 0.4, 0.02), 0, 2.02, 0.04), 0x2f62c9),
    coloured(at(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6), 0, 1.62, 0.08), 0x8a8a8e),
  ]);
}

// Three barrels on their ends and one lying on top, wooden with dark hoops.
export function buildBarrels(kit) {
  return [{ geometry: kit.keep(barrelsShape()), material: kit.materials.painted }];
}

function barrelsShape() {
  const barrel = (x, y, z, lying) => {
    const body = new THREE.CylinderGeometry(0.36, 0.36, 0.9, 12).scale(1.08, 1, 1.08);
    const hoops = [-0.3, 0.3].map((offset) => at(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 12), 0, offset, 0));
    const shapes = [coloured(body, 0xa8784a), ...hoops.map((hoop) => coloured(hoop, 0x3a3a40))];
    return shapes.map((shape) => (lying ? shape.rotateX(Math.PI / 2) : shape).translate(x, y, z));
  };
  return mergeShapes([...barrel(-0.42, 0.45, 0, false), ...barrel(0.42, 0.45, 0, false), ...barrel(0, 0.45, -0.72, false), ...barrel(0, 1.25, -0.3, true)]);
}
