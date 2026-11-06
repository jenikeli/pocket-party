// The shape of the kit's palm fronds (M7d4c4, after M7d4c2's Blender palm, since removed): a frond is a
// midrib that rises from the crown and droops past it, with blades on both sides angled toward the tip. The
// blades are drawn into one texture (kit/palm-textures.js) and shown on a folded card, the same for every frond,
// so the card and the texture share these measures. Used by kit/palm.js and kit/palm-textures.js.

import * as THREE from 'three';
import { coloured } from '../shape-utils.js';

export const FROND_LENGTH = 4.4;
// How far out from the midrib the longest blades reach.
const FROND_WIDTH = 0.85;
// Each half of a frond slopes down from the midrib like a roof, by this much per metre out.
const FOLD = 0.35;
export const BLADE_ANGLE = (50 * Math.PI) / 180;
// How far ahead (toward the tip, as a share of the frond's length) a blade's tip lies from its foot.
const BLADE_LEAD = 0.16;
const CARD_STEPS = 10;
// Points across a card, from one edge over the midrib to the other (-1 to 1).
const CARD_ACROSS = [-1, -0.5, 0, 0.5, 1];

// How far out from the midrib the blades whose feet are at `share` along the frond reach: shortest at the foot
// and the tip.
export function bladeReach(share) {
  return FROND_WIDTH * Math.sin(Math.PI * (0.06 + 0.94 * share)) ** 0.6;
}

// Half the card's width at `share`: it must also cover blades from further back, whose tips reach past their own
// share.
function cardReach(share) {
  return 1.08 * Math.max(bladeReach(share), bladeReach(Math.max(0, share - BLADE_LEAD))) + 0.03;
}

// Half the widest card, the half-width the texture spans across (u 0 to 1).
export const CARD_HALF_WIDTH = Math.max(...Array.from({ length: 101 }, (_, step) => cardReach(step / 100)));

// The midrib's height `share` of the way along a frond: it rises by about `rise`, then droops 2 below its foot
// at the tip.
function frondHeight(share, rise) {
  return rise * share - (rise + 2) * share * share;
}

// One frond's card along +x from its foot, its midrib rising by `rise`, `size` times the usual size: CARD_STEPS
// rows along it of CARD_ACROSS points, its halves sloping down from the midrib. Texture u runs across (the midrib
// at 0.5, the widest card's edges at 0 and 1), v along to the tip.
export function buildFrondCard(rise, size) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const columns = CARD_ACROSS.length;
  for (let step = 0; step <= CARD_STEPS; step += 1) {
    const share = step / CARD_STEPS;
    for (const across of CARD_ACROSS) {
      const lateral = across * cardReach(share);
      positions.push(share * FROND_LENGTH * size, (frondHeight(share, rise) - FOLD * Math.abs(lateral)) * size, lateral * size);
      uvs.push(0.5 + lateral / (2 * CARD_HALF_WIDTH), share);
    }
    for (let column = 0; step > 0 && column < columns - 1; column += 1) {
      const a = (step - 1) * columns + column;
      // Wound so the card faces up (its normals point up), as the texture's relief is drawn.
      indices.push(a, a + 1, a + columns, a + 1, a + columns + 1, a + columns);
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
