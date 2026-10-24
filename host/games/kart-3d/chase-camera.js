// The 3D race's chase camera, as plain maths: behind and above its kart, turning after it with a short lag,
// rolling with the road on anti-gravity walls, and steady over bumps and jumps. No Three.js, unit tested in
// Node. Used by host/games/kart-3d/views.js, once per drawn frame for each view.

import { addScaled, subtract, length, lerp, normalize } from './vector.js';

// In world units (a kart is 2 long). First guesses, until MK8DX footage gives the camera's distances (see
// "Reference footage" in plan.md); the kart then takes about a sixth of the view's width.
const BEHIND = 6.5;
const ABOVE = 2.4;
const LOOK_AHEAD = 4;
const LOOK_ABOVE = 1;
// How quickly the camera catches up, per second. Its direction trails the kart's nose a little, so a turn
// shows the kart's side; its up trails the road's normal more, so small bumps do not shake the picture; its
// position follows closely, so a jump lifts the camera smoothly after the kart.
const TURN_RATE = 5;
const UP_RATE = 3;
const FOLLOW_RATE = 12;
// A kart that moved further than this since the last frame was put back on the road: cut, do not glide there.
const CUT_DISTANCE = 20;

// Returns a camera that has not been placed yet: { position, look, up, forward } (null until followKart).
export function createChaseCamera() {
  return { position: null, look: null, up: null, forward: null };
}

// Moves `camera` toward its spot behind `pose` ({ position, forward, up }, the kart as drawn). `dt` is the real
// time since the last drawn frame, in seconds, so the lag is the same at any frame rate.
export function followKart(camera, pose, dt) {
  const placed = camera.position !== null && length(subtract(pose.position, camera.position)) < CUT_DISTANCE;
  camera.forward = placed ? catchUp(camera.forward, pose.forward, TURN_RATE, dt) : pose.forward;
  camera.up = placed ? catchUp(camera.up, pose.up, UP_RATE, dt) : pose.up;
  const wanted = addScaled(addScaled(pose.position, camera.forward, -BEHIND), camera.up, ABOVE);
  camera.position = placed ? lerp(camera.position, wanted, share(FOLLOW_RATE, dt)) : wanted;
  camera.look = addScaled(addScaled(pose.position, camera.forward, LOOK_AHEAD), camera.up, LOOK_ABOVE);
}

// A unit direction turned part of the way toward `target`.
function catchUp(direction, target, rate, dt) {
  return normalize(lerp(direction, target, share(rate, dt)));
}

// The share of the remaining distance to cover in dt, for an exponential catch-up at `rate` per second.
function share(rate, dt) {
  return 1 - Math.exp(-rate * dt);
}
