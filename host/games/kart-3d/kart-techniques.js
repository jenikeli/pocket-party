// MK8DX's driving techniques on the Drift button: hop, drift and mini-turbo, and the trick (jump boost) off a
// ramp's lip. Also how the kart's body leans into a drift, rolls in a trick and spins in a spin boost, for
// drawing. Numbers from docs/mk8dx-reference.md (level 10) where it has them. Plain functions on plain kart
// objects, unit tested in Node. Used by kart-physics.js (every step) and kart-bumps.js (the spin).
//
// MK8DX's rules: pressing Drift hops; the steering as the kart lands picks the drift's side; while drifting a
// counter charges, faster with the stick pushed hard into the turn, through three spark levels; releasing
// Drift fires a mini-turbo as long as the level reached. Pressing Drift as the kart leaves a ramp does a trick,
// and the kart boosts when it lands.

import { addScaled, dot } from './vector.js';
import { startBoost, miniTurboSeconds, BOOST_KINDS } from './kart-boosts.js';

// A hop is about 0.27 s in the air at GRAVITY 25 (a guess: MK8DX's hop is short and small).
const HOP_SPEED = 3.4;
// Landing with the stick at least this far over starts a drift (a guess).
const DRIFT_START_STEER = 0.3;
// A kart slower than this cannot start a drift, and a drift ends without a boost when the kart slows below it
// (a third of top speed, a guess).
export const MIN_DRIFT_SPEED = 8;
// MK8DX's counter: 5 a frame with the stick "well into the turn" (at least 0.5 on the Wii U, "very slightly
// more" in MK8DX), 2 a frame otherwise. The levels start at these counts (level 10).
const HARD_STEER = 0.55;
const HARD_CHARGE_PER_FRAME = 5;
const SOFT_CHARGE_PER_FRAME = 2;
const SPARK_THRESHOLDS = [256, 542, 828];
// What the phone and the renderer call each level (index 0 is no sparks yet).
export const SPARK_COLORS = Object.freeze([null, 'blue', 'orange', 'purple']);
// A press this long before the kart crosses a lip, or this long after, does a trick (guesses, to set from the
// lip timings in the host's readout). The host judges by when the press arrives, a network trip after the thumb.
export const TRICK_EARLY = 0.1;
export const TRICK_LATE = 0.3;
// Presses this close to a lip are timed for the readout, trick or not.
const LIP_TIMING_RANGE = 0.5;
// The body turns this far into a drift (radians), easing there at this rate per second.
const DRIFT_LEAN = 0.35;
const LEAN_RATE = 10;
// A trick is one roll, a spin boost one turn, taking this long.
const TRICK_SECONDS = 0.5;
const SPIN_SECONDS = 0.5;

// The technique fields of a fresh kart (also after it is put back on the road): driftDirection -1 (left), 1
// (right) or 0 (not drifting); driftCharge the MK8DX counter; sinceDriftPress seconds since Drift was last
// pressed; sinceLip seconds since the kart crossed a ramp's lip, null on the ground; trickTime seconds into a
// trick, null if none; spinTime the same for a spin boost; driftLean the body's turn into a drift; bodyYaw and
// bodyRoll the angles the body is drawn at (lean plus spin, and the trick's roll).
export function freshTechniques() {
  return {
    driftDirection: 0,
    driftCharge: 0,
    sinceDriftPress: Infinity,
    sinceLip: null,
    trickTime: null,
    spinTime: null,
    driftLean: 0,
    bodyYaw: 0,
    bodyRoll: 0,
  };
}

// 0 (no sparks), 1 blue, 2 orange or 3 purple.
export function sparkLevel(kart) {
  return kart.driftDirection === 0 ? 0 : SPARK_THRESHOLDS.filter((threshold) => kart.driftCharge >= threshold).length;
}

// Before the kart moves: a press of Drift hops on the ground or tricks just after a lip; letting go of it ends
// a drift with its mini-turbo. kart.driftHeld is the button last step.
export function useDriftButton(kart, controls) {
  const held = controls.drift === true;
  const pressed = held && !kart.driftHeld;
  const released = !held && kart.driftHeld;
  kart.driftHeld = held;
  if (pressed) {
    kart.sinceDriftPress = 0;
    if (kart.grounded) {
      hop(kart);
    } else if (kart.sinceLip !== null && kart.sinceLip <= TRICK_LATE) {
      startTrick(kart);
    }
    if (kart.sinceLip !== null && kart.sinceLip <= LIP_TIMING_RANGE && kart.lipTiming.offset === null) {
      kart.lipTiming = { offset: kart.sinceLip, trick: kart.trickTime !== null };
    }
  }
  if (released && kart.driftDirection !== 0) {
    const level = sparkLevel(kart);
    if (level > 0) {
      startBoost(kart, BOOST_KINDS.MINI_TURBO, miniTurboSeconds(level));
    }
    kart.driftDirection = 0;
  }
}

