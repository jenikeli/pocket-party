// A window box of red flowers for the stilt hut (M7d4d), as the reference game's huts have along their decks: a plank box, dark
// soil, green leaves and a row of red blooms. Returns { wood, plants }: lists of coloured shapes for the hut's
// wood and painted parts. Used by kit/stilt-hut.js.

import * as THREE from 'three';
import { at, coloured } from '../shape-utils.js';
import { between } from '../random.js';
import { board, jittered } from './stilt-hut-shapes.js';

const BOX = 0x7a5232;
const SOIL = 0x3a2a1c;
const LEAF = 0x3c8a3a;
const BLOOMS = [0xd8242c, 0xe8383a, 0xc01c28];

// A box `width` long with its middle at (x, y, z), the front facing +z.
export function flowerBox(x, y, z, width, random) {
  const wood = [
    coloured(at(board(width, 0.26, 0.3, random), x, y, z), jittered(BOX, random, 0.1)),
    coloured(at(board(width + 0.1, 0.05, 0.36, random), x, y + 0.13, z), jittered(BOX, random, 0.1)),
  ];
  const plants = [coloured(at(new THREE.BoxGeometry(width - 0.08, 0.04, 0.24), x, y + 0.14, z), SOIL)];
  const count = Math.round(width / 0.2);
  for (let index = 0; index < count; index += 1) {
    const flowerX = x - width / 2 + 0.12 + ((width - 0.24) * index) / Math.max(count - 1, 1);
    const flowerZ = z + between(random, -0.06, 0.06);
    plants.push(coloured(at(new THREE.SphereGeometry(0.13, 6, 4).scale(1, 0.6, 1), flowerX, y + 0.22, flowerZ), LEAF));
    plants.push(coloured(at(new THREE.SphereGeometry(0.085, 6, 4), flowerX, y + 0.34 + between(random, 0, 0.06), flowerZ), BLOOMS[index % BLOOMS.length]));
  }
  return { wood, plants };
}
