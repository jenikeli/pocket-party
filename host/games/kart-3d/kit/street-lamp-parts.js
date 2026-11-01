// The shared parts of the kit's street lamps (M7d4c4): a flared iron post with gold collar rings, a spike finial,
// a scroll bracket and a four-sided lantern under a pyramid roof. Each returns a list of coloured shapes (iron
// material, vertex colours) ready for mergeShapes. Everything small is chamfered, since lamps stand in rows of
// dozens. Used by kit/street-lamps.js.

import * as THREE from 'three';
import { at, between, coloured, roundedBox, roundedCylinder } from '../shape-utils.js';

export const IRON = 0x2b2f36;
export const GOLD = 0xc8a23a;

// A gold collar ring round a post at height y.
export function collar(y, radius) {
  return coloured(at(roundedCylinder(radius, radius, 0.1, 0.035, 10), 0, y, 0), GOLD);
}

// A post from y = from to y = to, flaring out at its foot like a bell, with a gold ring at each end of the flare.
export function flaredPost(from, to, footRadius, shaftRadius) {
  const flare = 0.9;
  const profile = [new THREE.Vector2(0, from)];
  for (let step = 0; step <= 6; step += 1) {
    const along = step / 6;
    profile.push(new THREE.Vector2(shaftRadius + (footRadius - shaftRadius) * (1 - along) ** 3, from + flare * along));
  }
  profile.push(new THREE.Vector2(shaftRadius, to), new THREE.Vector2(0, to));
  return [
    coloured(new THREE.LatheGeometry(profile, 10), IRON),
    collar(from + flare, shaftRadius + 0.04),
    collar(to - 0.12, shaftRadius + 0.04),
  ];
}

// A ball with a spike on top, standing on y.
export function finial(x, y, z) {
  return [
    coloured(at(new THREE.SphereGeometry(0.1, 8, 6), x, y + 0.07, z), GOLD),
    coloured(at(new THREE.ConeGeometry(0.05, 0.3, 6), x, y + 0.26, z), IRON),
  ];
}

// A scroll bracket: a diagonal brace from `from` to `to` ([x, y, z] each), with a curl at its lower end, turned
// about y by `curlTurn` so it lies in the brace's plane. Used under an arm or a crossbar.
export function scrollBrace(from, to, curlTurn) {
  const curl = new THREE.TorusGeometry(0.14, 0.04, 5, 10, Math.PI * 1.5).rotateY(curlTurn);
  return [
    coloured(between(new THREE.CylinderGeometry(0.05, 0.05, 1, 5), from, to), IRON),
    coloured(at(curl, from[0], from[1] - 0.03, from[2]), IRON),
  ];
}

// A lantern standing on y = baseY at (x, z): a base slab, four corner posts, a top ring, a pyramid roof and a
// finial, round a box of glass. Returns { iron: [shapes], glass: shape }.
export function lantern(x, baseY, z) {
  const post = (side, depth) =>
    coloured(at(roundedBox(0.05, 0.52, 0.05, 0.012, { chamfered: true }), x + side * 0.15, baseY + 0.33, z + depth * 0.15), IRON);
  return {
    iron: [
      coloured(at(roundedBox(0.4, 0.08, 0.4, 0.02, { chamfered: true }), x, baseY + 0.04, z), IRON),
      post(-1, -1), post(1, -1), post(-1, 1), post(1, 1),
      coloured(at(roundedBox(0.38, 0.06, 0.38, 0.02, { chamfered: true }), x, baseY + 0.62, z), IRON),
      coloured(at(new THREE.ConeGeometry(0.34, 0.24, 4).rotateY(Math.PI / 4), x, baseY + 0.77, z), IRON),
      ...finial(x, baseY + 0.89, z),
    ],
    glass: at(new THREE.BoxGeometry(0.27, 0.5, 0.27), x, baseY + 0.33, z),
  };
}