function hop(kart) {
  kart.velocity = addScaled(kart.velocity, kart.up, HOP_SPEED);
  kart.grounded = false;
  kart.surface = null;
}

function startTrick(kart) {
  if (kart.trickTime === null) {
    kart.trickTime = 0;
  }
}

// After the kart moved. `fromIndex` is its station before the move, `wasGrounded` whether it was on the road
// then (after any hop). A lip is where the road ends at a gap: the jump's ramp.
export function afterMove(track, kart, controls, fromIndex, wasGrounded, dt) {
  kart.sinceDriftPress += dt;
  if (kart.sinceLip !== null) {
    kart.sinceLip += dt;
  }
  if (!track.stations[fromIndex].gap && track.stations[kart.trackIndex].gap) {
    crossLip(kart);
  }
  if (!wasGrounded && kart.grounded) {
    land(kart, controls);
  }
  chargeDrift(kart, controls, dt);
  moveBody(kart, dt);
}

function crossLip(kart) {
  kart.sinceLip = 0;
  const pressedJustBefore = kart.sinceDriftPress <= TRICK_EARLY;
  if (pressedJustBefore) {
    startTrick(kart);
  }
  // lipTiming is kept for the host's readout: how far from the lip the press came (negative is before), null
  // until a press within LIP_TIMING_RANGE.
  const pressedBefore = kart.sinceDriftPress <= LIP_TIMING_RANGE;
  kart.lipTiming = { offset: pressedBefore ? -kart.sinceDriftPress : null, trick: pressedJustBefore };
}

// A trick boosts on landing. Drift still held with the stick over starts a drift, after a hop or any jump.
function land(kart, controls) {
  kart.sinceLip = null;
  if (kart.trickTime !== null) {
    kart.trickTime = null;
    startBoost(kart, BOOST_KINDS.JUMP);
  }
  const speed = dot(kart.velocity, kart.forward);
  const steering = Math.abs(controls.steer) >= DRIFT_START_STEER;
  if (kart.driftHeld && kart.driftDirection === 0 && steering && speed >= MIN_DRIFT_SPEED) {
    kart.driftDirection = Math.sign(controls.steer);
    kart.driftCharge = 0;
  }
}

// The counter only charges on the road. A drift that slows below MIN_DRIFT_SPEED ends with no boost.
function chargeDrift(kart, controls, dt) {
  if (kart.driftDirection === 0 || !kart.grounded) {
    return;
  }
  if (dot(kart.velocity, kart.forward) < MIN_DRIFT_SPEED) {
    kart.driftDirection = 0;
    return;
  }
  const hard = controls.steer * kart.driftDirection >= HARD_STEER;
  kart.driftCharge += (hard ? HARD_CHARGE_PER_FRAME : SOFT_CHARGE_PER_FRAME) * dt * 60;
}

// Starts the body's turn of a spin boost (kart-bumps.js); the boost itself is kart-boosts.js's.
export function startSpin(kart) {
  kart.spinTime = 0;
}

function moveBody(kart, dt) {
  kart.driftLean += (kart.driftDirection * DRIFT_LEAN - kart.driftLean) * (1 - Math.exp(-LEAN_RATE * dt));
  if (kart.trickTime !== null) {
    kart.trickTime += dt;
  }
  if (kart.spinTime !== null) {
    kart.spinTime = kart.spinTime + dt >= SPIN_SECONDS ? null : kart.spinTime + dt;
  }
  kart.bodyYaw = kart.driftLean + turnShare(kart.spinTime, SPIN_SECONDS);
  kart.bodyRoll = turnShare(kart.trickTime, TRICK_SECONDS);
}

// One full turn over `seconds`, eased in and out; 0 when not turning.
function turnShare(time, seconds) {
  if (time === null) {
    return 0;
  }
  const share = Math.min(time / seconds, 1);
  return 2 * Math.PI * share * share * (3 - 2 * share);
}
