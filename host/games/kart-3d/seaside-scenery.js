// Seaside Skyway's scenery (M7c), added to the plain world of scenery.js: sandy islands with palms and rocks under
// and around the road, a lighthouse with a glowing lamp, hills on the horizon, sailboats bobbing, clouds above
// and below the road, ripples on the sea that catch the sun, and the trackside dressing (trackside.js). Placed
// from seaside-layout.js; random scatter (palms, rocks, clouds) comes from a fixed seed, so every host draws the
// same course. Each set of one prop is one instanced mesh: a draw call per set per view. Used by scenery.js.

import * as THREE from 'three';
import { ISLANDS, LIGHTHOUSE, BOATS, islandHeightAt } from './seaside-layout.js';
import { buildPalm, buildRock, buildBoat, buildCloud, buildLighthouse, lighthouseLampHeight } from './seaside-props.js';
import { at, mergeShapes } from './shape-utils.js';
import { createRippleTexture } from './textures.js';
import { createRandom, between } from './random.js';
import { buildTrackside } from './trackside.js';

const COLORS = { sand: 0xeedc9a, grass: 0x5aa83a, hillGrass: 0x4d8d3c, hillRock: 0x7c8070 };
// Islands taller than this are the horizon's hills, with rock on their upper half.
const HILL_HEIGHT = 20;
// The lamp glows far brighter than white.
const LAMP_COLOR = new THREE.Color(1, 0.85, 0.45).multiplyScalar(5);
// The sea's ripples repeat every this many units and drift this many repeats a second.
const RIPPLE_TILE = 36;
const RIPPLE_DRIFT = 0.012;
const HIGH_CLOUDS = 26;
const LOW_CLOUDS = 10;

// `world` is the group to add to, `track` the course, `sea` the plain sea's mesh (its height is the sea level),
// `keep(thing)` registers what must be disposed with the world. Returns { update(dt) }.
export function buildSeasideScenery({ world, track, sea, keep }) {
  const seaLevel = sea.position.y;
  const random = createRandom(2026);
  const ground = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  const lighthouseIsland = ISLANDS[LIGHTHOUSE.island];
  const lighthouseBase = seaLevel + lighthouseIsland.height;
  const land = new THREE.Mesh(
    keep(mergeShapes([...ISLANDS.map((island) => buildIsland(island, seaLevel, random)), at(buildLighthouse(LIGHTHOUSE.height), lighthouseIsland.x, lighthouseBase, lighthouseIsland.z)])),
    ground,
  );
  land.receiveShadow = true;
  const lamp = new THREE.Mesh(keep(new THREE.SphereGeometry(1.3, 12, 8)), keep(new THREE.MeshBasicMaterial({ color: LAMP_COLOR })));
  lamp.position.set(lighthouseIsland.x, lighthouseBase + lighthouseLampHeight(LIGHTHOUSE.height), lighthouseIsland.z);
  const boats = createBoats(ground, keep, seaLevel);
  world.add(land, lamp, createPalms(ground, keep, seaLevel, random), createRocks(ground, keep, seaLevel, random), boats.mesh);
  world.add(createClouds(keep, track, seaLevel, random));
  const ripples = keep(createRippleTexture());
  ripples.repeat.set(sea.geometry.parameters.width / RIPPLE_TILE, sea.geometry.parameters.height / RIPPLE_TILE);
  Object.assign(sea.material, { normalMap: ripples, roughness: 0.2, needsUpdate: true });
  sea.material.normalScale.set(0.35, 0.35);
  buildTrackside(world, track, keep);
  let time = 0;

  function update(dt) {
    time += dt;
    ripples.offset.set(time * RIPPLE_DRIFT, time * RIPPLE_DRIFT * 0.6);
    boats.bob(time);
  }

  return { update };
}

// An island turned from its height profile (seaside-layout.js) and made irregular by a wobble round its shore,
// coloured sand at the beach, grass above, and rock high on the hills.
function buildIsland(island, seaLevel, random) {
  const shares = [1.12, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0];
  // The first point is under water, so the beach meets the sea without a gap.
  const profile = shares.map((share, index) => new THREE.Vector2(share * island.radius, index === 0 ? -3 : islandHeightAt(island, share * island.radius)));
  const shape = new THREE.LatheGeometry(profile, island.height > HILL_HEIGHT ? 32 : 24);
  const phases = [random() * 2 * Math.PI, random() * 2 * Math.PI];
  const positions = shape.attributes.position;
  const colors = [];
  const color = new THREE.Color();
  for (let index = 0; index < positions.count; index += 1) {
    const angle = Math.atan2(positions.getZ(index), positions.getX(index));
    const wobble = 1 + 0.12 * Math.sin(3 * angle + phases[0]) + 0.07 * Math.sin(5 * angle + phases[1]);
    positions.setX(index, positions.getX(index) * wobble);
    positions.setZ(index, positions.getZ(index) * wobble);
    color.setHex(groundColor(island, positions.getY(index)));
    colors.push(color.r, color.g, color.b);
  }
  shape.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  shape.computeVertexNormals();
  return shape.translate(island.x, seaLevel, island.z);
}

