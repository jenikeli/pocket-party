// What holds the kit's floating road up (M7d3): concrete piers, a column with a wide cap under the road, or, on
// the stretches a course's layout names, steel truss towers with lattice girders along the road's edges
// (kit/truss.js), as under the reference game's sky courses. None in gaps, and piers only under level road. Drawing only.
// They cast no shadow: it would fall on the sea, which takes none.
// Used by the courses' dressings.

import * as THREE from 'three';
import { frameAt, facingAlong, placeInstances } from './frames.js';
import { buildTrussTowers, buildGirders } from './truss.js';
import { ROAD_THICKNESS } from './road.js';
import { at } from '../shape-utils.js';

const PIER_SPACING = 24;
const TOWER_SPACING = 24;
const CAP_HEIGHT = 1.1;
const CAP_DEPTH = 2.4;
// A cap reaches this share of the road's half width out to each side.
const CAP_REACH = 0.7;

// Adds the supports; `kit` is the course's { world, track, keep, textures } (kit/kit.js), `seaLevel` how far
// down they reach, and `trussRuns` lists [{ fromS, toS }]: where trusses stand instead of piers.
export function buildSupports(kit, seaLevel, trussRuns) {
  const { world, track, keep } = kit;
  const inTruss = (station) => trussRuns.some((run) => station.s >= run.fromS && station.s < run.toS);
  const piers = track.stations.filter((station, index) => index % PIER_SPACING === 0 && !station.gap && station.normal.y > 0.95 && !inTruss(station));
  for (const mesh of buildPiers(kit, piers, seaLevel)) {
    mesh.castShadow = false;
    world.add(mesh);
  }
  if (trussRuns.length === 0) {
    return;
  }
  const towers = track.stations.filter((station, index) => index % TOWER_SPACING === 0 && !station.gap && inTruss(station));
  const steel = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.35 }));
  for (const shape of [buildTrussTowers(towers, seaLevel), buildGirders(track, trussRuns)]) {
    const mesh = new THREE.Mesh(keep(shape), steel);
    mesh.receiveShadow = true;
    world.add(mesh);
  }
}

// Every pier as instances of three parts: a footing at the sea, the column (stretched to its height) and the
// cap under the road (stretched to its width).
function buildPiers({ keep, textures }, stations, seaLevel) {
  const concrete = keep(new THREE.MeshStandardMaterial({ color: 0xe0dbd0, map: textures.concrete, roughness: 0.8 }));
  const footing = keep(new THREE.MeshStandardMaterial({ color: 0x8f8a80, map: textures.concrete, roughness: 0.9 }));
  const column = keep(at(new THREE.CylinderGeometry(1, 1.15, 1, 14), 0, -0.5, 0));
  const cap = keep(at(new THREE.BoxGeometry(2, CAP_HEIGHT, CAP_DEPTH), 0, -CAP_HEIGHT / 2, 0));
  const foot = keep(new THREE.CylinderGeometry(1.9, 2.2, 1.6, 14));
  const columns = [];
  const caps = [];
  const feet = [];
  for (const station of stations) {
    const top = frameAt(station, 0, -ROAD_THICKNESS, facingAlong(station));
    caps.push(top.clone().multiply(new THREE.Matrix4().makeScale(station.halfWidth * CAP_REACH, 1, 1)));
    const position = new THREE.Vector3().setFromMatrixPosition(top);
    const columnTop = position.y - CAP_HEIGHT;
    columns.push(new THREE.Matrix4().makeScale(1.2, columnTop - seaLevel, 1.2).setPosition(position.x, columnTop, position.z));
    feet.push(new THREE.Matrix4().setPosition(position.x, seaLevel + 0.3, position.z));
  }
  return [placeInstances(column, concrete, columns), placeInstances(cap, concrete, caps), placeInstances(foot, footing, feet)];
}
