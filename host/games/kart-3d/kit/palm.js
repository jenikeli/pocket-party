// The kit's palm (M7d3, rebuilt in M7d4c2 to the study of MK8DX's Daisy Circuit palms): a ringed trunk with
// scalloped lips that curves as it rises (kit/palm-trunk.js), a crown with coconuts, and drooping fronds, each a
// folded leaf whose blades are cut out of a texture. Detail is in textures with relief (kit/palm-textures.js),
// not shapes. Two geometries (trunk and crown, fronds) so a whole grove draws as two instanced meshes. Stands
// on y = 0 and leans toward +x; each instance is turned and sized on its own. Used by kit/props.js, kit/kit.js
// and seaside-surroundings.js.

import * as THREE from 'three';
import { coloured, mergeShapes } from '../shape-utils.js';
import { createRandom, between as randomBetween } from '../random.js';
import { buildTrunk, trunkPoint } from './palm-trunk.js';
import { drawBark, drawFrond } from './palm-textures.js';

const FRONDS = 10;
const FROND_LENGTH = 4.4;
const FROND_WIDTH = 0.8;
const FROND_STEPS = 10;
// Points across a frond, from one edge over the midrib to the other (-1 to 1).
const ACROSS = [-1, -0.5, 0, 0.5, 1];

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

// Every frond round the crown, each turned a little differently, merged.
function buildFronds() {
  const random = createRandom(83);
  const top = trunkPoint(1);
  const fronds = Array.from({ length: FRONDS }, (_, index) => {
    const turn = (index / FRONDS) * 2 * Math.PI + randomBetween(random, -0.2, 0.2);
    const rise = randomBetween(random, 1.2, 2.2);
    return buildFrond(rise, randomBetween(random, 0.85, 1.1)).rotateY(turn).translate(top.x, top.y, top.z);
  });
  return mergeShapes(fronds);
}

// One frond along +x from its foot: its midrib rises by `rise` and droops past its foot's height toward the tip;
// across it, the halves fold down from the midrib in a shallow, rounded roof. Texture across 0..1 (the midrib at
// 0.5) and along 0..1 to the tip.
function buildFrond(rise, size) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const columns = ACROSS.length;
  for (let step = 0; step <= FROND_STEPS; step += 1) {
    const share = step / FROND_STEPS;
    const along = share * FROND_LENGTH * size;
    const height = (rise * share - (rise + 2) * share * share) * size;
    const halfWidth = FROND_WIDTH * size * Math.sin(Math.PI * Math.min(1, share * 1.2 + 0.08)) ** 0.6;
    for (const across of ACROSS) {
      positions.push(along, height - 0.4 * halfWidth * across * across, across * halfWidth);
      uvs.push(0.5 + across / 2, share);
    }
    if (step > 0) {
      for (let column = 0; column < columns - 1; column += 1) {
        const a = (step - 1) * columns + column;
        indices.push(a, a + columns, a + 1, a + 1, a + columns, a + columns + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // A plain white colour, so the fronds keep a colour attribute like every other prop's geometry.
  return coloured(geometry, 0xffffff);
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
