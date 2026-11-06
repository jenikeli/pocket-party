// The baggage conveyor (M9 task K), a landmark (docs/queue.md's "Pieces for the dressing"): a belt at ground level
// under the airport's jump, running into a housing at each end, with suitcases and crates riding it. It lies along
// its own z, centred on its origin on y = 0 (M turns it across the road), `length` long over its housings. In
// `update` the belt's cleats scroll and the cargo moves along it at the same speed, to vanish into one housing
// and come out of the other. Used by the airport's dressing (airport-scenery.js) and kit-shots.

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { withShadows } from './frames.js';
import {
  BELT_WIDTH, BELT_TOP, TILE, SIGN_HEIGHT, HOUSING_LENGTH, faceZ, createBeltMaps, createHousingSign,
  housingSignQuad, conveyorFrame, suitcaseShape, crateShape,
} from './baggage-conveyor-parts.js';

// How fast the belt runs, in units a second.
const SPEED = 3;
const CARGO_COUNT = 18;
const LANES = [-0.95, 0, 0.95];
const CARGO_TINTS = [0xf0532d, 0x1e3566, 0xffc531, 0x1f9e6e, 0x2f6fd0, 0xe9e4d8];
const CRATE_TINT = 0xc9a26b;

// { object, update(dt, race) }. The cargo travels a loop as long as the belt plus its housings, hidden inside them
// where it jumps from one end back to the other.
export function buildBaggageConveyor(kit, { length }) {
  const object = new THREE.Group();
  object.name = 'baggage-conveyor';
  const belt = beltMesh(kit, length);
  object.add(withShadows(new THREE.Mesh(kit.keep(mergeShapes(conveyorFrame(length))), kit.materials.painted)), belt.mesh, signMesh(kit, length));
  const cargo = cargoMeshes(kit, length);
  object.add(...cargo.meshes);
  let travelled = 0;
  return {
    object,
    update(dt) {
      travelled += SPEED * dt;
      belt.scroll(dt);
      cargo.place(travelled);
    },
  };
}

// The belt: a plane on the belt's top, its drawn cleats scrolling in update. A plane lying down has its texture's
// v running toward -z, and a feature moves toward +z when the offset grows.
function beltMesh(kit, length) {
  const maps = createBeltMaps();
  const textures = Object.values(maps).map((texture) => kit.keep(texture));
  const material = kit.keep(new THREE.MeshStandardMaterial({ ...maps, roughness: 1, metalness: 0 }));
  const run = 2 * faceZ(length);
  const plane = new THREE.PlaneGeometry(BELT_WIDTH, run).rotateX(-Math.PI / 2).translate(0, BELT_TOP, 0);
  const uv = plane.attributes.uv;
  for (let corner = 0; corner < uv.count; corner += 1) {
    uv.setY(corner, uv.getY(corner) * (run / TILE));
  }
  const mesh = new THREE.Mesh(kit.keep(plane), material);
  mesh.receiveShadow = true;
  return {
    mesh,
    scroll(dt) {
      for (const texture of textures) {
        texture.offset.y = (texture.offset.y + (SPEED * dt) / TILE) % 1;
      }
    },
  };
}

function signMesh(kit, length) {
  const face = faceZ(length) - 0.02;
  const quads = [-1, 1].map((end) => housingSignQuad(end, SIGN_HEIGHT, end * face));
  const material = new THREE.MeshStandardMaterial({ map: kit.keep(createHousingSign()), roughness: 0.5 });
  return new THREE.Mesh(kit.keep(mergeShapes(quads)), kit.keep(material));
}

// The cargo: instanced suitcases and crates (white, tinted per instance), each with a lane, a turn and a place in
// the loop. `place(travelled)` writes every instance's matrix for the distance the belt has run; it makes
// nothing new.
function cargoMeshes(kit, length) {
  const loop = length - HOUSING_LENGTH / 2;
  const slots = Array.from({ length: CARGO_COUNT }, (unused, index) => ({
    crate: index % 3 === 0,
    start: (index * loop) / CARGO_COUNT,
    x: LANES[index % LANES.length],
    turn: ((index * 7) % 11 - 5) * 0.06,
    tint: index % 3 === 0 ? CRATE_TINT : CARGO_TINTS[index % CARGO_TINTS.length],
  }));
  const kinds = [false, true].map((crate) => {
    const members = slots.filter((slot) => slot.crate === crate);
    const mesh = withShadows(new THREE.InstancedMesh(kit.keep(crate ? crateShape() : suitcaseShape()), kit.materials.painted, members.length));
    mesh.frustumCulled = false;
    members.forEach((slot, index) => mesh.setColorAt(index, new THREE.Color(slot.tint)));
    return { mesh, members };
  });
  const dummy = new THREE.Object3D();
  return {
    meshes: kinds.map((kind) => kind.mesh),
    place(travelled) {
      for (const { mesh, members } of kinds) {
        members.forEach((slot, index) => {
          dummy.position.set(slot.x, BELT_TOP, ((slot.start + travelled) % loop) - loop / 2);
          dummy.rotation.y = slot.turn;
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
