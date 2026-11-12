// Seaside Skyway's sky (M7d3), round the sky half of the lap and far out: big cumulus clouds all round and smaller
// ones beside and under the high road, hot-air balloons drifting up and down, and an airship circling the course.
// Placed from seaside-landmarks.js; the high clouds' scatter comes from a fixed seed, so every host draws the same
// sky. (The floating islands and the backdrop cliffs went in M10: they looked bad.) None of it casts a shadow:
// the sky's shadows would fall on the sea, which takes none, so drawing them into the shadow map is wasted
// (it was the largest share of the course's triangles). Used by seaside-scenery.js.

import * as THREE from 'three';
import { NEAR_CLOUDS, BALLOONS, AIRSHIP_PATH } from './seaside-landmarks.js';
import { buildCloud } from './kit/clouds.js';
import { buildAirship } from './kit/airship.js';
import { buildBalloon } from './kit/balloon.js';
import { createRandom, between } from './random.js';

const HIGH_CLOUDS = 22;
// The balloons rise and sink this far, once every this many seconds or so.
const BALLOON_DRIFT = 3;
const BALLOON_SECONDS = 20;

// `kit` is the course's (kit/kit.js), `middle` the course's middle seen from above ({ x, z }). Returns
// { update(dt) }.
export function buildSeasideSky(kit, middle) {
  addClouds(kit, middle, createRandom(2027));
  const airship = buildAirship(kit, AIRSHIP_PATH);
  kit.world.add(airship.object);
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
function addBalloons(kit) {
  return BALLOONS.map((spot) => {
    const [{ geometry, material }] = buildBalloon(kit, spot.colors);
    const balloon = new THREE.Mesh(geometry, material);
    balloon.position.set(spot.x, spot.y, spot.z);
    kit.world.add(balloon);
    return balloon;
  });
}

// Big clouds in a ring far out, and the smaller ones round the high road.
function addClouds(kit, middle, random) {
  const high = Array.from({ length: HIGH_CLOUDS }, () => {
    const angle = random() * 2 * Math.PI;
    const distance = between(random, 280, 650);
    return { x: middle.x + Math.cos(angle) * distance, y: between(random, 45, 120), z: middle.z + Math.sin(angle) * distance, size: between(random, 1.2, 2.8) };
  });
  const object = new THREE.Object3D();
  const spots = [...high, ...NEAR_CLOUDS];
  const [{ geometry, material }] = buildCloud(kit);
  const clouds = new THREE.InstancedMesh(geometry, material, spots.length);
  spots.forEach((spot, index) => {
    object.position.set(spot.x, spot.y, spot.z);
    object.rotation.set(0, index * 2.4, 0);
    object.scale.setScalar(spot.size);
    object.updateMatrix();
    clouds.setMatrixAt(index, object.matrix);
  });
  kit.world.add(clouds);
}
