// The kit's giant Koopa shell (M7d3), as half sunk off MK8DX's Koopa Cape: a green dome of scutes (a middle one,
// a ring of six and a ring of twelve at the rim, each lighter in its middle with a dark seam between) over a
// cream rim. One geometry, its texture laid over it from above. Stands round y = 0 at its rim, radius 1 (scaled
// per course). Used by the seaside surroundings.

import * as THREE from 'three';
import { at, coloured, mergeShapes } from '../shape-utils.js';
import { createPixelImage } from './pixel-image.js';

const SIZE = 256;
// The scutes' middles, seen from above in shares of the radius.
const SCUTES = [
  [0, 0],
  ...Array.from({ length: 6 }, (_, index) => [0.5 * Math.cos((index * Math.PI) / 3), 0.5 * Math.sin((index * Math.PI) / 3)]),
  ...Array.from({ length: 12 }, (_, index) => [0.92 * Math.cos(((index + 0.5) * Math.PI) / 6), 0.92 * Math.sin(((index + 0.5) * Math.PI) / 6)]),
];

// Returns { geometry, material } for the caller to keep and place.
export function buildKoopaShell(keep) {
  const dome = new THREE.SphereGeometry(1, 40, 16, 0, 2 * Math.PI, 0, Math.PI * 0.5).scale(1, 0.72, 1);
  // Laid over it from above: the dome's x and z across 0..1.
  const { position, uv } = dome.attributes;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, position.getX(index) * 0.5 + 0.5, position.getZ(index) * 0.5 + 0.5);
  }
  const rim = new THREE.TorusGeometry(1, 0.1, 8, 40).rotateX(Math.PI / 2);
  // The rim's texture is the picture's corner, which is cream.
  rim.attributes.uv.array.fill(0.01);
  const geometry = mergeShapes([coloured(dome, 0xffffff), coloured(at(rim, 0, 0.02, 0), 0xf2e6c0)]);
  const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: keep(drawScutes()), roughness: 0.3 }));
  return { geometry: keep(geometry), material };
}

// Each pixel takes the colour of its nearest scute's middle: the cells of hexagon-like shapes. Near the seam
// with the next nearest it darkens, and toward its own middle it lightens. Past the outer ring: the cream rim.
function drawScutes() {
  const image = createPixelImage(SIZE, SIZE);
  image.fill((px, py) => {
    const x = (px / SIZE) * 2 - 1;
    const y = (py / SIZE) * 2 - 1;
    if (Math.hypot(x, y) > 1.02) {
      return [242, 230, 192];
    }
    const distances = SCUTES.map(([sx, sy]) => Math.hypot(x - sx, y - sy)).sort((a, b) => a - b);
    const seam = distances[1] - distances[0];
    if (seam < 0.03) {
      return [24, 80, 30];
    }
    const centre = Math.max(0, 1 - distances[0] / 0.3);
    const edge = Math.min(1, seam / 0.12);
    return [40 + 50 * centre, 120 + 60 * centre + 20 * edge, 40 + 20 * centre];
  });
  return image.toTexture({ repeat: false });
}
