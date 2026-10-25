// The shapes of Seaside Skyway's props (M7c), our own, from Three.js's simple shapes, each coloured per vertex
// and merged so a whole set of one prop draws as one instanced mesh: a palm (trunk and crown), a rock, a
// sailboat, a cloud and the lighthouse's tower. Each stands on y = 0 at its middle. Used by
// host/games/kart-3d/seaside-scenery.js.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes } from './shape-utils.js';

const COLORS = {
  trunk: 0x8a6239,
  leaf: 0x3f9a2e,
  coconut: 0x5a3a1c,
  rock: 0x8d8a84,
  hull: 0xf4f4f0,
  hullStripe: 0x2a62c9,
  mast: 0x7a5530,
  sail: 0xfdfbf2,
  towerWhite: 0xf2f2f0,
  towerRed: 0xd8302a,
  gallery: 0x2a2d35,
  glass: 0x9fc6e8,
};
const PALM_HEIGHT = 9;

// A palm about 11 tall: a tapering trunk leaning a little, and a crown of drooping leaves round its top.
export function buildPalm() {
  const top = [0.9, PALM_HEIGHT, 0];
  const leaves = Array.from({ length: 7 }, (_, index) => {
    const leaf = new THREE.ConeGeometry(0.7, 5.5, 4).rotateZ(-Math.PI / 2).scale(1, 0.25, 1);
    // Out from the top and drooping, turned round the trunk.
    leaf.translate(2.6, 0, 0).rotateZ(-0.45).rotateY((index / 7) * 2 * Math.PI);
    return coloured(at(leaf, ...top), COLORS.leaf);
  });
  return mergeShapes([
    coloured(between(new THREE.CylinderGeometry(0.3, 0.5, 1, 7), [0, 0, 0], top), COLORS.trunk),
    ...leaves,
    coloured(at(new THREE.SphereGeometry(0.55, 8, 6), top[0], top[1] - 0.4, top[2]), COLORS.coconut),
  ]);
}

// A rock with flat facets, about 1 across (scaled per instance).
export function buildRock() {
  // Polyhedra come unindexed, so their normals can be worked out per face: flat facets, not a smooth ball.
  const rock = new THREE.IcosahedronGeometry(1, 0).scale(1, 0.7, 1);
  rock.computeVertexNormals();
  return coloured(rock, COLORS.rock);
}

// A small sailboat about 5 long, facing +z: a rounded white hull under a blue-edged deck, a mast and a sail (a
// flattened cone, so it shows from both sides).
export function buildBoat() {
  const hull = new THREE.SphereGeometry(1, 14, 6, 0, 2 * Math.PI, Math.PI / 2, Math.PI / 2).scale(1, 0.7, 2.5);
  return mergeShapes([
    coloured(hull, COLORS.hull),
    coloured(at(new THREE.CylinderGeometry(1.02, 1.02, 0.2, 14).scale(1, 1, 2.5), 0, -0.05, 0), COLORS.hullStripe),
    coloured(at(new THREE.CylinderGeometry(0.07, 0.07, 6.5, 6), 0, 3.25, 0.3), COLORS.mast),
    coloured(at(new THREE.ConeGeometry(1.4, 5.5, 4).scale(0.06, 1, 1), 0, 3.4, -0.8), COLORS.sail),
  ]);
}

// A puffy cloud about 30 across and flat underneath, from overlapping balls.
export function buildCloud() {
  const puffs = [[0, 3, 0, 7], [-8, 1.5, 1, 5.5], [8, 2, -1, 6], [-3, 1, -5, 5], [4, 1, 5, 5], [-13, 0.5, -1, 3.5], [13, 0.5, 1, 4]];
  return mergeShapes(puffs.map(([x, y, z, radius]) => at(new THREE.SphereGeometry(radius, 12, 8).scale(1, 0.65, 1), x, y, z)));
}

// The lighthouse's tower, `height` tall: red and white bands, a dark gallery and a glass lamp room under a red
// roof. Its lamp is drawn apart (seaside-scenery.js); it sits at lighthouseLampHeight(height).
export function buildLighthouse(height) {
  const bands = 6;
  const towerHeight = height - 5;
  const parts = Array.from({ length: bands }, (_, band) => {
    const bottom = (band / bands) * towerHeight;
    const radiusAt = (y) => 3.2 - (1.1 * y) / towerHeight;
    const shape = new THREE.CylinderGeometry(radiusAt(bottom + towerHeight / bands), radiusAt(bottom), towerHeight / bands, 16);
    return coloured(at(shape, 0, bottom + towerHeight / bands / 2, 0), band % 2 === 0 ? COLORS.towerWhite : COLORS.towerRed);
  });
  parts.push(
    coloured(at(new THREE.CylinderGeometry(3, 3, 0.6, 16), 0, towerHeight + 0.3, 0), COLORS.gallery),
    coloured(at(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 12, 1, true), 0, towerHeight + 1.8, 0), COLORS.glass),
    coloured(at(new THREE.ConeGeometry(2.2, 2, 12), 0, towerHeight + 4, 0), COLORS.towerRed),
  );
  return mergeShapes(parts);
}

export function lighthouseLampHeight(height) {
  return height - 5 + 1.8;
}
