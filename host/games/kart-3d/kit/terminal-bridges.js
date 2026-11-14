// The terminal's jet bridges (M9), after real ones: a stub out of the hall's glass
// to a round rotunda on a pillar, a ribbed steel tunnel with a band of windows sloping down toward the plane, a
// drive leg on two fat wheels under its far end, and the cab with its dark bellows hood and a coral gate box on
// top. Each reaches straight out along +x from the terminal's front. Returns shapes by part, as
// kit/terminal-body.js does; the gates' places are terminalGates (kit/terminal.js).

import * as THREE from 'three';
import { at, between, coloured, roundedBox, roundedCylinder } from '../shape-utils.js';
import { projectUv } from './terminal-uv.js';
import { CORAL } from './terminal-maps.js';

const ROTUNDA = { x: 4.6, radius: 2.1, bottom: 3.4, height: 3.6 };
const TUNNEL = { from: 6.4, to: 17.5, height: 3, width: 2.8, startFloor: 3.6 };
// Where the cab's floor is: the door of a plane parked here should be about this high, just past the hood.
export const BRIDGE_DOOR = { x: 21.2, y: 3.2 };
const CAB = { x: 18.8, length: 2.6, height: 3.4, width: 3.6 };
const LEG_X = 15;
const CAB_GREY = 0xe6e9ed;
const DARK = 0x2b2b2e;

export function buildJetBridge(z) {
  return {
    painted: [...buildRotunda(z), ...buildLeg(z), ...buildCab(z)],
    ribbed: [tunnelPart(roundedBox(TUNNEL.to - TUNNEL.from, TUNNEL.height, TUNNEL.width, 0.25), z, 0, 0xffffff, 2)],
    upperGlass: [-1, 1].map((side) => tunnelPart(new THREE.BoxGeometry(TUNNEL.to - TUNNEL.from - 1.2, 0.7, 0.1), z + side * (TUNNEL.width / 2 + 0.01), 0.45, 0xffffff)),
    gloss: [coloured(at(roundedBox(1.4, 0.9, 1.4, 0.15), CAB.x, BRIDGE_DOOR.y + CAB.height + 0.45, z), CORAL)],
  };
}

// A shape built round the tunnel's middle, turned down the tunnel's slope and moved to it, `lift` above its
// middle; with `tile`, its texture laid on in tiles that big, once it is in place.
function tunnelPart(shape, z, lift, hex, tile) {
  const run = TUNNEL.to - TUNNEL.from;
  const drop = TUNNEL.startFloor - BRIDGE_DOOR.y;
  shape.translate(0, lift, 0).rotateZ(-Math.atan2(drop, run));
  const part = coloured(at(shape, (TUNNEL.from + TUNNEL.to) / 2, (TUNNEL.startFloor + BRIDGE_DOOR.y) / 2 + TUNNEL.height / 2, z), hex);
  return tile ? projectUv(part, tile) : part;
}

// The stub out of the glass, the rotunda and its pillar.
function buildRotunda(z) {
  const middle = ROTUNDA.bottom + ROTUNDA.height / 2;
  return [
    coloured(at(roundedBox(3, ROTUNDA.height - 0.4, 2.6, 0.2), 1.6, middle, z), CAB_GREY),
    coloured(at(roundedCylinder(ROTUNDA.radius, ROTUNDA.radius, ROTUNDA.height, 0.25, 20), ROTUNDA.x, middle, z), CAB_GREY),
    coloured(at(roundedCylinder(ROTUNDA.radius + 0.1, ROTUNDA.radius + 0.1, 0.3, 0.1, 20), ROTUNDA.x, ROTUNDA.bottom + ROTUNDA.height, z), 0x9aa1aa),
    coloured(at(roundedCylinder(0.55, 0.7, ROTUNDA.bottom, 0.1, 12), ROTUNDA.x, ROTUNDA.bottom / 2, z), 0xb8bec6),
  ];
}

// The drive leg: two posts down from under the tunnel to a bogie with a fat wheel at each end.
function buildLeg(z) {
  const under = TUNNEL.startFloor - ((TUNNEL.startFloor - BRIDGE_DOOR.y) * (LEG_X - TUNNEL.from)) / (TUNNEL.to - TUNNEL.from);
  const parts = [-0.6, 0.6].map((dz) => coloured(between(roundedBox(0.4, 1, 0.4, 0.08, { chamfered: true }), [LEG_X, 1.2, z + dz], [LEG_X, under + 0.1, z + dz]), 0x8a9099));
  parts.push(coloured(at(roundedBox(1.2, 0.5, 2.4, 0.12), LEG_X, 1.1, z), 0x5a6068));
  for (const side of [-1, 1]) {
    parts.push(coloured(at(roundedCylinder(0.6, 0.6, 0.45, 0.12, 16).rotateX(Math.PI / 2), LEG_X, 0.6, z + side * 1.35), DARK));
    parts.push(coloured(at(roundedCylinder(0.28, 0.28, 0.5, 0.06, 10).rotateX(Math.PI / 2), LEG_X, 0.6, z + side * 1.38), 0xb8bec6));
  }
  return parts;
}

// The cab, a little bigger than the tunnel, and its bellows hood in three folds.
function buildCab(z) {
  const middle = BRIDGE_DOOR.y + CAB.height / 2;
  const parts = [coloured(at(roundedBox(CAB.length, CAB.height, CAB.width, 0.25), CAB.x, middle, z), CAB_GREY)];
  for (let fold = 0; fold < 3; fold += 1) {
    const shrink = fold * 0.12;
    parts.push(coloured(at(roundedBox(0.36, CAB.height - 0.3 - shrink, CAB.width - 0.3 - shrink, 0.14), CAB.x + CAB.length / 2 + 0.2 + fold * 0.32, middle, z), 0x7d838c));
  }
  return parts;
}
