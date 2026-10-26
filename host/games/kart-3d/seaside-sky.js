// Seaside Skyway's sky (M7d3), round the sky half of the lap and far out: islands floating at the road's height
// and above with round trees on them, cliffs on the horizon, big cumulus clouds all round and smaller ones beside
// and under the high road, hot-air balloons drifting up and down, and an airship circling the course. Placed from seaside-landmarks.js; random scatter (the
// trees, the high clouds) comes from a fixed seed, so every host draws the same sky. None of it casts a shadow:
// the sky's shadows would fall on the sea, which takes none, so drawing them into the shadow map is wasted
// (it was the largest share of the course's triangles). Used by seaside-scenery.js.

import * as THREE from 'three';
import { FLOATING_ISLANDS, BACKDROP_CLIFFS, NEAR_CLOUDS, BALLOONS, AIRSHIP_PATH } from './seaside-landmarks.js';
import { buildFloatingIslands, buildBackdropCliffs, createRockTexture } from './kit/floating-island.js';
import { buildRoundTree } from './kit/garden-props.js';
import { buildCloud } from './kit/clouds.js';
import { buildAirship } from './kit/airship.js';
import { buildBalloon } from './kit/balloon.js';
import { createRandom, between } from './random.js';

const HIGH_CLOUDS = 22;
// The balloons rise and sink this far, once every this many seconds or so.
const BALLOON_DRIFT = 3;
const BALLOON_SECONDS = 20;

// `kit` is the course's (kit/kit.js), `seaLevel` the sea's height, `middle` the course's middle seen from above
// ({ x, z }). Returns { update(dt) }.
export function buildSeasideSky(kit, seaLevel, middle) {
  const { world, keep, textures } = kit;
  const random = createRandom(2027);
  const grass = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.grass, roughness: 0.95 }));
  const rock = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: keep(createRockTexture()), roughness: 0.9 }));
  for (const built of [buildFloatingIslands(FLOATING_ISLANDS), buildBackdropCliffs(BACKDROP_CLIFFS, seaLevel)]) {
    world.add(new THREE.Mesh(keep(built.grass), grass), new THREE.Mesh(keep(built.rock), rock));
  }
  addTrees(kit, random);
  addClouds(kit, middle, random);
  const airship = buildAirship(kit, AIRSHIP_PATH);
  world.add(airship.object);
  const balloons = addBalloons(kit);
  let time = 0;
  return {
    update(dt) {
      time += dt;
      airship.update(dt);
      balloons.forEach((balloon, index) => {
        balloon.position.y = BALLOONS[index].y + BALLOON_DRIFT * Math.sin((2 * Math.PI * time) / (BALLOON_SECONDS + index * 3) + index);
      });
    },
  };
}

// One mesh per balloon, so each drifts on its own.
function addBalloons({ world, keep }) {
  const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
  return BALLOONS.map((spot) => {
    const balloon = new THREE.Mesh(keep(buildBalloon(spot.colors)), material);
    balloon.position.set(spot.x, spot.y, spot.z);
    world.add(balloon);
    return balloon;
  });
}

// Round trees on each floating island's top, clear of its edge.
function addTrees({ world, keep }, random) {
  const object = new THREE.Object3D();
  const matrices = FLOATING_ISLANDS.flatMap((island) =>
    Array.from({ length: island.trees }, () => {
      const angle = random() * 2 * Math.PI;
      const distance = between(random, 0.1, 0.55) * island.radius;
      object.position.set(island.x + Math.cos(angle) * distance, island.y + 0.04 * island.radius, island.z + Math.sin(angle) * distance);
      object.rotation.set(0, random() * 6, 0);
      object.scale.setScalar(between(random, 0.85, 1.25));
      object.updateMatrix();
      return object.matrix.clone();
    }),
  );
  const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  const trees = new THREE.InstancedMesh(keep(buildRoundTree()), material, matrices.length);
  matrices.forEach((matrix, index) => trees.setMatrixAt(index, matrix));
  world.add(trees);
}

// Big clouds in a ring far out, and the smaller ones round the high road. A little light of their own keeps their
// tops bright white; their undersides stay blue-grey from their colours.
function addClouds({ world, keep }, middle, random) {
  const high = Array.from({ length: HIGH_CLOUDS }, () => {
    const angle = random() * 2 * Math.PI;
    const distance = between(random, 280, 650);
    return { x: middle.x + Math.cos(angle) * distance, y: between(random, 45, 120), z: middle.z + Math.sin(angle) * distance, size: between(random, 1.2, 2.8) };
  });
  const object = new THREE.Object3D();
  const spots = [...high, ...NEAR_CLOUDS];
  const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: 0x9aa8c0, emissiveIntensity: 0.45 }));
  const clouds = new THREE.InstancedMesh(keep(buildCloud()), material, spots.length);
  spots.forEach((spot, index) => {
    object.position.set(spot.x, spot.y, spot.z);
    object.rotation.set(0, index * 2.4, 0);
    object.scale.setScalar(spot.size);
    object.updateMatrix();
    clouds.setMatrixAt(index, object.matrix);
  });
  world.add(clouds);
}
