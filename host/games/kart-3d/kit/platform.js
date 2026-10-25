// The kit's decks beside the road (M7d2): the road floats over the sea, so whatever stands beside it (stands,
// vans, lamps, props) stands on a deck that runs along outside a wall, at the road's height, following its
// bends: grass or paving on top, concrete sides, and pillars down to the sea. Karts never reach one (the wall is
// between), so they are drawing only. Where they go comes from a course's layout. Used by the courses' dressings.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { extrudeSegment } from './extrude.js';
import { stationIndexAt } from '../track.js';
import { edgeLateral, placeInstances, withShadows } from './frames.js';
import { addScaled } from '../vector.js';
import { sideSign } from './layout-rules.js';

const THICKNESS = 1;
const GROUND = { grass: 0xffffff, paving: 0xe2ddd2 };
const SIDES = 0xc8c2b8;
const PILLAR_SPACING = 12;

// Adds the decks; `kit` is the course's { world, track, keep, textures } (kit/kit.js). `platforms` lists
// [{ fromS, toS, side: 'left' or 'right', depth, ground: 'grass' or 'paving' }]; `seaLevel` is how far down the
// pillars reach.
export function buildPlatforms({ world, track, keep, textures }, platforms, seaLevel) {
  const tops = { grass: createStripBuilder(), paving: createStripBuilder() };
  const sides = createStripBuilder();
  const pillars = [];
  for (const platform of platforms) {
    const side = sideSign(platform.side);
    const { depth } = platform;
    const indices = stationsOf(track, platform);
    indices.forEach((index, count) => {
      const segment = { station: track.stations[index], next: track.stations[(index + 1) % track.stations.length], index };
      extrudeSegment(tops[platform.ground], segment, side, [[0, 0], [depth, 0]], GROUND[platform.ground]);
      extrudeSegment(sides, segment, side, [[depth, 0], [depth, -THICKNESS], [0, -THICKNESS]], SIDES);
      if (count % PILLAR_SPACING === PILLAR_SPACING / 2) {
        pillars.push(pillarAt(segment.station, side, depth, seaLevel));
      }
    });
    addEnd(sides, track.stations[indices[0]], side, depth, -1);
    addEnd(sides, track.stations[(indices.at(-1) + 1) % track.stations.length], side, depth, 1);
  }
  const maps = { grass: textures.grass, paving: textures.concrete };
  for (const ground of Object.keys(tops)) {
    const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: maps[ground], roughness: 0.9 }));
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

// The deck's end face at `station`, facing back along the road at its start (`facing` -1) or on at its end (1).
function addEnd(builder, station, side, depth, facing) {
  const normal = { x: station.tangent.x * facing, y: station.tangent.y * facing, z: station.tangent.z * facing };
  const corner = (out, lift) => ({
    point: addScaled(addScaled(station.point, station.right, edgeLateral(station, side) + side * out), station.normal, lift),
    normal,
    uv: [out / 8, lift / 8],
  });
  const [near, far] = side * facing > 0 ? [0, depth] : [depth, 0];
  builder.quad([corner(near, 0), corner(far, 0), corner(near, -THICKNESS), corner(far, -THICKNESS)], SIDES);
}
