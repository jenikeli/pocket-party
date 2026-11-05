// How a 3D kart's body is drawn apart from where it travels: turned into a drift, rolled once in a trick and
// turned once in a spin boost, each easing in and out instead of snapping between poses, banked into the turn
// under a glider (kart-glide.js), and its front wheels turned with the steering. Drawing only: the rules never
// read these angles. Plain functions on plain kart objects, unit tested in Node. Used by kart-physics.js
// (every step), kart-techniques.js (the trick) and kart-bumps.js (the spin). Timings are tuning.js's.

import { tuning } from './tuning.js';
import { glideBank } from './kart-glide.js';

const DEGREES = Math.PI / 180;
// The lean spring's speed: at 6 / leanSeconds, a critically damped spring has covered about 98% of the way by
// leanSeconds.
const SPRING_STIFFNESS = 6;
// How quickly the front wheels follow the stick, per second: quick, but a tap does not flick them.
const WHEEL_TURN_RATE = 15;

// The body fields of a fresh kart (also after it is put back on the road): driftLean the body's turn into a
// drift and leanSpeed how fast it is changing (the spring's state); trickTime seconds into a trick's roll and
// spinTime into a spin boost's turn, null when not rolling or turning; bodyYaw and bodyRoll the angles the body
// is drawn at (lean plus spin, and the trick's roll plus a glider's bank); wheelTurn how far the front wheels
// are turned, -1 (left) to 1 (right).
export function freshBody() {
  return { driftLean: 0, leanSpeed: 0, trickTime: null, spinTime: null, bodyYaw: 0, bodyRoll: 0, wheelTurn: 0 };
}

// Starts the trick's barrel roll (kart-techniques.js). It plays out in full, even if the kart lands first.
export function startTrickRoll(kart) {
  kart.trickTime = 0;
}

// Starts the body's turn of a spin boost (kart-bumps.js); the boost itself is kart-boosts.js's.
export function startSpin(kart) {
  kart.spinTime = 0;
}

// Once per step, after the kart moved.
export function moveBody(kart, controls, dt) {
  const target = leanTarget(kart, controls) * tuning.driftLeanDegrees * DEGREES;
  const spring = springToward(kart.driftLean, kart.leanSpeed, target, SPRING_STIFFNESS / tuning.leanSeconds, dt);
  kart.driftLean = spring.value;
  kart.leanSpeed = spring.speed;
  kart.trickTime = advance(kart.trickTime, tuning.trickSeconds, dt);
  kart.spinTime = advance(kart.spinTime, tuning.spinSeconds, dt);
  kart.wheelTurn += (controls.steer - kart.wheelTurn) * (1 - Math.exp(-WHEEL_TURN_RATE * dt));
  kart.bodyYaw = kart.driftLean + turnShare(kart.spinTime, tuning.spinSeconds);
  kart.bodyRoll = turnShare(kart.trickTime, tuning.trickSeconds) + glideBank(kart);
}

// -1 to 1: fully toward the drift's side while drifting, and already during the hop that may start one (Drift
// held) as far as the stick is over, as MK8DX's kart turns in the air before it lands into the drift.
function leanTarget(kart, controls) {
  if (kart.driftDirection !== 0) {
    return kart.driftDirection;
  }
  return kart.hopping && kart.driftHeld ? controls.steer : 0;
}

// One step of a critically damped spring pulling `value` (moving at `speed`) toward `target`, solved exactly,
// so it never overshoots or shakes at any stiffness: it starts gently, speeds up and settles smoothly.
// `stiffness` is per second. Returns { value, speed }.
export function springToward(value, speed, target, stiffness, dt) {
  const offset = value - target;
  const decay = Math.exp(-stiffness * dt);
  const pull = speed + stiffness * offset;
  return {
    value: target + (offset + pull * dt) * decay,
    speed: (speed - stiffness * pull * dt) * decay,
  };
}

// A roll or turn's time moved on by dt; null once it has run for `seconds` (or if it was not running).
function advance(time, seconds, dt) {
  if (time === null) {
    return null;
  }
  return time + dt >= seconds ? null : time + dt;
}

// One full turn over `seconds`, eased in and out; 0 when not turning.
function turnShare(time, seconds) {
  if (time === null) {
    return 0;
  }
  const share = Math.min(time / seconds, 1);
  return 2 * Math.PI * share * share * (3 - 2 * share);
}
