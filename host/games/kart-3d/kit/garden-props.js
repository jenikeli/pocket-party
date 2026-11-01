// The kit's garden props (M7d3), for the green parts of a seaside or sky course: a round, bushy tree as on MK8DX's
// sky islands, a hedge trimmed round with pink flowers in it, and a planter of flowers, as along Daisy Circuit's
// promenade. Each is one geometry coloured per vertex, standing on y = 0, facing +z. Each builder takes the kit
// and returns the prop's parts, [{ geometry, material }]. Used by kit/props.js and the seaside sky.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedBox } from '../shape-utils.js';
import { createRandom, between } from '../random.js';

const GREENS = [0x3f9a2e, 0x4fae38, 0x5cbc40, 0x2f8a2c];
const FLOWERS = [0xff7ab8, 0xffe14a, 0xffffff, 0xff5a5a];

// A round, bushy tree about 5 tall: a short trunk and a crown of clumps in a few greens.
export function buildRoundTree(kit) {
  return [{ geometry: kit.keep(roundTreeShape()), material: kit.materials.painted }];
}

function roundTreeShape() {
  const random = createRandom(101);
  const clumps = [[0, 3.6, 0, 1.6], [1.1, 3.2, 0.3, 1.1], [-1, 3.3, -0.4, 1.2], [0.2, 3.1, 1.1, 1.1], [-0.3, 3.2, -1.1, 1.05], [0.3, 4.6, -0.2, 1.1]];
  return mergeShapes([
    coloured(new THREE.CylinderGeometry(0.22, 0.32, 3, 7).translate(0, 1.5, 0), 0x7a5232),
    ...clumps.map(([x, y, z, radius]) => coloured(new THREE.SphereGeometry(radius * between(random, 0.95, 1.05), 8, 5).translate(x, y, z), GREENS[Math.floor(random() * GREENS.length)])),
  ]);
}

// A hedge 2.4 long along x, trimmed round on top, with pink flowers dotted over its front and top.
export function buildHedge(kit) {
  return [{ geometry: kit.keep(hedgeShape()), material: kit.materials.painted }];
}

function hedgeShape() {
  const random = createRandom(103);
  const flowers = Array.from({ length: 14 }, () => {
    const x = between(random, -1.05, 1.05);
    const onTop = random() < 0.4;
    const flower = new THREE.SphereGeometry(0.09, 6, 4);
    return coloured(at(flower, x, onTop ? 1.02 : between(random, 0.35, 0.85), onTop ? between(random, -0.3, 0.3) : 0.42), FLOWERS[0]);
  });
  return mergeShapes([coloured(at(roundedBox(2.4, 1, 0.85, 0.35), 0, 0.5, 0), GREENS[1]), ...flowers]);
}

// A low stone planter full of flowers in four colours.
export function buildPlanter(kit) {
  return [{ geometry: kit.keep(planterShape()), material: kit.materials.painted }];
}

function planterShape() {
  const random = createRandom(107);
  const flowers = Array.from({ length: 18 }, (_, index) => {
    const flower = new THREE.SphereGeometry(0.11, 6, 4);
    return coloured(at(flower, between(random, -0.75, 0.75), 0.62 + random() * 0.08, between(random, -0.3, 0.3)), FLOWERS[index % FLOWERS.length]);
  });
  return mergeShapes([
    coloured(at(roundedBox(1.8, 0.5, 0.8, 0.08), 0, 0.25, 0), 0xd8cfc0),
    coloured(at(roundedBox(1.62, 0.12, 0.64, 0.04), 0, 0.52, 0), 0x6a4a2a),
    coloured(at(new THREE.SphereGeometry(0.75, 8, 5).scale(1.05, 0.25, 0.42), 0, 0.58, 0), GREENS[0]),
    ...flowers,
  ]);
}