function groundColor(island, height) {
  if (height < 1.15) {
    return COLORS.sand;
  }
  if (island.height <= HILL_HEIGHT) {
    return COLORS.grass;
  }
  return height > island.height * 0.55 ? COLORS.hillRock : COLORS.hillGrass;
}

// Palms on each island's grass, standing on its slope, each turned and sized a little differently.
function createPalms(material, keep, seaLevel, random) {
  const spots = ISLANDS.flatMap((island) =>
    Array.from({ length: island.palms }, () => {
      const angle = random() * 2 * Math.PI;
      const distance = between(random, 0.2, 0.65) * island.radius;
      const x = island.x + Math.cos(angle) * distance;
      const z = island.z + Math.sin(angle) * distance;
      return { x, y: seaLevel + islandHeightAt(island, distance) - 0.3, z, turn: random() * 2 * Math.PI, size: between(random, 0.8, 1.2) };
    }),
  );
  const palms = placeInstances(new THREE.InstancedMesh(keep(buildPalm()), material, spots.length), spots);
  palms.castShadow = true;
  palms.receiveShadow = true;
  return palms;
}

// Rocks round the shores of the small islands, half sunk in the sand and sea.
function createRocks(material, keep, seaLevel, random) {
  const spots = ISLANDS.filter((island) => island.height <= HILL_HEIGHT).flatMap((island) =>
    Array.from({ length: 4 }, () => {
      const angle = random() * 2 * Math.PI;
      const distance = between(random, 0.9, 1.1) * island.radius;
      return { x: island.x + Math.cos(angle) * distance, y: seaLevel, z: island.z + Math.sin(angle) * distance, turn: random() * 6, size: between(random, 1.5, 3.5) };
    }),
  );
  return placeInstances(new THREE.InstancedMesh(keep(buildRock()), material, spots.length), spots);
}

// Returns { mesh, bob(time) }: the boats, rocking gently on the waves at `time` seconds.
function createBoats(material, keep, seaLevel) {
  const mesh = new THREE.InstancedMesh(keep(buildBoat()), material, BOATS.length);
  const matrix = new THREE.Matrix4();
  const turn = new THREE.Quaternion();
  const tilt = new THREE.Euler(0, 0, 0, 'YXZ');
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  function bob(time) {
    BOATS.forEach((boat, index) => {
      tilt.set(0.04 * Math.sin(time * 0.9 + index), boat.heading, 0.07 * Math.sin(time * 1.1 + index * 2));
      position.set(boat.x, seaLevel + 0.25 * Math.sin(time * 1.3 + index), boat.z);
      mesh.setMatrixAt(index, matrix.compose(position, turn.setFromEuler(tilt), scale));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  bob(0);
  return { mesh, bob };
}

// High clouds all round the course in the distance, and low ones below the road, as on MK8DX's sky courses. A low
// cloud floats 8 to 12 above the sea and is at most about 6 tall at its size, so its top stays below -10, under
// the road (whose lowest point is at height 0).
function createClouds(keep, track, seaLevel, random) {
  const middle = track.stations.reduce((sum, station) => sum.add(new THREE.Vector3(station.point.x, 0, station.point.z)), new THREE.Vector3()).divideScalar(track.stations.length);
  const ring = (count, near, far, low, high, smallest, largest) =>
    Array.from({ length: count }, () => {
      const angle = random() * 2 * Math.PI;
      const distance = between(random, near, far);
      return { x: middle.x + Math.cos(angle) * distance, y: between(random, low, high), z: middle.z + Math.sin(angle) * distance, turn: random() * 6, size: between(random, smallest, largest) };
    });
  const spots = [...ring(HIGH_CLOUDS, 260, 650, 40, 110, 1, 2.4), ...ring(LOW_CLOUDS, 170, 260, seaLevel + 8, seaLevel + 12, 0.5, 0.8)];
  // A little of their own light, so their undersides stay bright white instead of going grey.
  const material = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x8090a0, emissiveIntensity: 0.5 }));
  return placeInstances(new THREE.InstancedMesh(keep(buildCloud()), material, spots.length), spots);
}

// Sets each instance's matrix from its spot { x, y, z, turn (about up), size }.
function placeInstances(mesh, spots) {
  const object = new THREE.Object3D();
  spots.forEach((spot, index) => {
    object.position.set(spot.x, spot.y, spot.z);
    object.rotation.set(0, spot.turn, 0);
    object.scale.setScalar(spot.size);
    object.updateMatrix();
    mesh.setMatrixAt(index, object.matrix);
  });
  return mesh;
}
