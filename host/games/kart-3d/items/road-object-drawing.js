// Draws the things items leave on the road (M8b), read from race.items.objects (road-objects.js): each blocker
// as a sandcastle (sandcastle-look.js) and each ramp as a kicker (kicker-look.js), moving as road-object-motion.js
// says through their lives, with a puff of sand as a castle lands and as it slumps. Every part is one instanced
// mesh for the whole field (castles, piles, flags, plates, frames: instanced-part-look.js), placed again every
// frame without allocating; each object's frame on the road is worked out once, when it is first seen. Used by
// item-drawing.js.

import * as THREE from 'three';
import { KART_ITEMS } from '../../../../shared/protocol.js';
import { objectFrame } from './road-objects.js';
import { sandcastleMotion, kickerMotion } from './road-object-motion.js';
import { buildSandcastle, buildSandPile, buildFlag, createFlagMaterial } from './sandcastle-look.js';
import { createSandMaps, createSandMaterial } from './sand-look.js';
import { buildKickerPlate, buildKickerFrame, kickerPlateMaps, createPlateMaterial, createFrameMaterial } from './kicker-look.js';
import { createInstancedPart } from './instanced-part-look.js';

// Shared by every frame with no race, so update allocates nothing.
const NO_OBJECTS = [];

// The flag swings about its pole this far either way (radians) at this rate (radians a second).
const FLAG_SWING = 0.4;
const FLAG_SWING_RATE = 5;
// The pile's width at the start and at the end of the slump (shares of its own).
const PILE_WIDTH = [0.75, 1.1];
// The puffs of sand: how many, how far they spread, how high over the road they start.
const LANDING_PUFF = { count: 16, reach: 1.4, height: 0.2 };
const SLUMP_PUFF = { count: 24, reach: 1.6, height: 1.3 };

