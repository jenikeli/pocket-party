// The kit's seaside rail fence (M7d2), as at the reference cape course: weathered wooden posts with pointed tops and two plank
// rails along them, bolted to each post (M7d3 gave it wood grain and the bolts). Since M7d4 built up as the reference game's
// wooden fences are (docs/kart-reference.md, "The kit's objects up close"): rounded posts and rails with the
// grain in relief, a low pyramid top with a darker cut end, a darker foot, and posts that stand a little uneven,
// none quite as tall or as straight as the next. Returns { add(segment, side), end(station, index, side,
// facing), meshes() } for kit/barriers.js: end puts a post where the rails start or stop.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, roundProfile } from './extrude.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { at, coloured, mergeShapes, roundedBox, shaded } from '../shape-utils.js';
import { createRandom, between } from '../random.js';

const WOOD = 0xc4b49c;
const CUT_END = 0x8a7a64;
const BOLT = 0x4a4a50;
const POST_OUT = 0.16;
const POST_STATIONS = 2;
const RAIL_LIFTS = [0.42, 0.82];
// Each rail, [outward, lift] (see kit/extrude.js): a plank on the road's side of the posts, closed, its edges
// rounded.
const RAILS = RAIL_LIFTS.map((lift) => roundProfile([[0.04, lift - 0.07], [0.04, lift + 0.07], [0.1, lift + 0.07], [0.1, lift - 0.07], [0.04, lift - 0.07]], 0.02, 2));
// The wood texture's planks run across it: laid along the rails, one plank about a rail's height.
const railUv = (around, s) => [s / 2, around / 1.1];
// How much a post leans (radians, either way) and how much shorter or taller it stands, at most.
const LEAN = 0.035;
const HEIGHT_CHANGE = 0.05;

export function createRailFence({ keep, textures }) {
  const rails = createStripBuilder();
  const posts = [];
  const random = createRandom(83);
  // Each post its own lean and height, the same every time the course is built.
  const postAt = (station, side) =>
    frameAt(station, edgeLateral(station, side) + side * POST_OUT, 0, facingAlong(station))
      .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(between(random, -LEAN, LEAN), 0, between(random, -LEAN, LEAN))))
      .multiply(new THREE.Matrix4().makeScale(1, 1 + between(random, -HEIGHT_CHANGE, HEIGHT_CHANGE), 1));
  return {
    add(segment, side) {
      RAILS.forEach((rail) => extrudeSegment(rails, segment, side, rail, WOOD, { uvOf: railUv, smooth: true }));
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
      const wood = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.wood, normalMap: textures.woodRelief, roughness: 0.9 }));
      return [withShadows(new THREE.Mesh(keep(rails.build()), wood)), placeInstances(keep(buildPost()), wood, posts)];
    },
  };
}

// A square post with rounded edges, darker toward its foot, its grain running up it, a low pyramid top in
// darker cut wood, and a bolt head where each rail crosses it on the road's side (the post's frame faces along
// the road, so the road is toward -x on the right and +x on the left: a bolt on each side covers both).
function buildPost() {
  // Hundreds stand round a course, so their edges are chamfered rather than rounded.
  const post = shaded(coloured(at(roundedBox(0.18, 0.18, 1, 0.03, { chamfered: true }).rotateX(Math.PI / 2), 0, 0.5, 0), WOOD), (x, y) => 0.75 + 0.25 * Math.min(1, y / 0.3));
  // The rounded box is pushed out along its length (here up the post), so the texture's width runs round it:
  // turned, the planks' grain runs up the post.
  const uv = post.attributes.uv;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getY(index) * 0.5, uv.getX(index) * 0.7);
  }
  const top = coloured(at(new THREE.ConeGeometry(0.128, 0.08, 4).rotateY(Math.PI / 4), 0, 1.04, 0), CUT_END);
  const bolts = RAIL_LIFTS.flatMap((lift) => [-1, 1].map((side) => coloured(at(new THREE.SphereGeometry(0.03, 6, 3).scale(0.5, 1, 1), side * 0.1, lift, 0), BOLT)));
  return mergeShapes([post, top, ...bolts]);
}
