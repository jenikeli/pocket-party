// The kit's seaside rail fence (M7d2), as at Koopa Cape: grey wooden posts with pointed tops and two rails along
// them. Returns { add(segment, side), meshes() } for kit/barriers.js.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment } from './extrude.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { at, coloured, mergeShapes } from '../shape-utils.js';

const WOOD = 0xa8a294;
const POST_OUT = 0.16;
const POST_STATIONS = 2;
// Each rail, [outward, lift] (see kit/extrude.js): a plank on the road's side of the posts, closed.
const RAILS = [0.42, 0.82].map((lift) => [[0.04, lift - 0.07], [0.04, lift + 0.07], [0.09, lift + 0.07], [0.09, lift - 0.07], [0.04, lift - 0.07]]);

export function createRailFence({ keep, textures }) {
  const rails = createStripBuilder();
  const posts = [];
  return {
    add(segment, side) {
      RAILS.forEach((rail) => extrudeSegment(rails, segment, side, rail, WOOD));
      if (segment.index % POST_STATIONS === 0) {
        const { station } = segment;
        posts.push(frameAt(station, edgeLateral(station, side) + side * POST_OUT, 0, facingAlong(station)));
      }
    },
    meshes() {
      // The concrete's grit reads as weathered wood grain at this size.
      const wood = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.concrete, roughness: 0.9 }));
      return [withShadows(new THREE.Mesh(keep(rails.build()), wood)), placeInstances(keep(buildPost()), wood, posts)];
    },
  };
}

// A square post with a pointed top.
function buildPost() {
  const point = new THREE.ConeGeometry(0.13, 0.22, 4).rotateY(Math.PI / 4);
  return mergeShapes([coloured(at(new THREE.BoxGeometry(0.18, 1, 0.18), 0, 0.5, 0), WOOD), coloured(at(point, 0, 1.11, 0), WOOD)]);
}
