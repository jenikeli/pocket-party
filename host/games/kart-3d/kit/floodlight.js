// The kit's floodlight tower (M7d2, rebuilt in M7d4c3 to the study), as round MK8DX's stadiums: a chunky steel
// lattice mast on concrete feet with a ladder up its back, a service platform with a railing, and the lamp head on
// top facing the road (kit/floodlight-head.js). Lit only at night on MK8DX, so on a day course its lamps are glass
// lit by the sun. Two shapes, standing on y = 0 with the lamps facing +z: the steel (coloured per vertex) and the
// glass. Takes the kit and returns the tower's parts, [{ geometry, material }]. Used by kit/props.js.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes, roundedBox, roundedCylinder } from '../shape-utils.js';
import { buildLampHead, HEAD_BOTTOM, TOWER_HEIGHT as HEIGHT } from './floodlight-head.js';

const STEEL = 0xb8bcc4;
const CONCRETE = 0x9c9c96;
const BRACES = 6;
const FOOT = 1.1;
const TOP = 0.45;

// How far from the mast's middle its legs stand at height y: they lean in toward the top.
const spread = (y) => FOOT + ((TOP - FOOT) * y) / HEIGHT;
const corner = (index, y) => [((index & 1) * 2 - 1) * spread(y), y, ((index >> 1) * 2 - 1) * spread(y)];
const rod = (radius, from, to, color) => coloured(between(new THREE.CylinderGeometry(radius, radius, 1, 6), from, to), color);

export function buildFloodlight(kit) {
  const head = buildLampHead();
  const steel = mergeShapes([...mast(), ...feet(), ...ladder(), ...platform(), ...head.steel]);
  return [
    { geometry: kit.keep(steel), material: kit.materials.iron },
    { geometry: kit.keep(head.glass), material: kit.materials.glass },
  ];
}

// Four stout legs from a wide foot to a narrow top, braced in X's on every face, with a collar at every joint
// where a brace meets a leg (a bevelled ring, so each joint catches the light).
function mast() {
  const parts = [0, 1, 2, 3].map((index) => rod(0.09, corner(index, 0), corner(index, HEIGHT), STEEL));
  for (let level = 0; level < BRACES; level += 1) {
    const [low, high] = [level, level + 1].map((step) => (step / BRACES) * HEIGHT);
    for (const [a, b] of [[0, 1], [1, 3], [3, 2], [2, 0]]) {
      parts.push(rod(0.045, corner(a, low), corner(b, high), STEEL));
    }
  }
  for (let level = 0; level <= BRACES; level += 1) {
    for (let index = 0; index < 4; index += 1) {
      const [x, y, z] = corner(index, (level / BRACES) * HEIGHT);
      parts.push(coloured(at(roundedCylinder(0.13, 0.13, 0.22, 0.04, 6), x, y, z), STEEL));
    }
  }
  return parts;
}

// A concrete block under each leg, and a base plate on it.
function feet() {
  return [0, 1, 2, 3].flatMap((index) => {
    const [x, , z] = corner(index, 0);
    return [
      coloured(at(roundedBox(0.7, 0.5, 0.7, 0.08, { chamfered: true }), x, 0.25, z), CONCRETE),
      coloured(at(roundedCylinder(0.2, 0.2, 0.08, 0.02, 6), x, 0.54, z), STEEL),
    ];
  });
}

// A ladder up the back (-z) face: two rails and a rung every half unit, all standing off the mast.
function ladder() {
  const back = (x, y) => [x, y, -spread(y) - 0.16];
  const rails = [-0.25, 0.25].map((x) => rod(0.03, back(x, 0.5), back(x, HEIGHT), STEEL));
  const rungs = [];
  for (let y = 0.8; y < HEIGHT; y += 0.5) {
    rungs.push(rod(0.022, back(-0.25, y), back(0.25, y), STEEL));
  }
  return [...rails, ...rungs];
}

// The service platform at the mast's top: a deck, a railing round it (posts, top and middle rails) and two struts
// carrying the lamp head's frame.
function platform() {
  const half = 1.1;
  const parts = [coloured(at(roundedBox(2 * half, 0.12, 2 * half, 0.03, { chamfered: true }), 0, HEIGHT, 0), 0x6e737c)];
  const posts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [x * half, z * half]);
  for (const [x, z] of posts) {
    parts.push(rod(0.04, [x, HEIGHT, z], [x, HEIGHT + 0.95, z], STEEL));
  }
  posts.forEach(([x, z], index) => {
    const [nextX, nextZ] = posts[(index + 1) % 4];
    for (const lift of [0.5, 0.95]) {
      parts.push(rod(0.03, [x, HEIGHT + lift, z], [nextX, HEIGHT + lift, nextZ], STEEL));
    }
  });
  for (const x of [-1.4, 1.4]) {
    parts.push(rod(0.07, [x * 0.6, HEIGHT, -0.2], [x, HEAD_BOTTOM, 0.1], STEEL));
  }
  return parts;
}
