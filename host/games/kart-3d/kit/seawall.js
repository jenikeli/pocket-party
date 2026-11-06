// The airfield's seawalls (M9, Palm Bay Airport): where the plateau meets the sea (the runway's end over the bay,
// the bay's north side, the west shore), a concrete quay wall from the sea bed up to the land, pale and dry above,
// darker and wet round the water line, green with weed below it, cut in panels by dark joints, with a coping
// along its top standing out over the face. The foam at its foot is the shore water's (kit/shore-water.js). Used
// by airport-scenery.js.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { withShadows } from './frames.js';
import { SEAWALLS, GROUND, SEA_BED, landHeightAt } from '../airport-ground.js';

// The face's bands from the bottom up, each [top (relative to the sea level, null for the wall's top), colour].
const BANDS = [[-0.7, 0x55664c], [0.5, 0x8c8a82], [null, 0xdcd8ce]];
const COPING = Object.freeze({ overhang: 0.18, depth: 0.7, rise: 0.25, color: 0xeeeae2 });
// A joint every PANEL units along the face, this wide, standing a hair proud of it.
const PANEL = 4;
const JOINT = Object.freeze({ width: 0.08, raise: 0.01, color: 0x5c5a54 });

// Adds the seawalls to `kit.world` (kit/kit.js); the sea's surface is at `seaLevel`.
export function buildSeawalls({ world, keep, textures }, seaLevel) {
  const wall = createStripBuilder();
  for (const seawall of SEAWALLS) {
    const length = Math.hypot(seawall.to[0] - seawall.from[0], seawall.to[1] - seawall.from[1]);
    const along = [(seawall.to[0] - seawall.from[0]) / length, (seawall.to[1] - seawall.from[1]) / length];
    const pointAt = (distance) => [seawall.from[0] + along[0] * distance, seawall.from[1] + along[1] * distance];
    for (let distance = 0; distance < length; distance += GROUND.cell) {
      const [first, second] = [pointAt(distance), pointAt(Math.min(distance + GROUND.cell, length))];
      const tops = [first, second].map(([x, z]) => landHeightAt(x, z));
      if (Math.max(...tops) < seaLevel) {
        continue;
      }
      const piece = { first, second, tops, seaward: seawall.seaward, distance };
      addFace(wall, piece, seaLevel);
      addCoping(wall, piece);
    }
  }
  const concrete = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.concrete, normalMap: textures.concreteRelief, roughness: 0.8, side: THREE.DoubleSide }));
  const wallMesh = withShadows(new THREE.Mesh(keep(wall.build()), concrete));
  // The sea takes no shadows: a wall's would fall on nothing.
  wallMesh.castShadow = false;
  world.add(wallMesh);
}

// A corner at (x, z) moved `out` toward the sea, at height y, facing `normal`; its texture laid along the wall.
function cornerOf([x, z], seaward, out, y, normal, distance) {
  return { point: { x: x + seaward[0] * out, y, z: z + seaward[1] * out }, normal, uv: [distance / 8, y / 8] };
}

// The face of one piece of wall, in its bands, and a joint at its start.
function addFace(builder, { first, second, tops, seaward, distance }, seaLevel) {
  const normal = { x: seaward[0], y: 0, z: seaward[1] };
  let bottoms = [SEA_BED - 0.5, SEA_BED - 0.5];
  for (const [top, hex] of BANDS) {
    const bandTops = tops.map((wallTop) => (top === null ? wallTop : Math.min(seaLevel + top, wallTop)));
    if (bandTops.some((y, index) => y > bottoms[index])) {
      builder.quad([cornerOf(first, seaward, 0, bandTops[0], normal, distance), cornerOf(second, seaward, 0, bandTops[1], normal, distance + PANEL), cornerOf(first, seaward, 0, bottoms[0], normal, distance), cornerOf(second, seaward, 0, bottoms[1], normal, distance + PANEL)], hex);
    }
    bottoms = bandTops;
  }
  if (distance % PANEL === 0) {
    const along = [(second[0] - first[0]) / GROUND.cell, (second[1] - first[1]) / GROUND.cell];
    const end = [first[0] + along[0] * JOINT.width, first[1] + along[1] * JOINT.width];
    builder.quad([cornerOf(first, seaward, JOINT.raise, tops[0], normal, 0), cornerOf(end, seaward, JOINT.raise, tops[0], normal, 0), cornerOf(first, seaward, JOINT.raise, SEA_BED, normal, 0), cornerOf(end, seaward, JOINT.raise, SEA_BED, normal, 0)], JOINT.color);
  }
}

// The coping along the top of one piece: its front standing out over the face, and its top back onto the land.
function addCoping(builder, { first, second, tops, seaward, distance }) {
  const front = { x: seaward[0], y: 0, z: seaward[1] };
  const up = { x: 0, y: 1, z: 0 };
  const corner = (point, index, out, lift, normal) => cornerOf(point, seaward, out, tops[index] + lift, normal, distance + index * PANEL);
  const { overhang, depth, rise, color } = COPING;
  builder.quad([corner(first, 0, overhang, rise, front), corner(second, 1, overhang, rise, front), corner(first, 0, overhang, -0.1, front), corner(second, 1, overhang, -0.1, front)], color);
  builder.quad([corner(first, 0, -depth, rise, up), corner(second, 1, -depth, rise, up), corner(first, 0, overhang, rise, up), corner(second, 1, overhang, rise, up)], color);
  builder.quad([corner(first, 0, overhang, -0.1, { x: 0, y: -1, z: 0 }), corner(second, 1, overhang, -0.1, { x: 0, y: -1, z: 0 }), corner(first, 0, 0, -0.1, { x: 0, y: -1, z: 0 }), corner(second, 1, 0, -0.1, { x: 0, y: -1, z: 0 })], color);
}
