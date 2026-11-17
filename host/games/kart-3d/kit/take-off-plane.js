// The plane taking off each lap (M9), a landmark, after the jet that lifts off low over the karts on the reference
// airport course's runway: an airliner (kit/airliner.js) waits at the runway's east end, rolls, lifts off before
// the karts' part of it, flies low over the runway, the glide and the bay, folds its gear, then climbs away and is
// gone. It loops on its own timer, one take-off about every 45 s. Its path is plain maths (takeOffPose), unit
// tested. Used by the airport's dressing (airport-scenery.js) and kit-shots.

import * as THREE from 'three';
import { buildAirliner } from './airliner.js';
import { MAIN_GEAR_X } from './airliner-gear.js';

// One take-off this often (longer if the roll and flight need more).
const PERIOD_SECONDS = 45;
// It waits at least this long at the start of the runway each time.
const LEAST_WAIT_SECONDS = 3;
// It leaves the ground at this speed (units/s; the karts reach about 33) and speeds up by this much each second
// once in the air.
const LIFT_OFF_SPEED = 46;
const AIR_ACCELERATION = 3;
// Past the lift-off point: it rises to its low height over this distance, holds it to LOW_UNTIL, climbs a
// further CLIMB_HEIGHT by CLIMB_UNTIL, and is gone at GONE_AT: small and high far over the bay, it is moved
// straight back to wait at the start of the runway, far behind the karts' cameras.
const RISE_DISTANCE = 140;
const LOW_UNTIL = 380;
const CLIMB_UNTIL = 900;
const CLIMB_HEIGHT = 140;
const GONE_AT = 1000;
// Its nose comes up to this pitch over the last ROTATE_SECONDS of the roll, and keeps it above the climb's slope.
const PITCH = (6 * Math.PI) / 180;
const ROTATE_SECONDS = 1.5;
// Its gear folds up over FOLD_SECONDS, starting this long after lift-off.
const FOLD_AFTER_SECONDS = 2;
const FOLD_SECONDS = 3;
const LIVERY = 'palm-air';

const smoothstep = (share) => {
  const clamped = Math.min(Math.max(share, 0), 1);
  return clamped * clamped * (3 - 2 * clamped);
};

// The path from `from` (where it waits, on the runway's middle line) through `to` (where its wheels leave the
// ground), both { x, y, z } in the world, flying `height` above the runway when low. Returns { from, to, height,
// direction ({ x, z }, a unit), heading (radians about y), rollDistance, rollSeconds, flightSeconds, waitSeconds,
// cycleSeconds }.
export function createTakeOffPath({ from, to, height }) {
  const rollDistance = Math.hypot(to.x - from.x, to.z - from.z);
  const direction = { x: (to.x - from.x) / rollDistance, z: (to.z - from.z) / rollDistance };
  // Rolling from rest at an even acceleration to LIFT_OFF_SPEED over the roll: it takes twice as long as at
  // that speed.
  const rollSeconds = (2 * rollDistance) / LIFT_OFF_SPEED;
  const flightSeconds = secondsToFly(GONE_AT);
  const waitSeconds = Math.max(LEAST_WAIT_SECONDS, PERIOD_SECONDS - rollSeconds - flightSeconds);
  return {
    from, to, height, direction, rollDistance, rollSeconds, flightSeconds, waitSeconds,
    heading: Math.atan2(-direction.z, direction.x),
    cycleSeconds: waitSeconds + rollSeconds + flightSeconds,
  };
}

