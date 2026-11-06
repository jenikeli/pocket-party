// The airport's floodlight (M9 task K), after the one on Sunshine Airport's apron: a tall three-legged lattice
// mast with a hexagonal railing and a cabinet at its foot, a ring of lamp boxes on a platform at its top, and a long
// ribbon banner (our own lettering) swooping from the top down along the road. Lit only at night on MK8DX, so by
// day the lamps are glass. Takes the kit and returns the parts: the steel (coloured per vertex), the glass and the
// ribbon (its own textured material); standing on y = 0, the ribbon trailing toward +x. Used by kit/props.js.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes, roundedBox, roundedCylinder } from '../shape-utils.js';
import { createSignTexture, CORAL, SUN_YELLOW } from './hangar-maps.js';
import { PAINT, box } from './airport-vehicle-parts.js';

const HEIGHT = 11;
const FOOT = 0.75;
const TOP = 0.32;
const LEVELS = 5;
const LAMPS = 6;
const RING_RADIUS = 1.45;
const RAILING_RADIUS = 1.9;
const STEEL = 0xb4b9c1;
const rod = (radius, from, to, colour) => coloured(between(new THREE.CylinderGeometry(radius, radius, 1, 5, 1, true), from, to), colour);

// Where a leg stands at height y: three legs round the mast, leaning in toward the top.
const leg = (index, y) => {
  const spread = FOOT + ((TOP - FOOT) * y) / HEIGHT;
  const angle = (index / 3) * 2 * Math.PI + Math.PI / 6;
  return [Math.cos(angle) * spread, y, Math.sin(angle) * spread];
};

// The mast: three fat legs braced in zigzags, with a collar at every other joint (the rods are open tubes, 10
// triangles each, as the mast is far off).
function mast() {
  const parts = [0, 1, 2].map((index) => rod(0.1, leg(index, 0.3), leg(index, HEIGHT), STEEL));
  for (let level = 0; level < LEVELS; level += 1) {
    const [low, high] = [level, level + 1].map((step) => 0.3 + (step / LEVELS) * (HEIGHT - 0.3));
    for (let index = 0; index < 3; index += 1) {
      parts.push(rod(0.05, leg(index, low), leg((index + 1) % 3, high), STEEL));
    }
  }
  for (let level = 0; level <= LEVELS; level += 2) {
    const y = 0.3 + (level / LEVELS) * (HEIGHT - 0.3);
    for (let index = 0; index < 3; index += 1) {
      const [x, , z] = leg(index, y);
      parts.push(coloured(at(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 6), x, y, z), STEEL));
    }
  }
  return parts;
}

// The foot: a round plinth, a cabinet and a hexagonal railing of two rails round it.
function foot() {
  const corner = (index) => [Math.cos((index / 6) * 2 * Math.PI) * RAILING_RADIUS, Math.sin((index / 6) * 2 * Math.PI) * RAILING_RADIUS];
  const railing = [0, 1, 2, 3, 4, 5].flatMap((index) => {
    const [[x1, z1], [x2, z2]] = [corner(index), corner((index + 1) % 6)];
    return [
      rod(0.07, [x1, 0.1, z1], [x1, 1.1, z1], PAINT.darkGrey),
      rod(0.05, [x1, 1.05, z1], [x2, 1.05, z2], PAINT.darkGrey),
      rod(0.05, [x1, 0.55, z1], [x2, 0.55, z2], PAINT.darkGrey),
    ];
  });
  return [
    coloured(at(roundedCylinder(RAILING_RADIUS + 0.2, RAILING_RADIUS + 0.2, 0.1, 0.04, 12), 0, 0.05, 0), 0xa8a6a0),
    box(PAINT.grey, [0.9, 0.75, 0.7], [0.9, 0.5, 0.1], 0.1),
    box(PAINT.darkGrey, [0.95, 0.12, 0.75], [0.9, 0.93, 0.1], 0.05),
    ...railing,
  ];
}

