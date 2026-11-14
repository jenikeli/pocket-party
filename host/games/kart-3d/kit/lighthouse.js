// The kit's stone lighthouse (M7d3, rebuilt in M7d4d to the study of the reference seaside course's, docs/kart-reference.md):
// a tapering tower of irregular stones with deep mortar, a smooth tan plinth, arched white windows and door, a
// green balcony with a railing of balusters, a white lamp room with orange window frames, a glossy orange dome and
// a green clover weathervane. Takes the kit and `height` (the tower's, to the balcony) and returns the parts,
// [{ geometry, material }]; it stands on y = 0, its door facing +z. Used by the seaside surroundings.

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { createStoneMaps } from './stone-texture.js';
import { buildShaft, buildTowerPainted, buildTowerPanes, buildTowerGloss } from './lighthouse-tower.js';
import { buildTopPainted, buildTopGloss, buildDome, buildVane, buildGlass } from './lighthouse-top.js';
import { drawnOnce } from '../canvas-texture.js';

export function buildLighthouse(kit, height) {
  const { keep, materials } = kit;
  const stoneMaps = Object.values(drawnOnce('lighthouse-stone', createStoneMaps)).map(keep);
  const [map, normalMap, aoMap, roughnessMap] = stoneMaps;
  const stone = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map, normalMap, aoMap, roughnessMap, roughness: 1 }));
  // The dome is the glossiest thing on it, as in the study.
  const dome = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.2 }));
  const part = (shapes, material) => ({ geometry: keep(mergeShapes(shapes)), material });
  return [
    { geometry: keep(buildShaft(height)), material: stone },
    part([...buildTowerPainted(height), ...buildTowerPanes(height), ...buildTopPainted(height), ...buildVane(height)], materials.painted),
    part([...buildTowerGloss(), ...buildTopGloss(height)], materials.plastic),
    part(buildDome(height), dome),
    part(buildGlass(height), materials.glass),
  ];
}

// How far above the tower's foot the top of its weathervane is.
export function lighthouseTop(height) {
  return height + 6.75;
}
