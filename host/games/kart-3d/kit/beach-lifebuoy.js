// The lifebuoy post (M7d4c4): a ring in eight red and white bands with a rope round its outside and four
// toggles, hung on a hook on a white post under a blue cap. Facing +z. Used by kit/beach-props.js.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes, roundedBox } from '../shape-utils.js';

const WHITE = 0xf6f4ee;
const RED = 0xe8402f;
const ROPE = 0xd8c08a;
const RING = { radius: 0.34, tube: 0.085, centre: [0, 1.25, 0.17] };

// Eight arcs of the ring, alternating red and white, each a short piece of torus.
function bands() {
  return Array.from({ length: 8 }, (_, band) => {
    const arc = new THREE.TorusGeometry(RING.radius, RING.tube, 8, 3, Math.PI / 4).rotateZ((band * Math.PI) / 4);
    return coloured(at(arc, ...RING.centre), band % 2 === 0 ? RED : WHITE);
  });
}

// The rope runs round the ring's outer edge, with a toggle at each quarter.
function rope() {
  const [x, y, z] = RING.centre;
  const line = new THREE.TorusGeometry(RING.radius + RING.tube, 0.014, 4, 24);
  const toggles = [0, 1, 2, 3].map((quarter) => {
    const angle = (quarter * Math.PI) / 2 + Math.PI / 8;
    const toggle = new THREE.SphereGeometry(0.03, 6, 4);
    return coloured(at(toggle, x + Math.cos(angle) * (RING.radius + RING.tube), y + Math.sin(angle) * (RING.radius + RING.tube), z), ROPE);
  });
  return [coloured(at(line, x, y, z), ROPE), ...toggles];
}

// A white post with a blue cap and ball, and a hook: an arm out of the post that turns up inside the ring's hole.
function post() {
  const hookY = RING.centre[1] + RING.radius - RING.tube - 0.04;
  return [
    coloured(at(roundedBox(0.14, 2, 0.14, 0.03), 0, 1, 0), WHITE),
    coloured(at(roundedBox(0.5, 0.07, 0.4, 0.025), 0, 2.03, 0.02), 0x2f62c9),
    coloured(at(new THREE.SphereGeometry(0.05, 8, 6), 0, 2.1, 0.02), 0x2f62c9),
    coloured(at(roundedBox(0.2, 0.06, 0.2, 0.02, { chamfered: true }), 0, 0.03, 0), 0x2f62c9),
    coloured(between(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), [0, hookY + 0.02, 0.06], [0, hookY + 0.02, RING.centre[2]]), 0x8a8a8e),
    coloured(between(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), [0, hookY + 0.02, RING.centre[2]], [0, hookY - 0.06, RING.centre[2]]), 0x8a8a8e),
  ];
}

export function lifebuoyPostShape() {
  return mergeShapes([...bands(), ...rope(), ...post()]);
}
