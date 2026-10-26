// The kit's decks beside the road (M7d2): the road floats over the sea, so whatever stands beside it (stands,
// vans, lamps, props) stands on a deck that runs along outside a wall, at the road's height, following its
// bends: grass, paving, sand or a boardwalk on top, concrete sides, and pillars down to the sea. Since M7d3 a
// deck's free ends taper away in an S curve, and decks that meet end to end run on as one (deckDepthAt in
// kit/layout-rules.js). Karts never reach one (the wall is
// between), so they are drawing only. Where they go comes from a course's layout. Used by the courses' dressings.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment } from './extrude.js';
import { stationIndexAt } from '../track.js';
import { edgeLateral, placeInstances, withShadows } from './frames.js';
import { addScaled } from '../vector.js';
import { sideSign, deckDepthAt } from './layout-rules.js';

const THICKNESS = 1;
// Each ground's colour (multiplying its texture) and texture: one tile every this many units.
const GROUND = {
  grass: { hex: 0xffffff, texture: 'grass', tile: 8 },
  paving: { hex: 0xe2ddd2, texture: 'concrete', tile: 8 },
  sand: { hex: 0xffffff, texture: 'sand', tile: 6 },
  // Planks across the deck, about half a unit wide.
  boards: { hex: 0xd8c4a4, texture: 'wood', tile: 2 },
};
const SIDES = 0xc8c2b8;
const PILLAR_SPACING = 12;
// No pillar where a tapering deck is too narrow to hide one.
const MIN_PILLAR_DEPTH = 3;

// Adds the decks; `kit` is the course's { world, track, keep, textures } (kit/kit.js). `platforms` lists
// [{ fromS, toS, side: 'left' or 'right', depth, ground (a key of GROUND) }]; `seaLevel` is how far down the
// pillars reach.
export function buildPlatforms({ world, track, keep, textures }, platforms, seaLevel) {
  const tops = Object.fromEntries(Object.keys(GROUND).map((ground) => [ground, createStripBuilder()]));
  const sides = createStripBuilder();
  const pillars = [];
  for (const platform of platforms) {
    const side = sideSign(platform.side);
    const depthAt = (station) => deckDepthAt(platform, station.s, platforms, track.length);
    stationsOf(track, platform).forEach((index, count) => {
      const segment = { station: track.stations[index], next: track.stations[(index + 1) % track.stations.length], index };
      const [depth, endDepth] = [depthAt(segment.station), depthAt(segment.next)];
      const { hex, tile } = GROUND[platform.ground];
      const uvOf = (around, s) => [around / tile, s / tile];
      extrudeSegment(tops[platform.ground], segment, side, [[0, 0], [depth, 0]], hex, { uvOf, endProfile: [[0, 0], [endDepth, 0]] });
      const sideProfile = (deep) => [[deep, 0], [deep, -THICKNESS], [0, -THICKNESS]];
      extrudeSegment(sides, segment, side, sideProfile(depth), SIDES, { endProfile: sideProfile(endDepth) });
      if (count % PILLAR_SPACING === PILLAR_SPACING / 2 && depth > MIN_PILLAR_DEPTH) {
        pillars.push(pillarAt(segment.station, side, depth, seaLevel));
      }
    });
  }
  for (const ground of new Set(platforms.map((platform) => platform.ground))) {
    const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures[GROUND[ground].texture], roughness: 0.9 }));
    world.add(withShadows(new THREE.Mesh(keep(tops[ground].build()), material)));
  }
  const concrete = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.concrete, roughness: 0.9 }));
  world.add(withShadows(new THREE.Mesh(keep(sides.build()), concrete)));
  const pillarShape = keep(new THREE.CylinderGeometry(0.8, 1.1, 1, 10).translate(0, -0.5, 0));
  world.add(placeInstances(pillarShape, keep(new THREE.MeshStandardMaterial({ color: 0xd9d4c7, roughness: 0.7 })), pillars));
}

// The indices of the stations whose segments the platform covers, in order (it may run across the lap's start).
function stationsOf(track, { fromS, toS }) {
  const indices = [];
  const count = track.stations.length;
  const first = stationIndexAt(track, ((fromS % track.length) + track.length) % track.length);
  for (let index = first; indices.length < count; index = (index + 1) % count) {
    const station = track.stations[index];
    const s = station.s < track.stations[first].s ? station.s + track.length : station.s;
    if (s >= toS) {
      break;
    }
    indices.push(index);
  }
  return indices;
}

// A pillar under the middle of the deck at `station`, from the deck's underside down to the sea: a Matrix4.
function pillarAt(station, side, depth, seaLevel) {
  const top = addScaled(addScaled(station.point, station.right, edgeLateral(station, side) + (side * depth) / 2), station.normal, -THICKNESS);
  return new THREE.Matrix4().makeScale(1, top.y - seaLevel, 1).setPosition(top.x, top.y, top.z);
}
