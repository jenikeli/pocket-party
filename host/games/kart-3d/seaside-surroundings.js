// Seaside Skyway's sea and what stands in it (M7d3), round the seaside half of the lap: beach islands with
// turquoise shallows, foam, rocks and palms, huts on stilts in their shallows, the stone lighthouse on its rocky
// island ahead of the start straight, the giant Koopa shell half sunk off the first corner, sailboats rocking,
// and ripples on the water. Placed from seaside-landmarks.js; every set of one piece is one instanced or merged
// mesh. Only the palms cast shadows (onto their islands): everything else's would fall on the sea, which takes
// none. Used by seaside-scenery.js.

import * as THREE from 'three';
import { BEACH_ISLANDS, LIGHTHOUSE, KOOPA_SHELL, BOATS, islandHeightAt } from './seaside-landmarks.js';
import { buildBeachIslands } from './kit/beach-island.js';
import { buildPalm } from './kit/palm.js';
import { buildStiltHut } from './kit/stilt-hut.js';
import { buildLighthouse } from './kit/lighthouse.js';
import { buildKoopaShell } from './kit/koopa-shell.js';
import { buildSailboat } from './kit/sailboat.js';
import { createThatchTexture, createStoneTexture } from './kit/seaside-textures.js';
import { dressSea } from './kit/sea.js';

// The lamp is off by day: warm glass lit by the sun (a lit lamp looked odd in daylight on the M7c device run).
const GLASS = { color: 0xfff1cc, roughness: 0.1, metalness: 0.1 };
// The foam comes and goes once every this many seconds.
const FOAM_SECONDS = 3.7;

// `kit` is the course's (kit/kit.js), `sea` scenery.js's sea mesh (its height is the sea level). Returns
// { update(dt) }.
export function buildSeasideSurroundings(kit, sea) {
  const { world, keep } = kit;
  const seaLevel = sea.position.y;
  const lighthouseIsland = { ...LIGHTHOUSE, palms: 2, huts: 0 };
  const islands = buildBeachIslands([...BEACH_ISLANDS, lighthouseIsland], seaLevel);
  const foam = addIslands(kit, islands);
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
      foam.opacity = 0.8 + 0.2 * Math.sin((2 * Math.PI * time) / FOAM_SECONDS);
      boats.bob(time);
    },
  };
}

// The islands' land, rocks, shallows and foam. Returns the foam's material, whose opacity comes and goes.
function addIslands({ world, keep, textures }, islands) {
  const land = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.sand, roughness: 0.9 }));
  const rock = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
  // Drawn after the land and seen through: they must not hide what is under them in the depth buffer.
  const shallows = keep(new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, depthWrite: false, roughness: 0.15 }));
  const foam = keep(new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, depthWrite: false, roughness: 0.6 }));
  const landMesh = new THREE.Mesh(keep(islands.land), land);
  landMesh.receiveShadow = true;
  world.add(landMesh, new THREE.Mesh(keep(islands.rocks), rock), new THREE.Mesh(keep(islands.shallows), shallows), new THREE.Mesh(keep(islands.foam), foam));
  return foam;
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

// Returns the mesh.
function addInstances({ world, keep }, geometry, material, spots) {
  const mesh = new THREE.InstancedMesh(keep(geometry), material, spots.length);
  spotMatrices(spots).forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  world.add(mesh);
  return mesh;
}

function addPalms(kit, spots) {
  const palm = buildPalm();
  const trunk = kit.keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
  for (const mesh of [addInstances(kit, palm.trunk, trunk, spots), addInstances(kit, palm.fronds, kit.fronds, spots)]) {
    mesh.castShadow = true;
  }
}

function addHuts(kit, spots) {
  const hut = buildStiltHut();
  const thatchTexture = kit.keep(createThatchTexture());
  thatchTexture.repeat.set(3, 1.5);
  addInstances(kit, hut.wood, kit.keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: kit.textures.wood, roughness: 0.85 })), spots);
  addInstances(kit, hut.thatch, kit.keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: thatchTexture, roughness: 0.95 })), spots);
}

// The lighthouse stands on its island's top, `base` high, its door toward the start straight (-x).
function addLighthouse({ world, keep }, base) {
  const { stone, painted, glass } = buildLighthouse(LIGHTHOUSE.tower);
  const stoneTexture = keep(createStoneTexture());
  const materials = [
    [stone, keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: stoneTexture, roughness: 0.85 }))],
    [painted, keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }))],
    [glass, keep(new THREE.MeshStandardMaterial(GLASS))],
  ];
  for (const [geometry, material] of materials) {
    const mesh = new THREE.Mesh(keep(geometry), material);
    mesh.position.set(LIGHTHOUSE.x, base, LIGHTHOUSE.z);
    mesh.rotation.y = -Math.PI / 2;
    world.add(mesh);
  }
}

// Half sunk and tipped over, as if it had sailed in and run aground.
function addKoopaShell({ world, keep }, seaLevel) {
  const { geometry, material } = buildKoopaShell(keep);
  const shell = new THREE.Mesh(geometry, material);
  shell.scale.setScalar(KOOPA_SHELL.radius);
  shell.position.set(KOOPA_SHELL.x, seaLevel - KOOPA_SHELL.radius * 0.25, KOOPA_SHELL.z);
  shell.rotation.set(KOOPA_SHELL.tilt, KOOPA_SHELL.heading, 0, 'YXZ');
  world.add(shell);
}

// Returns { bob(time) }: the boats rocking gently on the waves at `time` seconds.
function addBoats({ world, keep }, seaLevel) {
  const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide }));
  const mesh = new THREE.InstancedMesh(keep(buildSailboat()), material, BOATS.length);
  world.add(mesh);
  const matrix = new THREE.Matrix4();
  const turn = new THREE.Quaternion();
  const tilt = new THREE.Euler(0, 0, 0, 'YXZ');
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  function bob(time) {
    BOATS.forEach((boat, index) => {
      tilt.set(0.04 * Math.sin(time * 0.9 + index), boat.heading, 0.07 * Math.sin(time * 1.1 + index * 2));
      position.set(boat.x, seaLevel + 0.2 * Math.sin(time * 1.3 + index), boat.z);
      mesh.setMatrixAt(index, matrix.compose(position, turn.setFromEuler(tilt), scale));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  bob(0);
  return { bob };
}
