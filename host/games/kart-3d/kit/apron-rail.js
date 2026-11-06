// The airport's apron rail (M9 task K), after the post-and-rail fences of Sunshine Airport's apron: two fat white
// rails on orange posts with rounded caps, and every few posts a board of red-and-white chevrons low on the posts
// (both faces, pointing the way the karts drive). Returns { add(segment, side), end(station, index, side,
// facing), meshes() } for kit/barriers.js: end puts a post where the rails start or stop.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, roundProfile } from './extrude.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { at, coloured, mergeShapes, roundedBox, roundedCylinder } from '../shape-utils.js';
import { createCanvas, canvasTexture } from '../canvas-texture.js';

const WHITE = 0xf2f2ee;
const ORANGE = 0xf07a1e;
const POST_OUT = 0.28;
const POST_STATIONS = 2;
const BOARD_POSTS = 3;
const RAIL_LIFTS = [0.55, 0.93];
// Each rail, [outward, lift] (see kit/extrude.js): a fat rounded bar on the road's side of the posts.
const RAILS = RAIL_LIFTS.map((lift) => roundProfile([[0.04, lift - 0.1], [0.04, lift + 0.1], [0.2, lift + 0.1], [0.2, lift - 0.1], [0.04, lift - 0.1]], 0.07, 3));
const BOARD_LENGTH = 1.9;
const BOARD_HEIGHT = 0.34;
const BOARD_LIFT = 0.12;

export function createApronRail({ keep }) {
  const rails = createStripBuilder();
  const posts = [];
  const postAt = (station, side) => frameAt(station, edgeLateral(station, side) + side * POST_OUT, 0, facingAlong(station));
  return {
    add(segment, side) {
      RAILS.forEach((rail) => extrudeSegment(rails, segment, side, rail, WHITE, { smooth: true }));
      if (segment.index % POST_STATIONS === 0) {
        posts.push({ frame: postAt(segment.station, side), board: segment.index % (POST_STATIONS * BOARD_POSTS) === 0 });
      }
    },
    end(station, index, side, facing) {
      if (facing > 0 || index % POST_STATIONS !== 0) {
        posts.push({ frame: postAt(station, side), board: false });
      }
    },
    meshes() {
      const painted = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
      const chevrons = keep(new THREE.MeshStandardMaterial({ map: keep(chevronTexture()), roughness: 0.5 }));
      const boards = posts.filter((post) => post.board).map((post) => post.frame);
      return [
        withShadows(new THREE.Mesh(keep(rails.build()), painted)),
        placeInstances(keep(buildPost()), painted, posts.map((post) => post.frame)),
        placeInstances(keep(boardFrame()), painted, boards),
        placeInstances(keep(boardFaces()), chevrons, boards),
      ];
    },
  };
}

// An orange post with a rounded cap.
function buildPost() {
  return mergeShapes([
    coloured(at(roundedBox(0.2, 1.1, 0.2, 0.05, { chamfered: true }), 0, 0.55, 0), ORANGE),
    coloured(at(roundedCylinder(0.14, 0.14, 0.1, 0.04, 8), 0, 1.15, 0), ORANGE),
  ]);
}

// The board's body, a slab a little thicker than the posts, centred on one (the post's frame faces along the road,
// so the road is toward -x on the right and +x on the left: a face on each side covers both).
function boardFrame() {
  return coloured(at(roundedBox(0.36, BOARD_HEIGHT, BOARD_LENGTH, 0.06, { chamfered: true }), 0, BOARD_LIFT + BOARD_HEIGHT / 2, 0), WHITE);
}

// The two faces, one geometry: the chevron picture on each, its arrows toward +z (the karts' way) as read from
// that side.
function boardFaces() {
  const face = (sign) => {
    const quad = new THREE.PlaneGeometry(BOARD_LENGTH - 0.14, BOARD_HEIGHT - 0.1);
    quad.rotateY((sign * Math.PI) / 2);
    if (sign > 0) {
      // Turned to face +x, the picture's right is -z: flip it so the arrows still point along +z.
      const { uv } = quad.attributes;
      for (let corner = 0; corner < uv.count; corner += 1) {
        uv.setX(corner, 1 - uv.getX(corner));
      }
    }
    return at(quad, sign * 0.185, BOARD_LIFT + BOARD_HEIGHT / 2, 0);
  };
  return mergeShapes([face(-1), face(1)]);
}

// Red chevrons on white, three of them, pointing toward the picture's right.
function chevronTexture() {
  const { canvas, context } = createCanvas(512, 96);
  context.fillStyle = '#f4f2ee';
  context.fillRect(0, 0, 512, 96);
  context.fillStyle = '#d8281e';
  for (let index = 0; index < 4; index += 1) {
    const left = 20 + index * 125;
    context.beginPath();
    context.moveTo(left, 6);
    context.lineTo(left + 46, 6);
    context.lineTo(left + 90, 48);
    context.lineTo(left + 46, 90);
    context.lineTo(left, 90);
    context.lineTo(left + 44, 48);
    context.fill();
  }
  return canvasTexture(canvas);
}
