// The kit's palm (M7d3), as on MK8DX's beaches (Cheep Cheep Beach, Toad Harbor): a ringed trunk that curves as it
// rises, a crown with coconuts, and drooping fronds, each a folded leaf whose many blades are cut out of a
// texture. Two geometries (the trunk and crown coloured per vertex, the fronds textured) so a whole grove draws
// as two instanced meshes. Stands on y = 0 and leans toward +x; each instance is turned and sized on its own.
// Used by kit/props.js and the seaside landmarks.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes } from '../shape-utils.js';
import { createCanvas, canvasTexture } from '../canvas-texture.js';
import { createRandom, between as randomBetween } from '../random.js';

const HEIGHT = 8.5;
const LEAN = 1.6;
const RINGS = 10;
const TRUNK_COLORS = [0x9c7447, 0x86613b];
const FRONDS = 10;
const FROND_LENGTH = 4.4;
const FROND_WIDTH = 0.8;
const FROND_STEPS = 8;

// The trunk's centre line at `share` (0 at the foot, 1 at the crown): it rises straight and bends over near the
// top, a quadratic curve.
function trunkPoint(share) {
  const bend = share * share;
  return new THREE.Vector3(LEAN * bend, HEIGHT * share, 0);
}

// Returns { trunk, fronds }: two geometries to share between every palm.
export function buildPalm() {
  return { trunk: buildTrunk(), fronds: buildFronds() };
}

// Ring after ring, each a little wider at its top than the next one's foot, so the joins show as rings; the
// crown and three coconuts on top.
function buildTrunk() {
  const parts = Array.from({ length: RINGS }, (_, ring) => {
    const from = trunkPoint(ring / RINGS);
    const to = trunkPoint((ring + 1) / RINGS);
    const radius = 0.4 - (0.16 * ring) / RINGS;
    // Open-ended: each ring's ends are hidden inside its neighbours.
    const segment = new THREE.CylinderGeometry(radius * 1.07, radius * 0.96, 1, 9, 1, true);
    return coloured(between(segment, from.toArray(), to.toArray()), TRUNK_COLORS[ring % 2]);
  });
  const top = trunkPoint(1);
  parts.push(coloured(at(new THREE.SphereGeometry(0.42, 8, 6), top.x, top.y, top.z), 0x6f7a2e));
  for (let nut = 0; nut < 3; nut += 1) {
    const angle = (nut / 3) * 2 * Math.PI;
    parts.push(coloured(at(new THREE.SphereGeometry(0.22, 6, 5), top.x + Math.cos(angle) * 0.32, top.y - 0.32, top.z + Math.sin(angle) * 0.32), 0x5a3a1c));
  }
  return mergeShapes(parts);
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
// across it, the two halves fold down from the midrib like a shallow roof. Texture across 0..1 (the midrib at
// 0.5) and along 0..1 to the tip.
function buildFrond(rise, size) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let step = 0; step <= FROND_STEPS; step += 1) {
    const share = step / FROND_STEPS;
    const along = share * FROND_LENGTH * size;
    const height = (rise * share - (rise + 2) * share * share) * size;
    const halfWidth = FROND_WIDTH * size * Math.sin(Math.PI * Math.min(1, share * 1.2 + 0.08)) ** 0.6;
    for (const [across, u] of [[-1, 0], [0, 0.5], [1, 1]]) {
      const fold = across === 0 ? 0 : -0.35 * halfWidth;
      positions.push(along, height + fold, across * halfWidth);
      uvs.push(u, share);
    }
    if (step > 0) {
      const row = (step - 1) * 3;
      for (const column of [0, 1]) {
        const [a, b, c, d] = [row + column, row + column + 1, row + column + 3, row + column + 4];
        indices.push(a, c, b, b, c, d);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // A plain white colour, so the fronds merge with the trunk's attributes if ever needed, and the texture's own
  // greens show.
  return coloured(geometry, 0xffffff);
}

// The fronds' material: blades cut out of the texture (alphaTest), seen from both sides.
export function createFrondMaterial(keep) {
  return keep(new THREE.MeshStandardMaterial({ map: keep(drawFrond()), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75 }));
}

// A frond's blades on nothing: a pale midrib up the middle and thin blades either side of it, angled toward the
// tip (the top of the picture), shortest at the foot and the tip, in greens that vary blade by blade.
function drawFrond() {
  const width = 128;
  const height = 256;
  const random = createRandom(89);
  const { canvas, context } = createCanvas(width, height);
  const greens = ['#3f9a2e', '#4fae38', '#2f8026', '#5cbc40', '#368a2a'];
  const middle = width / 2;
  for (let y = height - 6; y > 4; y -= 4.2) {
    const share = 1 - y / height;
    const reach = (middle - 2) * Math.sin(Math.PI * Math.min(1, share * 1.2 + 0.08)) ** 0.6;
    for (const side of [-1, 1]) {
      context.fillStyle = greens[Math.floor(random() * greens.length)];
      context.beginPath();
      context.moveTo(middle, y + 2);
      context.lineTo(middle + side * reach, y - reach * 0.55);
      context.lineTo(middle + side * reach * 0.92, y - reach * 0.55 + 4);
      context.lineTo(middle, y + 6);
      context.fill();
    }
  }
  context.fillStyle = '#c8c070';
  context.fillRect(middle - 2, 0, 4, height);
  return canvasTexture(canvas);
}
