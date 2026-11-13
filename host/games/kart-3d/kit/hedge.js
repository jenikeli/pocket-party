// The kit's hedge (M7d4c5, to the study of MK8DX's Daisy Circuit hedges): a long rounded loaf with a furry mat of short
// blades in relief (kit/garden-textures.js) and big five-petal pink flowers with yellow middles stuck on its
// front and top (kit/flowers.js). 2.4 long along x, 1 tall, 0.85 deep, on y = 0, facing +z. Used by
// kit/props.js.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { coloured, mergeShapes, shaded } from '../shape-utils.js';
import { createRandom, between } from '../random.js';
import { drawHedgeFur } from './garden-textures.js';
import { buildFlower } from './flowers.js';
import { drawnOnce } from '../canvas-texture.js';

const LENGTH = 2.4;
const HEIGHT = 1;
const DEPTH = 0.85;
// How many units of the loaf one picture of the fur covers.
const FUR_REPEAT_UNITS = 0.9;
const FLOWER_COLORS = [0xff7ab8, 0xff8cc4, 0xff6aae];

// The loaf (with the fur maps) and the flowers (with the painted material), as parts.
export function buildHedge(kit) {
  const furMaps = drawnOnce('hedge-fur', drawHedgeFur);
  Object.values(furMaps).forEach(kit.keep);
  const furMaterial = new THREE.MeshStandardMaterial({ ...furMaps, vertexColors: true, roughness: 1 });
  return [
    { geometry: kit.keep(loafShape()), material: kit.keep(furMaterial) },
    { geometry: kit.keep(flowerShapes()), material: kit.materials.painted },
  ];
}

// The loaf: a squarish ball (a sphere with its points pushed out toward a box's), closed and rounded at both ends
// as along its sides, flat at the foot, darker toward the ground where the leaves are in shade.
export function loafShape() {
  const ball = new THREE.SphereGeometry(1, 24, 14);
  ball.deleteAttribute('uv');
  ball.deleteAttribute('normal');
  const { position } = ball.attributes;
  const squarish = (value, exponent) => Math.sign(value) * Math.abs(value) ** exponent;
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    position.setXYZ(index, squarish(position.getX(index), 0.5) * (LENGTH / 2), HEIGHT / 2 + squarish(y, y < 0 ? 0.3 : 0.6) * (HEIGHT / 2), squarish(position.getZ(index), 0.6) * (DEPTH / 2));
  }
  // The sphere repeats its seam's and poles' points; merging them lets the normals run smoothly across.
  const loaf = mergeVertices(ball);
  ball.dispose();
  loaf.computeVertexNormals();
  loaf.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(loaf.attributes.position.count * 2), 2));
  return furUv(shaded(coloured(loaf, 0xffffff), (x, y) => 0.55 + 0.45 * Math.min(y / 0.8, 1)));
}

// The fur picture is laid on flat from the front, the top or the ends, whichever way a vertex's surface faces
// most; one picture repeating over the loaf, so a few stretched triangles round the rounded edges are not seen.
function furUv(geometry) {
  const { position, normal, uv } = geometry.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
    const across = [Math.abs(normal.getX(index)), Math.abs(normal.getY(index)), Math.abs(normal.getZ(index))];
    const facing = across.indexOf(Math.max(...across));
    const [u, v] = [[z, y], [x, z], [x, y]][facing];
    uv.setXY(index, u / FUR_REPEAT_UNITS, v / FUR_REPEAT_UNITS);
  }
  return geometry;
}

// Flowers on the front face and the top, each facing out from the loaf.
export function flowerShapes() {
  const random = createRandom(103);
  const flowers = Array.from({ length: 11 }, (_, index) => {
    const onTop = index % 3 === 0;
    const x = between(random, -LENGTH / 2 + 0.3, LENGTH / 2 - 0.3);
    const position = onTop ? [x, HEIGHT + 0.01, between(random, -0.25, 0.25)] : [x, between(random, 0.3, 0.8), DEPTH / 2 + 0.01];
    return buildFlower({
      position,
      normal: onTop ? [0, 1, 0.1] : [0, 0.1, 1],
      size: between(random, 0.15, 0.2),
      petalColor: FLOWER_COLORS[index % FLOWER_COLORS.length],
      spin: random() * 6,
    });
  });
  return mergeShapes(flowers);
}
