// The kit's grandstand (M7d2): concrete tiers of blue and red seats under a white roof on posts, sponsor boards
// (kit/sponsors.js) along its front, and a crowd of small Toad-like spectators in many colours who hop now and
// then, as round MK8DX's stadium courses. Built straight, facing +z (toward the road), standing on y = 0 with its
// front at z = 0. The crowd is three instanced meshes (bodies, faces, caps), moved every frame. Used by the
// courses' dressings.

import * as THREE from 'three';
import { roundedBox, at, coloured, mergeShapes } from '../shape-utils.js';
import { sponsorUv } from './sponsors.js';
import { withShadows } from './frames.js';
import { createRandom, between } from '../random.js';

const TIERS = 5;
const TIER_RISE = 0.6;
const TIER_DEPTH = 1.3;
const FRONT_WALL = 1.1;
const ROOF_HEIGHT = 6.6;
const SEAT_COLORS = [0x1d4fc4, 0xd8302a];
const SHIRTS = [0xd8302a, 0x1d4fc4, 0x2fae3a, 0xffd21e, 0xff8fc8, 0xf4f4f0, 0x8a4fd8, 0xff8c1a];
const SPECTATOR_SPACING = 0.75;
const HOP_HEIGHT = 0.18;

// `length` along the road. `kit` is the course's { keep, sponsors } (kit/kit.js). Returns { object,
// update(dt) }: the stand as a group to place, and moving the crowd on.
export function buildGrandstand(length, { keep, sponsors }) {
  const group = new THREE.Group();
  const painted = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
  group.add(withShadows(new THREE.Mesh(keep(buildStructure(length)), painted)));
  group.add(withShadows(new THREE.Mesh(keep(buildBoards(length)), sponsors)));
  const crowd = buildCrowd(length, keep);
  group.add(...crowd.meshes);
  return { object: group, update: crowd.update };
}

// The tiers (each a step of concrete with a long seat on it), the front wall, the end walls and the roof.
function buildStructure(length) {
  const parts = [coloured(at(new THREE.BoxGeometry(length, FRONT_WALL, 0.3), 0, FRONT_WALL / 2, -0.15), 0xe8e4dc)];
  for (let tier = 0; tier < TIERS; tier += 1) {
    const top = FRONT_WALL - 0.3 + tier * TIER_RISE;
    const z = -0.3 - (tier + 0.5) * TIER_DEPTH;
    parts.push(
      coloured(at(new THREE.BoxGeometry(length, top, TIER_DEPTH), 0, top / 2, z), 0xc8c2b8),
      coloured(at(roundedBox(length - 0.4, 0.35, 0.5, 0.08), 0, top + 0.17, z - 0.2), SEAT_COLORS[tier % 2]),
    );
  }
  const back = -0.3 - TIERS * TIER_DEPTH;
  for (const side of [-1, 1]) {
    parts.push(coloured(at(new THREE.BoxGeometry(0.3, ROOF_HEIGHT, -back), side * (length / 2 + 0.15), ROOF_HEIGHT / 2, back / 2), 0xe8e4dc));
    parts.push(coloured(at(new THREE.CylinderGeometry(0.12, 0.12, ROOF_HEIGHT, 8), side * (length / 2 - 0.4), ROOF_HEIGHT / 2, -0.4), 0xf4f4f0));
  }
  parts.push(
    coloured(at(new THREE.BoxGeometry(length, ROOF_HEIGHT, 0.3), 0, ROOF_HEIGHT / 2, back - 0.15), 0xe8e4dc),
    coloured(at(new THREE.BoxGeometry(length + 1, 0.25, -back + 1.4).rotateX(-0.12), 0, ROOF_HEIGHT + 0.25, back / 2 + 0.2), 0xf4f4f0),
    coloured(at(new THREE.BoxGeometry(length + 1.04, 0.35, 0.2), 0, ROOF_HEIGHT + 0.02, 0.92), 0xd8302a),
  );
  return mergeShapes(parts);
}

// Boards along the front wall, each about 4 long, each a different brand.
function buildBoards(length) {
  const count = Math.max(1, Math.round(length / 4));
  const width = length / count;
  return mergeShapes(
    Array.from({ length: count }, (_, index) => {
      const board = new THREE.PlaneGeometry(width - 0.1, FRONT_WALL - 0.2);
      const uv = board.attributes.uv;
      for (let corner = 0; corner < uv.count; corner += 1) {
        uv.setXY(corner, ...sponsorUv(index * 7 + 2, uv.getX(corner), uv.getY(corner)));
      }
      return board.translate(-length / 2 + (index + 0.5) * width, FRONT_WALL / 2, 0.01);
    }),
  );
}

// A spectator on every seat, here and there an empty one: each a body in a shirt colour, a face and a mushroom
// cap in another colour (Toad-like). They hop in turn. Returns { meshes, update(dt) }.
function buildCrowd(length, keep) {
  const random = createRandom(61);
  const people = [];
  for (let tier = 0; tier < TIERS; tier += 1) {
    for (let x = -length / 2 + 0.6; x < length / 2 - 0.5; x += SPECTATOR_SPACING) {
      if (random() < 0.82) {
        const seat = FRONT_WALL - 0.3 + tier * TIER_RISE + 0.3;
        people.push({ x: x + between(random, -0.12, 0.12), y: seat, z: -0.3 - (tier + 0.5) * TIER_DEPTH - 0.25, phase: random() * 10, speed: between(random, 3, 6) });
      }
    }
  }
  const material = keep(new THREE.MeshStandardMaterial({ roughness: 0.6 }));
  // Few faces each: there are a few hundred of them in every view.
  const shapes = [
    keep(new THREE.CapsuleGeometry(0.2, 0.25, 2, 6).translate(0, 0.32, 0)),
    keep(new THREE.SphereGeometry(0.19, 7, 5).translate(0, 0.72, 0.03)),
    keep(new THREE.SphereGeometry(0.31, 8, 3, 0, 2 * Math.PI, 0, Math.PI / 2).scale(1, 0.8, 1).translate(0, 0.8, 0)),
  ];
  const colorOf = [(index) => SHIRTS[index % SHIRTS.length], () => 0xf6dcb4, (index) => SHIRTS[(index * 3 + 1) % SHIRTS.length]];
  const meshes = shapes.map((shape, part) => {
    const mesh = new THREE.InstancedMesh(shape, material, people.length);
    people.forEach((person, index) => mesh.setColorAt(index, new THREE.Color(colorOf[part](index))));
    // They sit under the roof's shadow, so their own would hardly show: they cast none, which keeps them out
    // of the shadow map's drawing.
    mesh.receiveShadow = true;
    return mesh;
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
