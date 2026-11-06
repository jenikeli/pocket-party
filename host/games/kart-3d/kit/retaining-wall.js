// The cutting's retaining walls (M9, Palm Bay Airport): cast concrete from under the road's edge up to the
// airfield, behind the barriers' ledge, the marks of the boards it was cast in on its face (panel seams and tie
// holes, rain streaks down from the top), dirtier at its foot, and a rounded coping along its top standing a
// little over the grass. Under the runway it rises only to the tunnel's ceiling (kit/tunnel.js). Used by
// airport-scenery.js.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment, roundProfile } from './extrude.js';
import { withShadows } from './frames.js';
import { createSurface } from './surface-maps.js';
import { createLayeredNoise } from '../noise.js';
import { createRandom, between } from '../random.js';
import { inCutting, underTunnel, landHeightAt, RETAINING_WALL, TUNNEL } from '../airport-ground.js';
import { ROAD_THICKNESS } from './road.js';

// The face's map repeats every FACE_TILE units along and FACE_HEIGHT up: boards BOARD long and half as tall.
const FACE_TILE = 8;
const FACE_HEIGHT = 4;
const BOARD = 2;
const PIXELS = 32;
const FACE_COLOR = 0xe6e2da;
const FOOT_COLOR = 0x9c978d;
const COPING_COLOR = 0xf0ece4;
// The dirty foot reaches this high above the road.
const FOOT_HEIGHT = 0.7;
const UP = { x: 0, y: 1, z: 0 };

// Adds the walls to `kit.world` (kit/kit.js).
export function buildRetainingWalls({ world, track, keep }) {
  const builder = createStripBuilder();
  const uvOf = (around, s) => [s / FACE_TILE, around / FACE_HEIGHT];
  track.stations.forEach((station, index) => {
    const next = track.stations[(index + 1) % track.stations.length];
    if (!inCutting(station)) {
      return;
    }
    const roofed = underTunnel(station.point.x, station.point.z) && underTunnel(next.point.x, next.point.z);
    for (const side of [-1, 1]) {
      const segment = { station: levelled(station), next: levelled(next), index };
      const ends = [station, next].map((at) => {
        const top = roofed ? TUNNEL.ceiling : wallTop(at, side);
        return { bottom: at.point.y - ROAD_THICKNESS, foot: Math.min(at.point.y + FOOT_HEIGHT, top), top };
      });
      const profileOf = ({ bottom, foot }) => [[0, bottom], [0, foot]];
      extrudeSegment(builder, segment, side, profileOf(ends[0]), FOOT_COLOR, { endProfile: profileOf(ends[1]), uvOf });
      const faceOf = ({ foot, top }) => [[0, foot], [0, top]];
      extrudeSegment(builder, segment, side, faceOf(ends[0]), FACE_COLOR, { endProfile: faceOf(ends[1]), uvOf });
      if (!roofed) {
        extrudeSegment(builder, segment, side, copingProfile(ends[0].top), COPING_COLOR, { endProfile: copingProfile(ends[1].top), smooth: true, uvOf });
      }
    }
  });
  const maps = Object.values(createFaceMaps()).map(keep);
  const [map, normalMap, aoMap, roughnessMap] = maps;
  const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map, normalMap, aoMap, roughnessMap, roughness: 1 }));
  world.add(withShadows(new THREE.Mesh(keep(builder.build()), material)));
}

// The station moved out to the wall's face and set level at height 0, so a profile's lifts are heights in the
// world and its outs run straight out from the face.
function levelled(station) {
  return { ...station, point: { x: station.point.x, y: 0, z: station.point.z }, normal: UP, halfWidth: station.halfWidth + RETAINING_WALL.out };
}

// The land's height at the top of the wall on `side` of `station`.
function wallTop(station, side) {
  const lateral = side * (station.halfWidth + (side > 0 ? station.shoulderRight : station.shoulderLeft) + RETAINING_WALL.out);
  return landHeightAt(station.point.x + station.right.x * lateral, station.point.z + station.right.z * lateral);
}

// The coping on a wall whose top is at `top`: a lip standing out over the face, then over the wall's thickness
// and down onto the grass behind, its corners rounded.
function copingProfile(top) {
  const { thickness, coping } = RETAINING_WALL;
  return roundProfile([[0, top - 0.2], [-0.12, top - 0.2], [-0.12, top + coping], [thickness, top + coping], [thickness, top]], 0.06, 2);
}

// Cast concrete: boards' panels with thin seams, a tie hole at each board's corners, soft stains and darker
// streaks running down from the top. Returns { map, normalMap, aoMap, roughnessMap }.
function createFaceMaps() {
  const random = createRandom(97);
  const surface = createSurface(FACE_TILE, FACE_HEIGHT, PIXELS, { color: [210, 207, 199], roughness: 0.85, base: 110 });
  for (let row = 0; row < FACE_HEIGHT / (BOARD / 2); row += 1) {
    for (let column = 0; column < FACE_TILE / BOARD; column += 1) {
      const tone = between(random, -9, 7);
      const rect = { left: column * BOARD, bottom: row * (BOARD / 2), width: BOARD, height: BOARD / 2 };
      surface.panel(rect, { lift: 8, bevel: 0.03, paint: { color: [212 + tone, 209 + tone, 201 + tone], roughness: between(random, 0.78, 0.9) } });
      for (const [x, y] of [[0.2, 0.15], [BOARD - 0.2, 0.15], [0.2, BOARD / 2 - 0.15], [BOARD - 0.2, BOARD / 2 - 0.15]]) {
        const [holeX, holeY] = [rect.left + x, rect.bottom + y];
        surface.groove([holeX, holeY], [holeX + 0.01, holeY], { size: 0.1, depth: 50, color: [90, 88, 84], amount: 0.8, roughness: 1 });
      }
    }
  }
  const streaks = createLayeredNoise(random, 12, 2);
  const stains = createLayeredNoise(random, 3, 2);
  const { width, height } = surface;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const streak = Math.max(0, streaks(x / width, y / height / 12) - 0.55) * 1.6;
      const stain = Math.max(0, stains(x / width, y / height) - 0.5);
      surface.colors.mix(x, y, [140, 138, 130], streak * 0.5 + stain * 0.5);
    }
  }
  return surface.toMaps({ depth: 5, shade: { reach: 0.1, strength: 1.5 }, repeat: true });
}
