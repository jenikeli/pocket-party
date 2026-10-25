// The kit's padded wall with sponsor boards (M7d2), as at Mario Kart Stadium and Toad Circuit: a low padded wall
// whose face toward the road is a row of printed boards (kit/sponsors.js), a rounded blue pad on top, and a
// chain-link fence on posts above it. Returns { add(segment, side), meshes() } for kit/barriers.js.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment } from './extrude.js';
import { sponsorUv } from './sponsors.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { createCanvas, repeatingTexture } from '../canvas-texture.js';

const HEIGHT = 1.2;
// [outward, lift] (see kit/extrude.js): the face the boards are printed on, then the pad over the top and down
// the back.
const FACE = [[0, 0], [0, HEIGHT]];
const PAD = [[0, HEIGHT], [0.1, HEIGHT + 0.12], [0.3, HEIGHT + 0.16], [0.5, HEIGHT + 0.12], [0.6, HEIGHT], [0.6, 0]];
const PAD_COLOR = 0x2350b8;
// One board every this many stations (about 4 units, a little over 3 times the wall's height, as the boards are
// drawn).
const BOARD_STATIONS = 4;
const FENCE_OUT = 0.3;
const FENCE_TOP = 3.4;
const FENCE = [[FENCE_OUT, HEIGHT + 0.1], [FENCE_OUT, FENCE_TOP]];
const FENCE_TILE = 0.5;
const POST_STATIONS = 4;

export function createSponsorWall({ keep, sponsors }) {
  const boards = createStripBuilder();
  const pad = createStripBuilder();
  const fence = createStripBuilder();
  const posts = [];
  return {
    add(segment, side) {
      extrudeSegment(boards, segment, side, FACE, 0xffffff, boardUv(segment, side));
      extrudeSegment(pad, segment, side, PAD, PAD_COLOR);
      extrudeSegment(fence, segment, side, FENCE, 0xffffff, (around, s) => [around / FENCE_TILE, s / FENCE_TILE]);
      if (segment.index % POST_STATIONS === 0) {
        const { station } = segment;
        posts.push(frameAt(station, edgeLateral(station, side) + side * FENCE_OUT, 0, facingAlong(station)));
      }
    },
    meshes() {
      const padding = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
      // The wire is cut out of the fence's texture (alphaTest), seen from both sides.
      const wire = keep(new THREE.MeshStandardMaterial({ map: keep(drawChainLink()), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.6 }));
      const postShape = keep(new THREE.CylinderGeometry(0.05, 0.05, FENCE_TOP + 0.1, 6).translate(0, (FENCE_TOP + 0.1) / 2, 0));
      const steel = keep(new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.4, metalness: 0.7 }));
      return [
        withShadows(new THREE.Mesh(keep(boards.build()), sponsors)),
        withShadows(new THREE.Mesh(keep(pad.build()), padding)),
        withShadows(new THREE.Mesh(keep(fence.build()), wire)),
        placeInstances(postShape, steel, posts),
      ];
    },
  };
}

// The boards' texture coordinates on this segment: each board its own brand, read left to right from the road
// on either side (s grows to the left of someone facing a right-hand wall, to the right on a left-hand one).
function boardUv({ station, index }, side) {
  const board = Math.floor(index / BOARD_STATIONS);
  const brand = board * 5 + (side > 0 ? 3 : 0);
  return (around, s) => {
    const along = ((index % BOARD_STATIONS) + (s - station.s) / station.segmentLength) / BOARD_STATIONS;
    return sponsorUv(brand, side > 0 ? 1 - along : along, around / HEIGHT);
  };
}

// A diamond mesh of grey wire on nothing: two diamonds across and two down per tile.
function drawChainLink() {
  const size = 64;
  const { canvas, context } = createCanvas(size, size);
  context.strokeStyle = '#c8ccd2';
  context.lineWidth = 3;
  for (let offset = -size; offset <= size; offset += size / 2) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset + size, size);
    context.moveTo(offset + size, 0);
    context.lineTo(offset, size);
    context.stroke();
  }
  return repeatingTexture(canvas);
}