// The platform at the top and the ring of lamps on it: a disc, a ring on posts, and six lamp boxes tilted out and
// down, each in a dark frame with a round glass lens (returned apart, `glass`).
function head() {
  const steel = [
    coloured(at(roundedCylinder(0.6, 0.55, 0.18, 0.05, 10), 0, HEIGHT + 0.1, 0), PAINT.darkGrey),
    coloured(at(new THREE.TorusGeometry(RING_RADIUS, 0.08, 5, 20).rotateX(Math.PI / 2), 0, HEIGHT + 0.55, 0), STEEL),
  ];
  const glass = [];
  for (let index = 0; index < LAMPS; index += 1) {
    const angle = (index / LAMPS) * 2 * Math.PI;
    const [x, z] = [Math.cos(angle) * RING_RADIUS, Math.sin(angle) * RING_RADIUS];
    steel.push(rod(0.05, [Math.cos(angle) * 0.3, HEIGHT + 0.15, Math.sin(angle) * 0.3], [x, HEIGHT + 0.55, z], STEEL));
    // A lamp box faces outward (+z in its own frame) and tips down; its frame and lens ride with it.
    const lamp = new THREE.Matrix4().makeRotationY(Math.PI / 2 - angle).multiply(new THREE.Matrix4().makeRotationX(0.45));
    const place = (shape) => shape.applyMatrix4(lamp).translate(x, HEIGHT + 0.55, z);
    steel.push(place(coloured(at(roundedBox(0.85, 0.55, 0.3, 0.06, { chamfered: true }), 0, 0, 0.05), PAINT.white)));
    steel.push(place(coloured(at(roundedBox(0.95, 0.12, 0.4, 0.03, { chamfered: true }), 0, 0.3, 0.12), PAINT.darkGrey)));
    glass.push(place(new THREE.SphereGeometry(0.2, 8, 4, 0, 2 * Math.PI, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.5).translate(0, 0, 0.2)));
  }
  return { steel, glass: mergeShapes(glass) };
}

// The ribbon: a strip standing on edge, swooping from the top down to near the ground along +x. It leans over
// (twists about its own length) on the way and comes back, so it shows its face and its edge as the one in the
// reference does. Double-sided.
const RIBBON_WIDTH = 1.3;
const RIBBON_STEPS = 14;
const RIBBON_REACH = 2.9;
const RIBBON_DROP = 6.2;
export function ribbonShape() {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let step = 0; step <= RIBBON_STEPS; step += 1) {
    const share = step / RIBBON_STEPS;
    const [x, y] = [0.1 + RIBBON_REACH * share, HEIGHT + 0.3 - RIBBON_DROP * share * (0.55 + 0.45 * share)];
    const lean = Math.sin(share * Math.PI) * 0.5;
    const [up, across] = [Math.cos(lean) * RIBBON_WIDTH / 2, Math.sin(lean) * RIBBON_WIDTH / 2];
    positions.push(x, y + up, across, x, y - up, -across);
    uvs.push(share, 1, share, 0);
    if (step > 0) {
      const base = (step - 1) * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  const strip = new THREE.BufferGeometry();
  strip.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  strip.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  strip.setIndex(indices);
  strip.computeVertexNormals();
  return strip;
}

export function buildAirfieldFloodlight(kit) {
  const top = head();
  const ribbonTexture = createSignTexture({ text: 'PALM BAY AIRPORT', board: CORAL, ink: 0xffffff, stripe: SUN_YELLOW, width: 512, height: 96 });
  const ribbon = new THREE.MeshStandardMaterial({ map: kit.keep(ribbonTexture), side: THREE.DoubleSide, roughness: 0.6 });
  return [
    { geometry: kit.keep(mergeShapes([...mast(), ...foot(), ...top.steel])), material: kit.materials.iron },
    { geometry: kit.keep(top.glass), material: kit.materials.glass },
    { geometry: kit.keep(ribbonShape()), material: kit.keep(ribbon) },
  ];
}
