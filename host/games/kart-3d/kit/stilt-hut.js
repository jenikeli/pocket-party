// The kit's hut on stilts (M7d3), as at MK8DX's Cheep Cheep Beach: a plank hut on a deck held over the water by
// stilts, with a door, a window, a ladder down to the water, a short walkway toward the beach, and a steep roof
// of straw thatch. Two parts: the wood (planks textured, coloured per vertex) and the thatch. Stands with its
// stilts' feet at y = 0 (the sea), its door facing +z. Takes the kit and returns the parts,
// [{ geometry, material }]. Used by the seaside surroundings.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes, roundedBox } from '../shape-utils.js';
import { createThatchTexture } from './thatch-texture.js';

const DECK = 2.6;
const WALLS = { width: 3.4, depth: 3, height: 2.3 };
const COLORS = { stilt: 0x8a6a48, deck: 0xc8a878, wall: 0xe0c49a, trim: 0x7a5232, door: 0x5a3a22, window: 0x2a4050, frame: 0xf4f0e6 };

export function buildStiltHut(kit) {
  const { keep } = kit;
  const thatchTexture = keep(createThatchTexture());
  thatchTexture.repeat.set(3, 1.5);
  return [
    { geometry: keep(buildWood()), material: keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: kit.textures.wood, roughness: 0.85 })) },
    { geometry: keep(buildThatch()), material: keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: thatchTexture, roughness: 0.95 })) },
  ];
}

function buildWood() {
  const parts = [];
  for (const x of [-1.7, 0, 1.7]) {
    for (const z of [-1.6, 1.6]) {
      parts.push(coloured(at(new THREE.CylinderGeometry(0.14, 0.17, DECK + 1.5, 7), x, (DECK - 1.5) / 2, z), COLORS.stilt));
    }
  }
  parts.push(coloured(at(new THREE.BoxGeometry(4.4, 0.2, 4.2), 0, DECK, 0), COLORS.deck));
  // The walls on the deck, a darker beam round their top and foot, corner posts.
  const floor = DECK + 0.1;
  parts.push(coloured(at(new THREE.BoxGeometry(WALLS.width, WALLS.height, WALLS.depth), 0, floor + WALLS.height / 2, -0.3), COLORS.wall));
  for (const y of [floor + 0.08, floor + WALLS.height - 0.08]) {
    parts.push(coloured(at(new THREE.BoxGeometry(WALLS.width + 0.1, 0.16, WALLS.depth + 0.1), 0, y, -0.3), COLORS.trim));
  }
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      parts.push(coloured(at(new THREE.BoxGeometry(0.16, WALLS.height, 0.16), (x * WALLS.width) / 2, floor + WALLS.height / 2, -0.3 + (z * WALLS.depth) / 2), COLORS.trim));
    }
  }
  const front = -0.3 + WALLS.depth / 2;
  parts.push(coloured(at(roundedBox(0.9, 1.6, 0.08, 0.03), -0.6, floor + 0.8, front + 0.03), COLORS.door));
  parts.push(coloured(at(roundedBox(0.8, 0.7, 0.06, 0.03), 0.85, floor + 1.35, front + 0.03), COLORS.window));
  for (const [width, height, y] of [[0.96, 0.08, 1.74], [0.96, 0.08, 0.96], [0.08, 0.86, 1.35]]) {
    parts.push(coloured(at(new THREE.BoxGeometry(width, height, 0.08), 0.85, floor + y, front + 0.07), COLORS.frame));
  }
  // A rail round the front of the deck.
  for (const x of [-2.1, -1, 1, 2.1]) {
    parts.push(coloured(at(new THREE.BoxGeometry(0.08, 0.8, 0.08), x, floor + 0.4, 2), COLORS.trim));
  }
  parts.push(coloured(at(new THREE.BoxGeometry(4.3, 0.08, 0.08), 0, floor + 0.78, 2), COLORS.trim));
  // The walkway toward the beach, on its own posts, and a ladder down to the water at the side.
  parts.push(coloured(at(new THREE.BoxGeometry(1.1, 0.12, 4), 0, DECK - 0.05, 4), COLORS.deck));
  for (const z of [3, 5.6]) {
    parts.push(coloured(at(new THREE.CylinderGeometry(0.1, 0.12, DECK + 1, 6), -0.5, (DECK - 1) / 2, z), COLORS.stilt));
    parts.push(coloured(at(new THREE.CylinderGeometry(0.1, 0.12, DECK + 1, 6), 0.5, (DECK - 1) / 2, z), COLORS.stilt));
  }
  for (const z of [-0.35, 0.35]) {
    parts.push(coloured(between(new THREE.BoxGeometry(0.07, 1, 0.07), [2.3, -0.5, z], [2.3, DECK, z]), COLORS.trim));
  }
  for (let rung = 0; rung < 4; rung += 1) {
    parts.push(coloured(at(new THREE.BoxGeometry(0.06, 0.06, 0.7), 2.3, 0.1 + rung * 0.6, 0), COLORS.trim));
  }
  return mergeShapes(parts);
}

// A four-sided roof (a pyramid turned square to the walls) overhanging them, a second smaller one on top for a
// layered look, and a little topknot.
function buildThatch() {
  const top = DECK + 0.1 + WALLS.height;
  const roof = new THREE.ConeGeometry(3.4, 2.2, 4, 1).rotateY(Math.PI / 4).scale(1.05, 1, 0.95);
  const cap = new THREE.ConeGeometry(1.5, 1.1, 4, 1).rotateY(Math.PI / 4);
  return mergeShapes([
    coloured(at(roof, 0, top + 1.0, -0.3), 0xffffff),
    coloured(at(cap, 0, top + 2.0, -0.3), 0xe8e0d0),
    coloured(at(new THREE.CylinderGeometry(0.12, 0.2, 0.5, 6), 0, top + 2.6, -0.3), 0xd8c8a8),
  ]);
}
