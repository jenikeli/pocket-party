// Draws the sandcastles the Blocker item leaves on the road (M8b): each as a castle, a pile and a flag, moving as
// road-object-motion.js says through its life, with a puff of sand as it lands and as it slumps. Every part is one
// instanced mesh for the whole field (instanced-part-look.js), placed again every frame without allocating. Used
// by road-object-drawing.js.

import * as THREE from 'three';
import { sandcastleMotion } from './road-object-motion.js';
import { buildSandcastle, buildSandPile, buildFlag, createFlagMaterial } from './sandcastle-look.js';
import { createSandMaps, createSandMaterial } from './sand-look.js';
import { createInstancedPart } from './instanced-part-look.js';

// The flag swings about its pole this far either way (radians) at this rate (radians a second).
const FLAG_SWING = 0.4;
const FLAG_SWING_RATE = 5;
// The pile's width at the start and at the end of the slump (shares of its own).
const PILE_WIDTH = [0.75, 1.1];
// The puffs of sand: how many, how far they spread, how high over the road they start.
const LANDING_PUFF = { count: 16, reach: 1.4, height: 0.2 };
const SLUMP_PUFF = { count: 24, reach: 1.6, height: 1.3 };

// `bursts` is burst-look.js's. Returns { begin(castleCount), place(record, object, index, time), end(),
// dispose() }: a frame is begin, one place per castle (`index` counts from 0, `record` is road-object-drawing.js's
// { frame, landed, slumped }, `time` the seconds the drawing has run), end.
export function createCastleDrawing(scene, bursts) {
  const sandMaps = createSandMaps();
  const sandMaterial = createSandMaterial(sandMaps);
  const flagMaterial = createFlagMaterial();
  const castles = createInstancedPart(scene, buildSandcastle(), sandMaterial);
  const piles = createInstancedPart(scene, buildSandPile(), sandMaterial);
  const flags = createInstancedPart(scene, buildFlag(), flagMaterial);
  const parts = [castles, piles, flags];
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

  function begin(castleCount) {
    for (const part of parts) {
      part.begin(castleCount);
    }
  }

  // The castle, its pile and its flag, as sandcastleMotion says; puffs as it lands and as it slumps.
  function place(record, object, index, time) {
    sandcastleMotion(object.left, motion);
    // Each castle leans over its own way as it slumps.
    leanAxis.set(Math.cos(object.id * 2.4), 0, Math.sin(object.id * 2.4));
    lean.setFromAxisAngle(leanAxis, motion.lean);
    lift.set(0, motion.lift - motion.sink, 0);
    placePart(castles, index, record.frame, size.set(motion.width, motion.height, motion.width), lean);
    // The flag rides on the keep's roof, moving with the castle and swinging in the wind about its pole (the
    // castle's axis), each a little out of step with the others.
    swing.makeRotationY(FLAG_SWING * Math.sin(time * FLAG_SWING_RATE + object.id));
    flags.place(index, world.multiplyMatrices(record.frame, flagLocal.multiplyMatrices(local, swing)));
    // No pile until the slump (a flat pile would flicker against the road).
    lift.set(0, -motion.sink, 0);
    const pileWidth = PILE_WIDTH[0] + (PILE_WIDTH[1] - PILE_WIDTH[0]) * motion.pile;
    placePart(piles, index, record.frame, motion.pile > 0 ? size.set(pileWidth, motion.pile, pileWidth) : size.setScalar(0), upright);
    if (motion.landed && !record.landed) {
      record.landed = true;
      puff(record.frame, LANDING_PUFF);
    }
    if (motion.vanishing && !record.slumped) {
      record.slumped = true;
      puff(record.frame, SLUMP_PUFF);
    }
  }

  function end() {
    for (const part of parts) {
      part.end();
    }
  }

  // Instance `index` of `part` at `frame`, lifted by `lift`, turned by `rotation` and scaled by `scale`.
  function placePart(part, index, frame, scale, rotation) {
    local.compose(lift, rotation, scale);
    part.place(index, world.multiplyMatrices(frame, local));
  }

  function puff(frame, { count, reach, height }) {
    puffAt.set(0, height, 0).applyMatrix4(frame);
    bursts.smoke(puffAt, count, reach);
  }

  function dispose() {
    parts.forEach((part) => part.dispose());
    [sandMaterial, flagMaterial].forEach((material) => material.dispose());
    Object.values(sandMaps).forEach((map) => map.dispose());
  }

  return { begin, place, end, dispose };
}
