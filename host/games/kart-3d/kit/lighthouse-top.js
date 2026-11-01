// The top of the lighthouse (M7d4d), from the balcony up: the green balcony ring with its railing of balusters, the
// white lamp room with orange window frames and its glass, the glossy orange dome and the green clover weathervane.
// Used by kit/lighthouse.js, which gives each list its material. `height` is the tower's, to the balcony floor.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedBox, roundedCylinder } from '../shape-utils.js';
import { TOP_RADIUS } from './lighthouse-tower.js';
import { cloverGeometry } from './lighthouse-shapes.js';

const GREEN = 0x2f9a4a;
const ORANGE = 0xf08a2a;
const WHITE = 0xf4f0e6;
const RAILING_RADIUS = TOP_RADIUS + 1;
const BALUSTERS = 32;
// A fatter post with a ball on it every this many balusters.
const NEWEL_EVERY = 4;
const MULLIONS = 8;

// Where the lamp room's floor is, and so where the lamp room and dome stand.
export const lampBottom = (height) => height + 0.3;

// Green and white painted parts: the balcony floor and railing, and the lamp room's white base and rim.
export function buildTopPainted(height) {
  const parts = [coloured(at(roundedCylinder(TOP_RADIUS + 1.1, TOP_RADIUS + 0.9, 0.35, 0.09, 32), 0, height + 0.15, 0), GREEN)];
  for (const [rail, y] of [[0.1, height + 0.45], [0.12, height + 1.35]]) {
    parts.push(coloured(at(new THREE.TorusGeometry(RAILING_RADIUS, rail, 8, 48).rotateX(Math.PI / 2), 0, y, 0), GREEN));
  }
  for (let index = 0; index < BALUSTERS; index += 1) {
    const angle = (index / BALUSTERS) * 2 * Math.PI;
    const newel = index % NEWEL_EVERY === 0;
    const post = newel ? roundedCylinder(0.13, 0.13, 1.25, 0.04, 8) : roundedCylinder(0.07, 0.07, 0.9, 0.025, 6);
    parts.push(coloured(at(post, Math.cos(angle) * RAILING_RADIUS, height + (newel ? 0.95 : 0.9), Math.sin(angle) * RAILING_RADIUS), GREEN));
    if (newel) {
      parts.push(coloured(at(new THREE.SphereGeometry(0.17, 8, 6), Math.cos(angle) * RAILING_RADIUS, height + 1.65, Math.sin(angle) * RAILING_RADIUS), GREEN));
    }
  }
  const bottom = lampBottom(height);
  parts.push(coloured(at(roundedCylinder(1.95, 1.95, 0.6, 0.1, 24), 0, bottom + 0.3, 0), WHITE));
  parts.push(coloured(at(roundedCylinder(2.15, 2.15, 0.3, 0.08, 24), 0, bottom + 3.1, 0), WHITE));
  return parts;
}

// Glossy orange parts: the lamp room's window frames, the dome's rim and the dome with its ball.
export function buildTopGloss(height) {
  const bottom = lampBottom(height);
  const parts = [];
  for (let index = 0; index < MULLIONS; index += 1) {
    const angle = (index / MULLIONS) * 2 * Math.PI;
    const mullion = roundedBox(0.2, 2.4, 0.2, 0.05, { chamfered: true }).translate(0, 0, 1.74).rotateY(angle);
    parts.push(coloured(at(mullion, 0, bottom + 1.8, 0), ORANGE));
  }
  parts.push(coloured(at(roundedCylinder(1.9, 1.9, 0.14, 0.04, 24), 0, bottom + 0.7, 0), ORANGE));
  parts.push(coloured(at(roundedCylinder(1.9, 1.9, 0.14, 0.04, 24), 0, bottom + 2.9, 0), ORANGE));
  parts.push(coloured(at(roundedCylinder(2.1, 2.1, 0.2, 0.06, 24), 0, bottom + 3.35, 0), ORANGE));
  return parts;
}

// The dome, its ball and the weathervane's pole and clover, topped out at height + 6.7 (lighthouseTop allows 6.75).
export function buildDome(height) {
  const bottom = lampBottom(height);
  return [
    coloured(at(new THREE.SphereGeometry(2, 32, 12, 0, 2 * Math.PI, 0, Math.PI / 2), 0, bottom + 3.45, 0), ORANGE),
    coloured(at(new THREE.SphereGeometry(0.28, 12, 8), 0, bottom + 5.5, 0), ORANGE),
  ];
}

export function buildVane(height) {
  const bottom = lampBottom(height);
  const pole = roundedCylinder(0.04, 0.04, 0.6, 0.015, 6);
  const clover = mergeShapes(cloverGeometry(0.16, 0.05));
  return [coloured(at(pole, 0, bottom + 5.9, 0), GREEN), coloured(at(clover, 0, bottom + 6.05, 0), GREEN)];
}

// The lamp room's glass and the lamp inside it, off by day.
export function buildGlass(height) {
  const bottom = lampBottom(height);
  return [at(new THREE.CylinderGeometry(1.7, 1.7, 2.4, 20, 1, true), 0, bottom + 1.8, 0), at(new THREE.SphereGeometry(0.7, 12, 8), 0, bottom + 1.6, 0)];
}
