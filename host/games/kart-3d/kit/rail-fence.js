// The kit's seaside rail fence (M7d2), as at Koopa Cape: weathered wooden posts with pointed tops and two plank
// rails along them, bolted to each post (M7d3 gave it wood grain and the bolts). Returns { add(segment, side),
// end(station, index, side, facing), meshes() } for kit/barriers.js: end puts a post where the rails start or
// stop.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment } from './extrude.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { at, coloured, mergeShapes } from '../shape-utils.js';

const WOOD = 0xc4b49c;
const BOLT = 0x4a4a50;
const POST_OUT = 0.16;
const POST_STATIONS = 2;
const RAIL_LIFTS = [0.42, 0.82];
// Each rail, [outward, lift] (see kit/extrude.js): a plank on the road's side of the posts, closed.
const RAILS = RAIL_LIFTS.map((lift) => [[0.04, lift - 0.07], [0.04, lift + 0.07], [0.09, lift + 0.07], [0.09, lift - 0.07], [0.04, lift - 0.07]]);
// The wood texture's planks run across it: laid along the rails, one plank about a rail's height.
const railUv = (around, s) => [s / 2, around / 1.1];

export function createRailFence({ keep, textures }) {
  const rails = createStripBuilder();
  const posts = [];
  return {
    add(segment, side) {
      RAILS.forEach((rail) => extrudeSegment(rails, segment, side, rail, WOOD, railUv));
      if (segment.index % POST_STATIONS === 0) {
        posts.push(postAt(segment.station, side));
      }
    },
    end(station, index, side, facing) {
      if (facing > 0 || index % POST_STATIONS !== 0) {
        posts.push(postAt(station, side));
      }
    },
    meshes() {
      const wood = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.wood, roughness: 0.9 }));
      return [withShadows(new THREE.Mesh(keep(rails.build()), wood)), placeInstances(keep(buildPost()), wood, posts)];
    },
  };
}

function postAt(station, side) {
  return frameAt(station, edgeLateral(station, side) + side * POST_OUT, 0, facingAlong(station));
}

// A square post with a pointed top, its grain running up it, and a bolt head where each rail crosses it on the
// road's side (the post's frame faces along the road, so the road is toward -x on the right and +x on the
// left: a bolt on each side covers both).
function buildPost() {
  const post = coloured(at(new THREE.BoxGeometry(0.18, 1, 0.18), 0, 0.5, 0), WOOD);
  // Box faces map the texture's width across them; turned, the grain runs up the post.
  const uv = post.attributes.uv;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getY(index) * 0.5, uv.getX(index) * 0.12);
  }
  const point = coloured(at(new THREE.ConeGeometry(0.13, 0.22, 4).rotateY(Math.PI / 4), 0, 1.11, 0), WOOD);
  const bolts = RAIL_LIFTS.flatMap((lift) => [-1, 1].map((side) => coloured(at(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 5).rotateZ(Math.PI / 2), side * 0.1, lift, 0), BOLT)));
  return mergeShapes([post, point, ...bolts]);
}
