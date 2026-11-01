// One pennant of the kit's bunting (M7d4c3): a triangle of cloth with a slight curl, a hem folded over along its
// top edge, and the weave drawn as a normal map. Used by kit/bunting.js.

import * as THREE from 'three';
import { coloured, mergeShapes, roundedCylinder } from '../shape-utils.js';
import { createPixelImage } from './pixel-image.js';

const ROWS = 4;
const COLUMNS = 6;
// How far the cloth's sides curl toward the front, and how far it drifts back toward its tip.
const CURL = 0.07;
const DRIFT = 0.03;
// Normals lean this far toward up (a normal of length 1 plus this much up, then made unit again), so a pennant
// takes the sky and sun from above, as foliage does, instead of going dark: a card whose normal runs along the
// road gets little of either (the dark, muddy pennants of M7d4c2's before shot).
const LEAN_UP = 3;

// A pennant `size` across, hanging from y = 0 down to its tip at y = -size * 1.4, in the xy plane with its face
// toward +z, coloured `color` (hem a little darker). Indexed, with normals and texture coordinates.
export function createPennant(size, color) {
  const cloth = coloured(clothShape(size), color);
  const hemColor = new THREE.Color(color).multiplyScalar(0.82).getHex();
  const hem = new THREE.CylinderGeometry(0.03, 0.03, size * 2, 6).rotateZ(Math.PI / 2);
  hem.translate(0, -0.02, 0.01);
  return mergeShapes([cloth, coloured(hem, hemColor)]);
}

// The cloth as a grid of rows (narrowing to the tip) by columns, bent so it is not a flat card.
function clothShape(size) {
  const length = size * 1.4;
  const positions = [];
  const uvs = [];
  for (let row = 0; row <= ROWS; row += 1) {
    const along = row / ROWS;
    const halfWidth = size * (1 - along);
    for (let column = 0; column <= COLUMNS; column += 1) {
      const across = (column / COLUMNS) * 2 - 1;
      const z = CURL * across * across * along + DRIFT * along;
      positions.push(across * halfWidth, -along * length, z);
      uvs.push(across * 0.5 + 0.5, 1 - along);
    }
  }
  const indices = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const a = row * (COLUMNS + 1) + column;
      const b = a + COLUMNS + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const cloth = new THREE.BufferGeometry();
  cloth.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  cloth.setAttribute('uv', new THREE.Float32BufferAttribute(uvs.map((value, index) => (index % 2 === 0 ? value * 3 : value * 4)), 2));
  cloth.setIndex(indices);
  cloth.computeVertexNormals();
  return mergeShapes([layer(cloth, false), layer(cloth, true)]);
}

// A copy of `cloth` seen from the front, or (`back`) from behind: wound the other way round with its normals
// turned about. A double-sided material would flip a back face's normal downward with the lean, which is dark;
// two one-sided layers each lean up.
function layer(cloth, back) {
  const copy = cloth.clone();
  const normals = copy.attributes.normal;
  const lean = new THREE.Vector3();
  for (let index = 0; index < normals.count; index += 1) {
    lean.fromBufferAttribute(normals, index).multiplyScalar(back ? -1 : 1);
    lean.y += LEAN_UP;
    normals.setXYZ(index, ...lean.normalize().toArray());
  }
  if (back) {
    const indices = copy.index.array;
    for (let first = 0; first < indices.length; first += 3) {
      [indices[first + 1], indices[first + 2]] = [indices[first + 2], indices[first + 1]];
    }
  }
  return copy;
}

// A small plain-weave normal map (threads over and under), tiled over each pennant.
export function createWeaveNormalMap() {
  const size = 64;
  const heights = createPixelImage(size, size);
  heights.fill((column, row) => {
    const over = ((column >> 2) + (row >> 2)) % 2 === 0;
    const thread = over ? Math.sin(((column % 4) / 4) * Math.PI) : Math.sin(((row % 4) / 4) * Math.PI);
    const level = 128 + 70 * thread;
    return [level, level, level];
  });
  return heights.toReliefTexture({ depth: 2, repeat: true });
}
