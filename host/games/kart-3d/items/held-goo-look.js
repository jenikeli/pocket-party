// The goo on karts held on a sticky wall (M8c): goo blobs squashed against the wall side and strings of goo
// stretching from the kart to the wall, read from each kart's item.stuckLeft (sticky-walls.js). Used by
// sticky-walls-look.js.

import * as THREE from 'three';
import { tuning } from '../tuning.js';
import { stationIndexAt } from '../track.js';
import { GLOSS } from './goo-strip-look.js';

// The wall's face stands this far out past the road's edge (goo-strip-look.js's FACE_OUT).
const FACE_OUT = 0.15;
// Blobs on a held kart, each [toward the wall, up, along, size] in the kart's frame (units): most against the
// wall side, flattened there, a few on top. They swell up as the kart is caught and shrink as it is let go.
const BLOBS = [
  [0.8, 0.35, 0.8, 0.3], [0.85, 0.5, -0.2, 0.34], [0.8, 0.3, -0.8, 0.3], [0.5, 0.85, 0.4, 0.2],
  [0, 0.9, -0.3, 0.18], [0.3, 0.2, 1.0, 0.22], [-0.7, 0.3, -0.5, 0.2], [0.85, 0.75, 0.3, 0.25],
];
// A blob is this much flatter along the way to the wall, and wider across.
const BLOB_FLAT = 0.55;
const BLOB_WIDE = 1.15;
// Strings from the kart's side to the wall, each [up, along], starting this far out from the kart's middle,
// as thick as STRING_RADIUS when caught and thinning to half as they are pulled out.
const STRINGS = [[0.35, 0.6], [0.55, -0.1], [0.3, -0.7], [0.75, 0.3]];
const STRING_START = 0.45;
const STRING_RADIUS = 0.05;
const SWELL_SECONDS = 0.3;
const SQUIRM_RATE = 9;
const SQUIRM_SIZE = 0.15;

// `maps` are goo-strip-look.js's createGooMaps. Returns { update(race, track, poses, time), dispose() }: `time` is
// the seconds the drawing has run, for the squirming. The meshes are made again for more karts.
export function createHeldGooDrawing(scene, maps) {
  const blobMaterial = new THREE.MeshStandardMaterial({ map: maps.map, normalMap: maps.normalMap, roughness: GLOSS, emissive: 0x2a1400, emissiveIntensity: 0.25 });
  const blobShape = new THREE.IcosahedronGeometry(1, 1);
  // A string lies along x from 0 to 1 (so scaling x sets its length).
  const stringShape = new THREE.CylinderGeometry(STRING_RADIUS, STRING_RADIUS, 1, 6).rotateZ(Math.PI / 2).translate(0.5, 0, 0);
  let blobs = null;
  let strings = null;
  const matrix = new THREE.Matrix4();
  const toWall = new THREE.Vector3();
  const up = new THREE.Vector3();
  const along = new THREE.Vector3();
  const place = new THREE.Vector3();
  const scale = new THREE.Vector3();

  // The blobs and strings of every held kart; each mesh holds a set for every kart and shows the held karts' only.
  function update(race, track, poses, time) {
    const karts = race?.karts ?? [];
    ensureMeshes(Math.max(karts.length, 1));
    let blobCount = 0;
    let stringCount = 0;
    for (let index = 0; index < karts.length; index += 1) {
      const kart = karts[index];
      if (!(kart.item?.stuckLeft > 0)) {
        continue;
      }
      const held = tuning.stickyHoldSeconds - kart.item.stuckLeft;
      const swell = Math.min(held / SWELL_SECONDS, kart.item.stuckLeft / SWELL_SECONDS, 1);
      frameOf(poses[index], kart.lateral >= 0 ? 1 : -1);
      for (let blob = 0; blob < BLOBS.length; blob += 1) {
        const [sideways, height, forward, size] = BLOBS[blob];
        const squirm = size * swell * (1 + SQUIRM_SIZE * Math.sin(time * SQUIRM_RATE + blob * 1.7 + index));
        scale.set(squirm * BLOB_FLAT, squirm * BLOB_WIDE, squirm * BLOB_WIDE);
        setPart(blobs, blobCount, poses[index], sideways, height, forward, scale);
        blobCount += 1;
      }
      const reach = wallDistance(track, kart);
      const thinning = 1 - 0.5 * Math.min(held / tuning.stickyHoldSeconds, 1);
      for (let string = 0; string < STRINGS.length; string += 1) {
        const [height, forward] = STRINGS[string];
        scale.set(Math.max(reach - STRING_START, 0.01), thinning * swell, thinning * swell);
        setPart(strings, stringCount, poses[index], STRING_START, height, forward, scale);
        stringCount += 1;
      }
    }
    finish(blobs, blobCount);
    finish(strings, stringCount);
  }

  // The frame of a kart held on the wall at its `side` (1 right, -1 left): toWall is its x axis, `up` its y and
  // `along` its z, right-handed, so a blob's flat side faces the wall on either side of the road.
  function frameOf(pose, side) {
    up.set(pose.up.x, pose.up.y, pose.up.z);
    along.set(pose.forward.x, pose.forward.y, pose.forward.z);
    toWall.crossVectors(along, up).multiplyScalar(side);
    along.crossVectors(toWall, up);
  }

  // Instance `index` of `mesh` at (sideways toward the wall, height, forward) from the pose's position in the
  // frame frameOf made, scaled by `size`.
  function setPart(mesh, index, pose, sideways, height, forward, size) {
    matrix.makeBasis(toWall, up, along).scale(size);
    place.set(
      pose.position.x + toWall.x * sideways + up.x * height + along.x * forward,
      pose.position.y + toWall.y * sideways + up.y * height + along.y * forward,
      pose.position.z + toWall.z * sideways + up.z * height + along.z * forward,
    );
    matrix.setPosition(place);
    mesh.setMatrixAt(index, matrix);
  }

  // How far the kart's middle is from the wall's face (units), from the road's edge at the kart's place.
  function wallDistance(track, kart) {
    const station = track.stations[stationIndexAt(track, kart.s)];
    const edge = station.halfWidth + (kart.lateral >= 0 ? station.shoulderRight : station.shoulderLeft);
    return edge + FACE_OUT - Math.abs(kart.lateral);
  }

  function finish(mesh, count) {
    mesh.count = count;
    mesh.visible = count > 0;
    mesh.instanceMatrix.needsUpdate = true;
  }

  function ensureMeshes(karts) {
    if (!blobs || blobs.instanceMatrix.count < karts * BLOBS.length) {
      blobs = makeMesh(blobs, blobShape, blobMaterial, karts * BLOBS.length);
      strings = makeMesh(strings, stringShape, blobMaterial, karts * STRINGS.length);
    }
  }

  function makeMesh(old, shape, meshMaterial, capacity) {
    if (old) {
      scene.remove(old);
      old.dispose();
    }
    const mesh = new THREE.InstancedMesh(shape, meshMaterial, capacity);
    mesh.count = 0;
    mesh.visible = false;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }

  function dispose() {
    for (const mesh of [blobs, strings]) {
      scene.remove(mesh);
      mesh?.dispose();
    }
    blobShape.dispose();
    stringShape.dispose();
    blobMaterial.dispose();
  }

  return { update, dispose };
}