// Where the plane is `time` seconds into a cycle of `path`: { position: { x, y, z } (its main wheels' foot),
// pitch (radians, nose up), gear (1 down, 0 folded) }, written into `pose` if given (the plane's update reuses
// one, so it allocates nothing per frame).
export function takeOffPose(path, time, pose = { position: { x: 0, y: 0, z: 0 }, pitch: 0, gear: 1 }) {
  const { height, rollDistance, rollSeconds, waitSeconds, cycleSeconds } = path;
  const t = ((time % cycleSeconds) + cycleSeconds) % cycleSeconds;
  if (t < waitSeconds + rollSeconds) {
    const rolling = Math.max(t - waitSeconds, 0);
    placeAlong(path, (LIFT_OFF_SPEED * rolling ** 2) / (2 * rollSeconds), 0, pose.position);
    pose.pitch = PITCH * smoothstep(1 - (rollSeconds - rolling) / ROTATE_SECONDS);
    pose.gear = 1;
    return pose;
  }
  const flying = t - waitSeconds - rollSeconds;
  const past = LIFT_OFF_SPEED * flying + (AIR_ACCELERATION * flying ** 2) / 2;
  const slope = (liftAt(past + 1, height) - liftAt(past - 1, height)) / 2;
  placeAlong(path, rollDistance + past, liftAt(past, height), pose.position);
  pose.pitch = PITCH + Math.atan(slope);
  pose.gear = 1 - smoothstep((flying - FOLD_AFTER_SECONDS) / FOLD_SECONDS);
  return pose;
}

// Sets `position` to `distance` along the path from `from`, `lift` above the runway (which runs from `from`'s
// height to `to`'s over the roll).
function placeAlong({ from, to, direction, rollDistance }, distance, lift, position) {
  position.x = from.x + direction.x * distance;
  position.y = from.y + (to.y - from.y) * Math.min(distance / rollDistance, 1) + lift;
  position.z = from.z + direction.z * distance;
}

// The time into a cycle of `path` at which the plane is `past` units beyond its lift-off point (for kit-shots,
// which shows it at one moment).
export function takeOffTimeAt(path, past) {
  return path.waitSeconds + path.rollSeconds + secondsToFly(past);
}

// How long after lift-off the plane has flown `past` units: LIFT_OFF_SPEED t + AIR_ACCELERATION t² / 2 = past,
// solved for t.
function secondsToFly(past) {
  return (Math.sqrt(LIFT_OFF_SPEED ** 2 + 2 * AIR_ACCELERATION * past) - LIFT_OFF_SPEED) / AIR_ACCELERATION;
}

// How high above the runway the plane is `past` units beyond its lift-off point.
function liftAt(past, height) {
  return height * smoothstep(past / RISE_DISTANCE) + CLIMB_HEIGHT * smoothstep((past - LOW_UNTIL) / (CLIMB_UNTIL - LOW_UNTIL));
}

// `kit` is the course's kit; `from`, `to` and `height` as createTakeOffPath's. Returns { object, update(dt) }.
// It waits at `from` hidden until its first update: the course's shade is baked before the first frame, and
// would keep a dark patch where it stood.
export function buildTakeOffPlane(kit, { from, to, height }) {
  const path = createTakeOffPath({ from, to, height });
  const airliner = buildAirliner(kit, { livery: LIVERY });
  // The plane turns nose up about its main wheels' foot, which the path moves.
  airliner.object.position.x = -MAIN_GEAR_X;
  const object = new THREE.Group();
  object.add(airliner.object);
  // It flies across the whole course: never cut into the ground's cells (split-meshes.js), and its gear's mesh
  // is held on to here.
  object.traverse((child) => (child.userData.keepWhole = true));
  let time = 0;
  const pose = takeOffPose(path, 0);
  // Moves the plane to `pose`.
  function place() {
    object.position.set(pose.position.x, pose.position.y, pose.position.z);
    object.rotation.set(0, path.heading, pose.pitch, 'YZX');
    airliner.gear.visible = pose.gear > 0.02;
    airliner.gear.scale.y = Math.max(pose.gear, 0.02);
  }
  function update(dt) {
    time = (time + dt) % path.cycleSeconds;
    takeOffPose(path, time, pose);
    place();
    object.visible = true;
  }
  place();
  object.visible = false;
  return { object, update };
}
