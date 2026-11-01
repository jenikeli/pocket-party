// The kit's hut on stilts (M7d3, rebuilt in M7d4d to the M7d4 study), as at MK8DX's Cheep Cheep Beach: a plank
// hut on a plank deck held over the water by stilts, with a door, a window, flower boxes of red flowers, white
// posts with a rope along the walkway toward the beach, a ladder to the water, and a thick layered thatch roof
// with a ragged edge and a ridge roll. Three parts: the wood (planks textured), the painted bits (white posts,
// rope, flowers) and the thatch. Stands with its stilts' feet at y = -1.5 (the sea comes to the deck's
// underside, so the stilts show), its door facing +z. Takes the kit and returns the parts, [{ geometry,
// material }]. Used by the seaside surroundings.

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { createRandom } from '../random.js';
import { createThatchMaps } from './thatch-texture.js';
import { buildRoof } from './stilt-hut-roof.js';
import { buildWood, FLOOR, WALLS } from './stilt-hut-wood.js';
import { buildPosts } from './stilt-hut-posts.js';
import { flowerBox } from './stilt-hut-flowers.js';

// Where the thatch's tile repeats on the roof.
const THATCH_REPEAT = [3, 1.5];

// The three merged geometries, { wood, painted, thatch }, the same every time. Apart from the textures, so a
// test can build them in Node.
export function buildStiltHutGeometry() {
  const random = createRandom(29);
  const frontOfWalls = WALLS.centreZ + WALLS.depth / 2;
  const boxes = [
    flowerBox(-1.4, FLOOR + 0.45, 2.27, 1.2, random),
    flowerBox(1.4, FLOOR + 0.45, 2.27, 1.2, random),
    flowerBox(0.85, FLOOR + 0.78, frontOfWalls + 0.2, 0.95, random),
  ];
  return {
    wood: mergeShapes([...buildWood(random), ...boxes.flatMap((box) => box.wood)]),
    painted: mergeShapes([...buildPosts(), ...boxes.flatMap((box) => box.plants)]),
    thatch: buildRoof(FLOOR + WALLS.height, WALLS.centreZ),
  };
}

export function buildStiltHut(kit) {
  const { keep, textures, materials } = kit;
  const geometry = buildStiltHutGeometry();
  const thatchMaps = createThatchMaps();
  Object.values(thatchMaps).forEach((map) => {
    map.repeat.set(...THATCH_REPEAT);
    keep(map);
  });
  const wood = new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.wood, normalMap: textures.woodRelief, roughness: 0.85 });
  const thatch = new THREE.MeshStandardMaterial({ ...thatchMaps, vertexColors: true, roughness: 1 });
  return [
    { geometry: keep(geometry.wood), material: keep(wood) },
    { geometry: keep(geometry.painted), material: materials.painted },
    { geometry: keep(geometry.thatch), material: keep(thatch) },
  ];
}
