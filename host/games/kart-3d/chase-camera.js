// The 3D race's chase camera, as plain maths: behind and above its kart, turning after it with a short lag,
// rolling with the road on anti-gravity walls, steady over bumps and jumps, and pulling back with a wider view
// while the kart boosts, as MK8DX's does. No Three.js, unit tested in Node. Used by host/games/kart-3d/views.js,
// once per drawn frame for each view. Its distances, field of view and catch-up rates are tuned (tuning.js): the
// direction trails the kart's nose a little, so a turn shows the kart's side; the up trails the road's normal
// more, so small bumps do not shake the picture; the position follows closely, so a jump lifts the camera
// smoothly after the kart.

import { addScaled, subtract, length, lerp, normalize } from './vector.js';
import { tuning } from './tuning.js';

// A kart that moved further than this since the last frame was put back on the road: cut, do not glide there.
const CUT_DISTANCE = 20;
// The boost's pull-back and widening ease in quickly and back slowly (per second).
const PULL_RATE = 6;
const RETURN_RATE = 2;

// Returns a camera that has not been placed yet: { position, look, up, forward, pull, fieldOfView } (position,
// look, up and forward are null until followKart). pull is 0 to 1, how far into its boost pull-back it is;
// fieldOfView is in degrees, vertical.
export function createChaseCamera() {
  return { position: null, look: null, up: null, forward: null, pull: 0, fieldOfView: tuning.fieldOfView };
}

// Moves `camera` toward its spot behind `pose` ({ position, forward, up }, the kart as drawn). `dt` is the real
// time since the last drawn frame, in seconds, so the lag is the same at any frame rate. `boosting` is true
// while the kart has a boost.
export function followKart(camera, pose, dt, boosting = false) {
  const placed = camera.position !== null && length(subtract(pose.position, camera.position)) < CUT_DISTANCE;
  camera.forward = placed ? catchUp(camera.forward, pose.forward, tuning.cameraTurnRate, dt) : pose.forward;
  camera.up = placed ? catchUp(camera.up, pose.up, tuning.cameraUpRate, dt) : pose.up;
  camera.pull += ((boosting ? 1 : 0) - camera.pull) * share(boosting ? PULL_RATE : RETURN_RATE, dt);
  camera.fieldOfView = tuning.fieldOfView + tuning.boostWiden * camera.pull;
  const behind = tuning.cameraBehind + tuning.boostPullBack * camera.pull;
  const wanted = addScaled(addScaled(pose.position, camera.forward, -behind), camera.up, tuning.cameraAbove);
  camera.position = placed ? lerp(camera.position, wanted, share(tuning.cameraFollowRate, dt)) : wanted;
  camera.look = addScaled(addScaled(pose.position, camera.forward, tuning.cameraLookAhead), camera.up, tuning.cameraLookAbove);
}

// A unit direction turned part of the way toward `target`.
function catchUp(direction, target, rate, dt) {
  return normalize(lerp(direction, target, share(rate, dt)));
}

// The share of the remaining distance to cover in dt, for an exponential catch-up at `rate` per second.
function share(rate, dt) {
  return 1 - Math.exp(-rate * dt);
}
