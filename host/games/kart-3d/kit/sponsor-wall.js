// The kit's padded wall with sponsor boards (M7d2), as at the reference stadium course and the reference circuit course: a low padded wall
// whose face toward the road is a row of printed boards (kit/sponsors.js), a rounded blue pad on top, and a
// chain-link fence on posts above it. Since M7d4 built up as the reference game's is (docs/kart-reference.md, "The kit's
// objects up close"): each board set back in a frame with a bolt at each corner, a dark kick strip along the
// foot, a fat cushion of a pad with a seam between boards, and the fence on capped posts with a rail along its
// top. Since M7d4b2 the boards' frames and bolts and the pad's seams are drawn in maps
// (kit/sponsor-wall-detail.js) rather than built. Returns { add(segment, side), end(station, index, side, facing), meshes() }
// for kit/barriers.js: end closes the wall's cross-section and puts a fence post at the wall's end.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, capProfile, roundProfile, tubeProfile, profileLength } from './extrude.js';
import { sponsorUv } from './sponsors.js';
import { frameAt, facingAlong, edgeLateral, placeInstances, withShadows } from './frames.js';
import { createSponsorWallDetail } from './sponsor-wall-detail.js';
import { createChainLinkMaterial } from './chain-link.js';
import { buildFencePost } from './sponsor-wall-post.js';

const HEIGHT = 1.2;
// The boards are set back this far behind the frame round them, between these heights.
const BOARD_BACK = 0.03;
const BOARD_BOTTOM = 0.22;
// The barrier's concrete ledge (kit/barriers.js) tops out this high: the kick strip stands on it, starting a
// little below its top, as a strip that began exactly on it, flush with its inner face, z-fought with it (the
// hatching along the wall's foot before M7d4c3).
const LEDGE_TOP = 0.1;
const BOARD_TOP = 1.14;
// [outward, lift] (see kit/extrude.js): the kick strip along the foot, the boards' face, the pad (a cushion
// that overhangs the boards' top) and the wall's back.
const KICK = roundProfile([[-0.02, LEDGE_TOP - 0.01], [-0.02, BOARD_BOTTOM], [BOARD_BACK, BOARD_BOTTOM]], 0.03);
const FACE = [[BOARD_BACK, BOARD_BOTTOM], [BOARD_BACK, BOARD_TOP]];
const PAD = roundProfile(
  [[BOARD_BACK, HEIGHT - 0.06], [-0.03, HEIGHT - 0.06], [-0.03, HEIGHT + 0.08], [0.3, HEIGHT + 0.22], [0.63, HEIGHT + 0.08], [0.63, HEIGHT - 0.06], [0.6, HEIGHT - 0.06]],
  0.08,
);
const BACK = [[0.6, HEIGHT - 0.06], [0.6, 0]];
const OUTLINE = [[0, 0], [-0.03, HEIGHT - 0.06], [-0.03, HEIGHT + 0.08], [0.3, HEIGHT + 0.22], [0.63, HEIGHT + 0.08], [0.6, 0]];
const PAD_COLOR = 0x2350b8;
const KICK_COLOR = 0x3a3c42;
// One board every this many stations (about 4 units, a little under 4 times its height, as the boards are
// drawn).
const BOARD_STATIONS = 4;
const FENCE_OUT = 0.3;
const FENCE_BOTTOM = HEIGHT + 0.15;
const FENCE_TOP = 3.4;
const FENCE = [[FENCE_OUT, FENCE_BOTTOM], [FENCE_OUT, FENCE_TOP]];
const FENCE_TILE = 0.5;
const TOP_RAIL = tubeProfile(FENCE_OUT, FENCE_TOP, 0.035);
// A rail along the fence's foot, resting on the pad's ridge, finishes where the wire meets the pad.
const BOTTOM_RAIL = tubeProfile(FENCE_OUT, HEIGHT + 0.25, 0.04);
const POST_STATIONS = 4;

export function createSponsorWall({ keep }) {
  const boards = createStripBuilder();
  const padding = createStripBuilder();
  const pads = createStripBuilder();
  const fence = createStripBuilder();
  const steel = createStripBuilder();
  const posts = [];
  const padLength = profileLength(PAD);
  const padRidge = profileLength(PAD, PAD.reduce((top, point, index) => (point[1] > PAD[top][1] ? index : top), 0));
  const detail = createSponsorWallDetail(keep, { length: BOARD_STATIONS, padLength, padRidge, padColor: PAD_COLOR });
  return {
    add(segment, side) {
      extrudeSegment(boards, segment, side, FACE, 0xffffff, { uvOf: boardUv(segment, side) });
      extrudeSegment(padding, segment, side, KICK, KICK_COLOR, { smooth: true });
      extrudeSegment(pads, segment, side, PAD, detail.padColor, { smooth: true, uvOf: padUv(segment, side, padLength) });
      extrudeSegment(padding, segment, side, BACK, PAD_COLOR);
      extrudeSegment(fence, segment, side, FENCE, 0xffffff, { uvOf: (around, s) => [around / FENCE_TILE, s / FENCE_TILE] });
      extrudeSegment(steel, segment, side, TOP_RAIL, 0xffffff, { smooth: true });
      extrudeSegment(steel, segment, side, BOTTOM_RAIL, 0xffffff, { smooth: true });
      if (segment.index % POST_STATIONS === 0) {
        posts.push(postAt(segment.station, side));
      }
    },
    end(station, index, side, facing) {
      capProfile(padding, station, side, OUTLINE, PAD_COLOR, facing);
      if (facing > 0 || index % POST_STATIONS !== 0) {
        posts.push(postAt(station, side));
      }
    },
    meshes() {
      const padded = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
      const wire = createChainLinkMaterial(keep);
      const metal = keep(new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x9aa0a8, roughness: 0.4, metalness: 0.7 }));
      return [
        withShadows(new THREE.Mesh(keep(boards.build()), detail.boardMaterial)),
        withShadows(new THREE.Mesh(keep(pads.build()), detail.padMaterial)),
        withShadows(new THREE.Mesh(keep(padding.build()), padded)),
        withShadows(new THREE.Mesh(keep(fence.build()), wire)),
        withShadows(new THREE.Mesh(keep(steel.build()), metal)),
        placeInstances(keep(buildFencePost(HEIGHT + 0.22, FENCE_TOP)), metal, posts),
      ];
    },
  };
}

function postAt(station, side) {
  return frameAt(station, edgeLateral(station, side) + side * FENCE_OUT, 0, facingAlong(station));
}

// The boards' texture coordinates on this segment: each board its own brand, read left to right from the road
// on either side (s grows to the left of someone facing a right-hand wall, to the right on a left-hand one).
function boardUv({ station, index }, side) {
  const board = Math.floor(index / BOARD_STATIONS);
  const brand = board * 5 + (side > 0 ? 3 : 0);
  return (around, s) => {
    const along = ((index % BOARD_STATIONS) + (s - station.s) / station.segmentLength) / BOARD_STATIONS;
    return sponsorUv(brand, side > 0 ? 1 - along : along, around / (BOARD_TOP - BOARD_BOTTOM));
  };
}

// The pad's texture coordinates on this segment: one tile a board along the road, read from the
// road like the boards (boardUv), and once round the pad's cross-section, `padLength` round.
function padUv({ station, index }, side, padLength) {
  return (around, s) => {
    const along = ((index % BOARD_STATIONS) + (s - station.s) / station.segmentLength) / BOARD_STATIONS;
    return [side > 0 ? 1 - along : along, around / padLength];
  };
}
