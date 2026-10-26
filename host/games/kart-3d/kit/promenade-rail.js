// The kit's promenade railing (M7d4), as along MK8DX's Daisy Circuit seafront (docs/mk8dx-reference.md, "The
// kit's objects up close"): blue iron posts, each with a flared foot, a collar and a ball on top, two round
// rails between them, and every few metres a square stone pillar with a plinth, a cap slab and a round brass
// plaque on its faces. Returns { add(segment, side), end(station, index, side, facing), meshes() } for
// kit/barriers.js: end stands a pillar where the railing starts or stops, so the rails end in stone, as
// Daisy Circuit's do.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, tubeProfile } from './extrude.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { at, coloured, mergeShapes, roundedBox, roundedCylinder, shaded } from '../shape-utils.js';

const IRON = 0x3a6fc8;
const RAIL_OUT = 0.3;
const RAIL_LIFTS = [0.5, 0.9];
const RAIL_RADIUS = 0.035;
const POST_STATIONS = 2;
// A pillar instead of a post every this many stations (Daisy Circuit's stand about every 6 posts).
const PILLAR_STATIONS = 12;
// The pillar: its width (square), the height of its shaft above the plinth, and its stone's colours.
const PILLAR = { width: 0.5, plinth: 0.16, shaft: 1.0 };
const STONE = { shaft: 0xd2a874, cap: 0xe6cca0, plinth: 0xa88458 };
const PLAQUE = 0xd8b04a;

export function createPromenadeRail({ keep, textures }) {
  const rails = createStripBuilder();
  const posts = [];
  const pillars = [];
  const placeAt = (station, side) => frameAt(station, edgeLateral(station, side) + side * RAIL_OUT, 0, facingAlong(station));
  return {
    add(segment, side) {
      for (const lift of RAIL_LIFTS) {
        extrudeSegment(rails, segment, side, tubeProfile(RAIL_OUT, lift, RAIL_RADIUS), IRON, { smooth: true });
      }
      if (segment.index % PILLAR_STATIONS === 0) {
        pillars.push(placeAt(segment.station, side));
      } else if (segment.index % POST_STATIONS === 0) {
        posts.push(placeAt(segment.station, side));
      }
    },
    end(station, index, side, facing) {
      if (facing > 0 || index % PILLAR_STATIONS !== 0) {
        pillars.push(placeAt(station, side));
      }
    },
    meshes() {
      const iron = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.35 }));
      const stone = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.concrete, normalMap: textures.concreteRelief, roughness: 0.85 }));
      const brass = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.7 }));
      return [
        withShadows(new THREE.Mesh(keep(rails.build()), iron)),
        placeInstances(keep(buildPost()), iron, posts),
        placeInstances(keep(buildPillar()), stone, pillars),
        placeInstances(keep(buildPlaques()), brass, pillars),
      ];
    },
  };
}

// An iron post: a flared foot, a shaft with a collar just under the top rail, and a ball on top.
function buildPost() {
  return mergeShapes([
    coloured(at(roundedCylinder(0.06, 0.1, 0.1, 0.02, 10), 0, 0.05, 0), IRON),
    coloured(at(roundedCylinder(0.042, 0.048, 0.92, 0.01, 8), 0, 0.55, 0), IRON),
    coloured(at(roundedCylinder(0.065, 0.065, 0.05, 0.015, 10), 0, 0.78, 0), IRON),
    coloured(at(new THREE.SphereGeometry(0.07, 10, 6), 0, 1.05, 0), IRON),
  ]);
}

// A stone pillar on a darker plinth, shading darker toward its foot, with a cap slab overhanging it.
function buildPillar() {
  const { width, plinth, shaft } = PILLAR;
  const shaftShape = shaded(coloured(at(roundedBox(width, shaft, width, 0.04), 0, plinth + shaft / 2, 0), STONE.shaft), (x, y) => 0.82 + 0.18 * Math.min(1, (y - plinth) / 0.4));
  return mergeShapes([
    coloured(at(roundedBox(width + 0.08, plinth, width + 0.08, 0.03), 0, plinth / 2, 0), STONE.plinth),
    shaftShape,
    coloured(at(roundedBox(width + 0.12, 0.1, width + 0.12, 0.035), 0, plinth + shaft + 0.05, 0), STONE.cap),
    coloured(at(roundedBox(width - 0.1, 0.08, width - 0.1, 0.03), 0, plinth + shaft + 0.14, 0), STONE.cap),
  ]);
}

// A round brass plaque with a raised rim on each face across the road (the pillar's frame faces along the road,
// so the road is toward -x on the right and +x on the left).
function buildPlaques() {
  const middle = PILLAR.plinth + PILLAR.shaft * 0.55;
  return mergeShapes(
    [-1, 1].flatMap((face) => [
      coloured(at(roundedCylinder(0.13, 0.13, 0.03, 0.01, 16).rotateZ(Math.PI / 2), face * (PILLAR.width / 2 + 0.01), middle, 0), PLAQUE),
      coloured(at(new THREE.TorusGeometry(0.12, 0.018, 4, 16).rotateY(Math.PI / 2), face * (PILLAR.width / 2 + 0.025), middle, 0), PLAQUE),
      coloured(at(new THREE.SphereGeometry(0.045, 8, 4).scale(0.5, 1, 1), face * (PILLAR.width / 2 + 0.025), middle, 0), 0xb08a30),
    ]),
  );
}
