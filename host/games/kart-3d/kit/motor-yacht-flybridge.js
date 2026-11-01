// The motor yacht's flybridge (M7d4d): the open upper deck on the cabin's roof, behind the cabin's front, with a rail
// round it, a helm console and a windscreen, a bench, a hardtop on four posts (the frame over it), and a radar on
// top. Used by motor-yacht.js.

import * as THREE from 'three';
import { at, between, coloured, roundedBox } from '../shape-utils.js';
import { evenPoints, railAlong } from './boat-rails.js';

const WHITE = 0xf8f8f4;
const POST_HEIGHT = 0.95;

// The parts, given the height `roofY` of the cabin's roof (its top face), which the flybridge stands on.
export function buildFlybridge(roofY) {
  return [...rail(roofY), ...hardtop(roofY), ...helm(roofY), ...radar(roofY + POST_HEIGHT + 0.08)];
}

// A rail along both sides and across the back of the roof's rear part.
function rail(roofY) {
  const corners = [[0.95, roofY, 0.2], [0.95, roofY, -2.55], [-0.95, roofY, -2.55], [-0.95, roofY, 0.2]];
  const path = corners.slice(1).flatMap((corner, leg) => evenPoints(corners[leg], corner, leg === 1 ? 4 : 5).slice(leg === 0 ? 0 : 1));
  return railAlong(path, 0.36, 0xe8e8e2, [1, 0.5]);
}

// The hardtop: a thin roof slab held up by four posts.
function hardtop(roofY) {
  const posts = [[0.9, -2.4], [-0.9, -2.4], [0.9, -0.5], [-0.9, -0.5]].map(([x, z]) => {
    return coloured(at(new THREE.CylinderGeometry(0.045, 0.045, POST_HEIGHT, 6), x, roofY + POST_HEIGHT / 2, z), WHITE);
  });
  return [...posts, coloured(at(roundedBox(2.05, 0.08, 2.2, 0.04), 0, roofY + POST_HEIGHT + 0.04, -1.45), WHITE)];
}

// The helm console with its windscreen at the front, and a bench at the back.
function helm(roofY) {
  return [
    coloured(at(roundedBox(1.0, 0.4, 0.45, 0.08), 0, roofY + 0.2, -0.3), 0xd8dde2),
    coloured(at(roundedBox(1.8, 0.35, 0.05, 0.02), 0, roofY + 0.5, 0.1), 0x3a5a78),
    coloured(at(roundedBox(1.4, 0.24, 0.4, 0.06), 0, roofY + 0.12, -2.2), 0x6b4226),
  ];
}

// A short mast on the hardtop with a radar bar across its top.
function radar(topY) {
  return [
    coloured(at(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6), 0, topY + 0.25, -1.1), 0xd8d8d0),
    coloured(between(new THREE.CylinderGeometry(0.03, 0.03, 1, 5), [-0.35, topY + 0.52, -1.1], [0.35, topY + 0.52, -1.1]), 0xd8d8d0),
  ];
}
