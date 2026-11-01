// Seaside Skyway's sea and what stands in it (M7d3), round the seaside half of the lap: beach islands with
// turquoise shallows, foam, rocks and palms, huts on stilts in their shallows, the stone lighthouse on its rocky
// island ahead of the start straight, the giant Koopa shell half sunk off the first corner, sailboats rocking,
// and ripples on the water. Placed from seaside-landmarks.js; every set of one piece is one instanced or merged
// mesh. Only the palms cast shadows (onto their islands): everything else's would fall on the sea, which takes
// none. Used by seaside-scenery.js; the kit-shots page reuses addIslands and addInstances.

import * as THREE from 'three';
import { BEACH_ISLANDS, LIGHTHOUSE, KOOPA_SHELL, BOATS, islandHeightAt } from './seaside-landmarks.js';
import { buildBeachIslands } from './kit/beach-island.js';
import { buildPalmParts } from './kit/palm.js';
import { buildStiltHut } from './kit/stilt-hut.js';
import { buildLighthouse } from './kit/lighthouse.js';
import { buildKoopaShell } from './kit/koopa-shell.js';
import { buildSailboat } from './kit/sailboat.js';
import { buildMotorYacht } from './kit/motor-yacht.js';
import { dressSea } from './kit/sea.js';

// The foam comes and goes once every this many seconds.
const FOAM_SECONDS = 3.7;

// `kit` is the course's (kit/kit.js), `sea` scenery.js's sea mesh (its height is the sea level). Returns
// { update(dt) }.
export function buildSeasideSurroundings(kit, sea) {
  const { keep } = kit;
  const seaLevel = sea.position.y;
  const lighthouseIsland = { ...LIGHTHOUSE, palms: 2, huts: 0 };
  const islands = buildBeachIslands(kit, [...BEACH_ISLANDS, lighthouseIsland], seaLevel);
  addIslands(kit, islands.parts);
  addPalms(kit, islands.palms);
  addHuts(kit, islands.huts);
  addLighthouse(kit, seaLevel + islandHeightAt(lighthouseIsland, 0));
  addKoopaShell(kit, seaLevel);
  const boats = addBoats(kit, seaLevel);
  const water = dressSea(sea, keep);
  let time = 0;
  return {
    update(dt) {
      time += dt;
      water.update(dt);
      islands.foam.opacity = 0.8 + 0.2 * Math.sin((2 * Math.PI * time) / FOAM_SECONDS);
      boats.bob(time);
    },
  };
}

// The islands' land, rocks, shallows and foam: one mesh per part; the land takes the palms' shadows.
export function addIslands({ world }, parts) {
  for (const { geometry, material, receiveShadow } of parts) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = Boolean(receiveShadow);
    world.add(mesh);
  }
}

// One matrix per spot { x, y, z, turn (about up), size }.
function spotMatrices(spots) {
  const object = new THREE.Object3D();
  return spots.map((spot) => {
    object.position.set(spot.x, spot.y, spot.z);
    object.rotation.set(0, spot.turn, 0);
    object.scale.setScalar(spot.size);
    object.updateMatrix();
    return object.matrix.clone();
  });
}

// One instanced mesh per part of a piece, standing at every spot. Returns the meshes.
export function addInstances({ world }, parts, spots) {
  const matrices = spotMatrices(spots);
  return parts.map(({ geometry, material }) => {
    const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    world.add(mesh);
    return mesh;
  });
}

function addPalms(kit, spots) {
  for (const mesh of addInstances(kit, buildPalmParts(kit), spots)) {
    mesh.castShadow = true;
  }
}

function addHuts(kit, spots) {
  addInstances(kit, buildStiltHut(kit), spots);
}

// The lighthouse stands on its island's top, `base` high, its door toward the start straight (-x).
function addLighthouse(kit, base) {
  const { world } = kit;
  for (const { geometry, material } of buildLighthouse(kit, LIGHTHOUSE.tower)) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(LIGHTHOUSE.x, base, LIGHTHOUSE.z);
    mesh.rotation.y = -Math.PI / 2;
    world.add(mesh);
  }
}

// Half sunk and tipped over, as if it had sailed in and run aground.
function addKoopaShell(kit, seaLevel) {
  const [{ geometry, material }] = buildKoopaShell(kit);
  const shell = new THREE.Mesh(geometry, material);
  shell.scale.setScalar(KOOPA_SHELL.radius);
  shell.position.set(KOOPA_SHELL.x, seaLevel - KOOPA_SHELL.radius * 0.25, KOOPA_SHELL.z);
  shell.rotation.set(KOOPA_SHELL.tilt, KOOPA_SHELL.heading, 0, 'YXZ');
  kit.world.add(shell);
}

// How to build each kind of boat in BOATS.
const BOAT_BUILDERS = { sailboat: buildSailboat, 'motor-yacht': buildMotorYacht };

// Returns { bob(time) }: the boats rocking gently on the waves at `time` seconds. Each kind of boat is one
// instanced mesh per part.
function addBoats(kit, seaLevel) {
  const matrix = new THREE.Matrix4();
  const turn = new THREE.Quaternion();
  const tilt = new THREE.Euler(0, 0, 0, 'YXZ');
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  const fleets = Object.entries(BOAT_BUILDERS).map(([kind, build]) => {
    // Each boat keeps its index in BOATS, so its rocking is out of step with its neighbours'.
    const boats = BOATS.map((boat, index) => ({ boat, index })).filter(({ boat }) => boat.kind === kind);
    const meshes = build(kit).map(({ geometry, material }) => {
      const mesh = new THREE.InstancedMesh(geometry, material, boats.length);
      // Moved boat by boat in bob(), so never cut into cells (split-meshes.js).
      mesh.userData.keepWhole = true;
      kit.world.add(mesh);
      return mesh;
    });
    return { boats, meshes };
  });
  function bob(time) {
    for (const { boats, meshes } of fleets) {
      boats.forEach(({ boat, index }, slot) => {
        tilt.set(0.04 * Math.sin(time * 0.9 + index), boat.heading, 0.07 * Math.sin(time * 1.1 + index * 2));
        position.set(boat.x, seaLevel + 0.2 * Math.sin(time * 1.3 + index), boat.z);
        matrix.compose(position, turn.setFromEuler(tilt), scale);
        meshes.forEach((mesh) => mesh.setMatrixAt(slot, matrix));
      });
      meshes.forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
    }
  }
  bob(0);
  return { bob };
}
