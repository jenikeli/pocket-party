// The kit's floodlight tower (M7d2), as round MK8DX's stadiums: a tall steel lattice mast with a bank of lamps on
// top facing the road. Lit only at night on MK8DX, so on a day course its lamps are glass lit by the sun. Two
// shapes, standing on y = 0 with the lamps facing +z: the steel (coloured per vertex) and the glass. Takes the
// kit and returns the tower's parts, [{ geometry, material }]. Used by kit/props.js.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes } from '../shape-utils.js';

const HEIGHT = 15;
const STEEL = 0xb8bcc4;
const BRACES = 6;

export function buildFloodlight(kit) {
  // Four legs from a wide foot to a narrow top, braced in X's on every face.
  const foot = 1.1;
  const top = 0.45;
  const corner = (index, spread, y) => [((index & 1) * 2 - 1) * spread, y, ((index >> 1) * 2 - 1) * spread];
  const rod = (from, to) => coloured(between(new THREE.CylinderGeometry(0.05, 0.05, 1, 5), from, to), STEEL);
  const legs = [0, 1, 2, 3].map((index) => rod(corner(index, foot, 0), corner(index, top, HEIGHT)));
  const braces = [];
  for (let level = 0; level < BRACES; level += 1) {
    const [low, high] = [level, level + 1].map((step) => (step / BRACES) * HEIGHT);
    const spread = (y) => foot + ((top - foot) * y) / HEIGHT;
    for (const [a, b] of [[0, 1], [1, 3], [3, 2], [2, 0]]) {
      braces.push(rod(corner(a, spread(low), low), corner(b, spread(high), high)));
    }
  }
  const lamps = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      lamps.push(at(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 12).rotateX(Math.PI / 2), -1.05 + column * 0.7, HEIGHT + 0.85 + row * 0.65, 0.62));
    }
  }
  const steel = mergeShapes([
    ...legs,
    ...braces,
    coloured(at(new THREE.BoxGeometry(3.2, 2.3, 0.4), 0, HEIGHT + 1.5, 0.35), 0x3a3e46),
    coloured(at(new THREE.BoxGeometry(2, 0.15, 1.6), 0, HEIGHT, 0), STEEL),
  ]);
  return [
    { geometry: kit.keep(steel), material: kit.materials.iron },
    { geometry: kit.keep(mergeShapes(lamps)), material: kit.materials.glass },
  ];
}