// Returns { update(race, track, poses, dt), dispose() } (item-drawing.js's shape). `bursts` is burst-look.js's.
export function createRoadObjectDrawing(scene, bursts) {
  const sandMaps = createSandMaps();
  const plateMaps = kickerPlateMaps();
  const sandMaterial = createSandMaterial(sandMaps);
  const flagMaterial = createFlagMaterial();
  const plateMaterial = createPlateMaterial(plateMaps);
  const frameMaterial = createFrameMaterial();
  const castles = createInstancedPart(scene, buildSandcastle(), sandMaterial);
  const piles = createInstancedPart(scene, buildSandPile(), sandMaterial);
  const flags = createInstancedPart(scene, buildFlag(), flagMaterial);
  const plates = createInstancedPart(scene, buildKickerPlate(), plateMaterial);
  const frames = createInstancedPart(scene, buildKickerFrame(), frameMaterial);
  const parts = [castles, piles, flags, plates, frames];
  // Each object seen, by id: { frame (its Matrix4 on the road), landed, slumped (its puffs made), seenAt }.
  const records = new Map();
  let shownRace = null;
  let frameNumber = 0;
  let time = 0;
  const motion = {};
  const local = new THREE.Matrix4();
  const world = new THREE.Matrix4();
  const lift = new THREE.Vector3();
  const size = new THREE.Vector3();
  const upright = new THREE.Quaternion();
  const lean = new THREE.Quaternion();
  const leanAxis = new THREE.Vector3();
  const swing = new THREE.Matrix4();
  const flagLocal = new THREE.Matrix4();
  const puffAt = new THREE.Vector3();

  // `race` null (the setup screen) or a race with no objects draws none; puffs already flying go on.
  function update(race, track, poses, dt) {
    if (race !== shownRace) {
      shownRace = race;
      records.clear();
    }
    const objects = race?.items?.objects ?? NO_OBJECTS;
    frameNumber += 1;
    time += dt;
    let blockers = 0;
    for (const object of objects) {
      blockers += object.item === KART_ITEMS.BLOCKER ? 1 : 0;
    }
    castles.begin(blockers);
    piles.begin(blockers);
    flags.begin(blockers);
    plates.begin(objects.length - blockers);
    frames.begin(objects.length - blockers);
    let castleIndex = 0;
    let kickerIndex = 0;
    for (const object of objects) {
      const record = recordOf(track, object);
      if (object.item === KART_ITEMS.BLOCKER) {
        placeCastle(record, object, castleIndex);
        castleIndex += 1;
      } else {
        placeKicker(record, object, kickerIndex);
        kickerIndex += 1;
      }
    }
    // Objects gone from the race are forgotten.
    records.forEach((record, id) => {
      if (record.seenAt !== frameNumber) {
        records.delete(id);
      }
    });
    for (const part of parts) {
      part.end();
    }
  }

  // The object's record, made the first time it is seen (so allocating only then). A castle first seen already
  // down (a race shown part way through) makes no puff for what happened before.
  function recordOf(track, object) {
    let record = records.get(object.id);
    if (!record) {
      const { position, forward, up, right } = objectFrame(track, object);
      // The models' x is to the left, so their axes are a right-handed frame with y up and z along the road.
      const frame = new THREE.Matrix4()
        .makeBasis(new THREE.Vector3(-right.x, -right.y, -right.z), new THREE.Vector3(up.x, up.y, up.z), new THREE.Vector3(forward.x, forward.y, forward.z))
        .setPosition(position.x, position.y, position.z);
      sandcastleMotion(object.left, motion);
      record = { frame, landed: motion.landed, slumped: motion.vanishing, seenAt: 0 };
      records.set(object.id, record);
    }
    record.seenAt = frameNumber;
    return record;
  }

  // The castle, its pile and its flag, as sandcastleMotion says; puffs as it lands and as it slumps.
  function placeCastle(record, object, index) {
    sandcastleMotion(object.left, motion);
    // Each castle leans over its own way as it slumps.
    leanAxis.set(Math.cos(object.id * 2.4), 0, Math.sin(object.id * 2.4));
    lean.setFromAxisAngle(leanAxis, motion.lean);
    lift.set(0, motion.lift - motion.sink, 0);
    place(castles, index, record.frame, size.set(motion.width, motion.height, motion.width), lean);
    // The flag rides on the keep's roof, moving with the castle and swinging in the wind about its pole (the
    // castle's axis), each a little out of step with the others.
    swing.makeRotationY(FLAG_SWING * Math.sin(time * FLAG_SWING_RATE + object.id));
    flags.place(index, world.multiplyMatrices(record.frame, flagLocal.multiplyMatrices(local, swing)));
    // No pile until the slump (a flat pile would flicker against the road).
    lift.set(0, -motion.sink, 0);
    const pileWidth = PILE_WIDTH[0] + (PILE_WIDTH[1] - PILE_WIDTH[0]) * motion.pile;
    place(piles, index, record.frame, motion.pile > 0 ? size.set(pileWidth, motion.pile, pileWidth) : size.setScalar(0), upright);
    if (motion.landed && !record.landed) {
      record.landed = true;
      puff(record.frame, LANDING_PUFF);
    }
    if (motion.vanishing && !record.slumped) {
      record.slumped = true;
      puff(record.frame, SLUMP_PUFF);
    }
  }

  // The kicker's plate and frame, raised on the hinge (its height scaled, so its far end swings up about the near
  // one, which stays on the road) and sunk as kickerMotion says.
  function placeKicker(record, object, index) {
    kickerMotion(object.left, motion);
    lift.set(0, -motion.sink, 0);
    size.set(1, Math.max(motion.raise, 0.001), 1);
    place(plates, index, record.frame, size, upright);
    place(frames, index, record.frame, size, upright);
  }

  // Instance `index` of `part` at `frame`, lifted by `lift`, turned by `rotation` and scaled by `scale`.
  function place(part, index, frame, scale, rotation) {
    local.compose(lift, rotation, scale);
    part.place(index, world.multiplyMatrices(frame, local));
  }

  function puff(frame, { count, reach, height }) {
    puffAt.set(0, height, 0).applyMatrix4(frame);
    bursts.smoke(puffAt, count, reach);
  }

  function dispose() {
    parts.forEach((part) => part.dispose());
    [sandMaterial, flagMaterial, plateMaterial, frameMaterial].forEach((material) => material.dispose());
    [...Object.values(sandMaps), ...Object.values(plateMaps)].forEach((map) => map.dispose());
  }

  return { update, dispose };
}
