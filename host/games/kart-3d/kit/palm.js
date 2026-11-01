// The kit's palm (M7d3; rebuilt in M7d4c2 to the study of MK8DX's Daisy Circuit palms, and in M7d4c4 brought
// close to the palm made in Blender, tools/blender/palm.py): a trunk of scalloped scales that curves as it rises
// (kit/palm-trunk.js), a crown with coconuts, and drooping fronds, each a folded card (kit/palm-frond.js) whose
// broad blades are cut out of a texture. Detail is in textures with relief (kit/palm-textures.js). Two geometries
// (trunk and crown, fronds) so a whole grove draws as two instanced meshes. Stands on y = 0 and leans toward +x;
// each instance is turned and sized on its own. Used by kit/props.js, kit/kit.js and seaside-surroundings.js.

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { createRandom, between as randomBetween } from '../random.js';
import { buildTrunk, trunkPoint } from './palm-trunk.js';
import { buildFrondCard } from './palm-frond.js';
import { drawBark, drawFrond } from './palm-textures.js';

const FRONDS = 10;

// The palm's parts for the props (kit/props.js): its two geometries with the kit's palm materials.
export function buildPalmParts(kit) {
  const { trunk, fronds } = buildPalm();
  return [
    { geometry: kit.keep(trunk), material: kit.palm.trunk },
    { geometry: kit.keep(fronds), material: kit.palm.fronds },
  ];
}

// Returns { trunk, fronds }: two geometries to share between every palm.
export function buildPalm() {
  return { trunk: buildTrunk(), fronds: buildFronds() };
}

// Every frond round the crown, each turned, raised and sized a little differently (seeded, so every build is the
// same), merged.
function buildFronds() {
  const random = createRandom(89);
  const top = trunkPoint(1);
  const fronds = Array.from({ length: FRONDS }, (_, index) => {
    const turn = (index / FRONDS) * 2 * Math.PI + randomBetween(random, -0.2, 0.2);
    const rise = randomBetween(random, 1.2, 2.2);
    return buildFrondCard(rise, randomBetween(random, 0.85, 1.1)).rotateY(turn).translate(top.x, top.y, top.z);
  });
  return mergeShapes(fronds);
}

// The palm's two materials, { trunk, fronds }, every texture passed through `keep`. The trunk's vertex colours
// shade it (and tint the crown); the fronds' blades are cut out of the texture (alphaTest), seen from both sides.
export function createPalmMaterials(keep) {
  const bark = drawBark();
  const frond = drawFrond();
  Object.values(bark).forEach(keep);
  Object.values(frond).forEach(keep);
  return {
    trunk: keep(new THREE.MeshStandardMaterial({ ...bark, vertexColors: true, roughness: 1 })),
    fronds: keep(new THREE.MeshStandardMaterial({ ...frond, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 })),
  };
}
