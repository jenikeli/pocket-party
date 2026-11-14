// The grandstand's crowd (M7d2, moved here in M7d4c3): a small mushroom-capped spectator on most seats, each a body in
// a shirt colour, a face with two dark eyes and a mushroom cap in another colour with white spots, as round
// the reference game's stadium courses. They hop now and then. Four instanced meshes (bodies, faces, caps, and the eyes and
// spots), moved every frame. Used by kit/grandstand.js.

import * as THREE from 'three';
import { at, coloured, mergeShapes } from '../shape-utils.js';
import { createRandom, between } from '../random.js';

const SHIRTS = [0xd8302a, 0x1d4fc4, 0x2fae3a, 0xffd21e, 0xff8fc8, 0xf4f4f0, 0x8a4fd8, 0xff8c1a];
const SKIN = 0xf6dcb4;
// About this share of the seats is taken.
const TAKEN = 0.82;
const HOP_HEIGHT = 0.18;

// A spectator on most of `seats` ([{ x, y, z }], each the top middle of a seat's pan, kit/grandstand-structure.js),
// here and there an empty one. `keep(thing)` registers what must be disposed. Returns { meshes, update(dt) }:
// the meshes to add, and moving the crowd on.
export function buildCrowd(seats, keep) {
  const random = createRandom(61);
  const people = seats
    .filter(() => random() < TAKEN)
    .map((seat) => ({ ...seat, z: seat.z + 0.04, phase: random() * 10, speed: between(random, 3, 6) }));
  const material = keep(new THREE.MeshStandardMaterial({ roughness: 0.6 }));
  // Few faces each: there are a few hundred of them in every view. Each stands on its origin, the seat.
  const shapes = [
    keep(new THREE.CapsuleGeometry(0.2, 0.25, 2, 6).translate(0, 0.32, 0)),
    keep(new THREE.SphereGeometry(0.19, 7, 5).translate(0, 0.72, 0.03)),
    keep(new THREE.SphereGeometry(0.31, 8, 3, 0, 2 * Math.PI, 0, Math.PI / 2).scale(1, 0.8, 1).translate(0, 0.8, 0)),
  ];
  const colorOf = [(index) => SHIRTS[index % SHIRTS.length], () => SKIN, (index) => SHIRTS[(index * 3 + 1) % SHIRTS.length]];
  const meshes = shapes.map((shape, part) => {
    const mesh = new THREE.InstancedMesh(shape, material, people.length);
    people.forEach((person, index) => mesh.setColorAt(index, new THREE.Color(colorOf[part](index))));
    return mesh;
  });
  // The eyes and spots are the same on everyone, so they keep their own colours (no colour per spectator).
  meshes.push(new THREE.InstancedMesh(keep(buildFaceDetails()), keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 })), people.length));
  meshes.forEach((mesh) => {
    // They sit under the roof's shadow, so their own would hardly show: they cast none, which keeps them out of
    // the shadow map's drawing.
    mesh.receiveShadow = true;
    // Moved spectator by spectator below, so never cut into cells (split-meshes.js).
    mesh.userData.keepWhole = true;
  });
  const matrix = new THREE.Matrix4();
  let time = 0;

  // Each spectator hops now and then: the positive half of a slow wave, each with their own pace.
  function update(dt) {
    time += dt;
    people.forEach((person, index) => {
      const hop = Math.max(0, Math.sin(time * person.speed + person.phase) - 0.6) * HOP_HEIGHT * 2.5;
      matrix.makeTranslation(person.x, person.y + hop, person.z);
      meshes.forEach((mesh) => mesh.setMatrixAt(index, matrix));
    });
    meshes.forEach((mesh) => (mesh.instanceMatrix.needsUpdate = true));
  }

  update(0);
  return { meshes, update };
}

// Two dark eyes on the face's front (+z, toward the road) and three white spots on the cap, in few faces each:
// boxes for the eyes and flattened diamonds for the spots.
function buildFaceDetails() {
  const eyes = [-0.065, 0.065].map((x) => coloured(at(new THREE.BoxGeometry(0.045, 0.08, 0.03), x, 0.73, 0.205), 0x1a1a1e));
  const spots = [[0, 1.045, 0], [0.195, 0.97, 0.125], [-0.195, 0.97, 0.125]].map(([x, y, z]) => {
    // Lying flat on the cap: its thin axis turned out from the cap's middle.
    const out = new THREE.Vector3(x, y - 0.8, z).normalize();
    const spot = new THREE.OctahedronGeometry(0.085, 0).scale(1, 0.35, 1).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), out));
    return coloured(spot.translate(x, y, z), 0xf6f6f2);
  });
  return mergeShapes([...eyes.map((eye) => eye.toNonIndexed()), ...spots]);
}
