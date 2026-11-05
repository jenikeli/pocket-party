// MK8DX's driving techniques on the Drift button: hop, drift and mini-turbo, and the trick (jump boost) off a
// ramp's lip. Numbers from docs/mk8dx-reference.md (level 10) where it has them; the hop and the trick window
// are tuned (tuning.js). How the body leans and rolls for drawing is kart-body.js's. Plain functions on plain
// kart objects, unit tested in Node. Used by kart-physics.js every step.
//
// MK8DX's rules: pressing Drift hops; the steering as the kart lands picks the drift's side; while drifting a
// counter charges, faster with the stick pushed hard into the turn, through three spark levels; releasing
// Drift fires a mini-turbo as long as the level reached. Pressing Drift as the kart leaves a ramp does a trick,
// and the kart boosts when it lands.

import { addScaled, dot } from './vector.js';
import { startBoost, miniTurboSeconds, BOOST_KINDS } from './kart-boosts.js';
import { startTrickRoll } from './kart-body.js';
import { tuning } from './tuning.js';

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
// A press up to tuning.trickEarly before the kart crosses a lip, or up to tuning.trickLate after, does a trick.
// The host judges by when the press arrives, a network trip after the thumb. Presses this close to a lip are
// timed for the readout, trick or not.
const LIP_TIMING_RANGE = 0.5;

// The technique fields of a fresh kart (also after it is put back on the road): driftDirection -1 (left), 1
// (right) or 0 (not drifting); driftCharge the MK8DX counter; sinceDriftPress seconds since Drift was last
// pressed; sinceLip seconds since the kart crossed a ramp's lip, null on the ground; hopping true from a hop
// until it lands; tricking true from a trick until the landing that boosts.
export function freshTechniques() {
  return {
    driftDirection: 0,
    driftCharge: 0,
    sinceDriftPress: Infinity,
    sinceLip: null,
    hopping: false,
    tricking: false,
  };
}

// The pull toward the road during a hop, in units per second squared: what brings a hop of tuning.hopHeight
// down in tuning.hopSeconds (h = g t^2 / 8). A hop has its own pull, so its height and length can be tuned
// apart; everything else in the air falls at the normal gravity (kart-physics.js).
export function hopGravity() {
  return (8 * tuning.hopHeight) / tuning.hopSeconds ** 2;
}

// 0 (no sparks), 1 blue, 2 orange or 3 purple.
export function sparkLevel(kart) {
  return kart.driftDirection === 0 ? 0 : SPARK_THRESHOLDS.filter((threshold) => kart.driftCharge >= threshold).length;
}

// Before the kart moves: a press of Drift hops on the ground or tricks just after a lip; letting go of it ends
// a drift with its mini-turbo. kart.driftHeld is the button last step; `dt` is the step's length.
export function useDriftButton(kart, controls, dt) {
  const held = controls.drift === true;
  const pressed = held && !kart.driftHeld;
  const released = !held && kart.driftHeld;
  kart.driftHeld = held;
  if (pressed) {
    kart.sinceDriftPress = 0;
    if (kart.grounded) {
      hop(kart, dt);
    } else if (kart.sinceLip !== null && kart.sinceLip <= tuning.trickLate) {
      startTrick(kart);
    }
    if (kart.sinceLip !== null && kart.sinceLip <= LIP_TIMING_RANGE && kart.lipTiming.offset === null) {
      kart.lipTiming = { offset: kart.sinceLip, trick: kart.tricking };
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

// Thrown up at the speed that reaches tuning.hopHeight under hopGravity (v = 4 h / t), plus half a step's
// worth of that pull: the steps take the pull off before they move the kart, which would otherwise cut the
// hop's top by about a tenth.
function hop(kart, dt) {
  const speed = (4 * tuning.hopHeight) / tuning.hopSeconds + (hopGravity() * dt) / 2;
  kart.velocity = addScaled(kart.velocity, kart.up, speed);
  kart.grounded = false;
  kart.surface = null;
  kart.hopping = true;
}

function startTrick(kart) {
  if (!kart.tricking) {
    kart.tricking = true;
    startTrickRoll(kart);
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
}

// A hop that goes over the lip becomes a jump, falling at the normal gravity. Also what the jump item's launch
// does (items/jump.js), so its trick window and timing readout are the course ramp's.
export function crossLip(kart) {
  kart.sinceLip = 0;
  kart.hopping = false;
  const pressedJustBefore = kart.sinceDriftPress <= tuning.trickEarly;
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
  kart.hopping = false;
  if (kart.tricking) {
    kart.tricking = false;
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
