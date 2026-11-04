// How a 3D kart speeds up, slows down and turns, from Mario Kart 8 Deluxe's own numbers for a middle build
// (level 10) at 150cc, as listed in docs/mk8dx-reference.md. Plain functions of numbers, unit tested in Node.
// Used by kart-physics.js, stepped at the fixed 60 Hz, which is also MK8DX's frame rate, so its per-frame
// numbers apply to one step each. The tuned numbers (top speed, steering, drift) are read live from tuning.js.

import { tuning } from './tuning.js';
import { effectTopSpeedShare } from './items/effect-rules.js';

// MK8DX's values, in its own distance units per frame. Its unit's size is not public, so only their ratios
// are used: everything below is scaled by our top speed (tuning.js).
const MK8_TOP_SPEED = 7.75;
// "The most that can be added to the speed in one frame" (Drive_AccLmtFwd).
const MK8_ACCELERATION_LIMIT = 0.08;
// Drive_SpdKfFwd. Not explained by the wiki. Our reading, not verified: each frame the kart closes this share
// of the gap to top speed, capped by the limit above. 0.01 x 7.75 is close to the 0.08 limit, which is why it
// reads that way; it gives an exponential approach, 90% of top speed after about 3.8 s.
const MK8_RELATIVE_ACCELERATION = 0.01;
const FRAMES_PER_SECOND = 60;
const DEGREES = Math.PI / 180;

// An MK8DX "distance units per frame added each frame" value in our units per second squared, for a kart whose
// top speed is `topSpeed`.
export function fromMk8Acceleration(perFrame, topSpeed) {
  return (perFrame / MK8_TOP_SPEED) * topSpeed * FRAMES_PER_SECOND;
}

// The kart's top speed on the road: the tuned 150cc top speed times its engine class's share (race.js), as in
// MK8DX, where 50, 100 and 200cc are the 150cc speeds times 0.8, 0.9 and 1.5, times its paceShare (the CPU
// catch-up share of cpu-pace.js; 1 for players), times its item effect's share (big is slower). Accelerations
// and boosts follow it.
export function kartTopSpeed(kart) {
  return tuning.topSpeed * kart.engineClassShare * kart.paceShare * effectTopSpeedShare(kart);
}

// Our own guesses (MK8DX's data has no numbers for these), in units per second and units per second squared.
const BRAKING = 30;
const MAX_REVERSE_SPEED = 6;
const REVERSE_ACCELERATION = 8;
const COASTING = 6;
// On the shoulders the top speed drops to this share. MK8DX's traction stat sets it; its value is not public.
export const OFF_ROAD_SPEED_SHARE = 0.5;
// How quickly a kart faster than its top speed (onto grass, or after a bump) slows to it.
const OFF_ROAD_DRAG = 30;
const OVER_TOP_DRAG = 10;
// Below this speed steering fades out, so a kart standing still cannot spin on the spot; in reverse it flips,
// as with a real car. Above it the turn rate is the same at any speed, so a slower kart turns tighter (as in
// MK8DX, where a hairpin needs braking or a drift).
const STEER_FULL_SPEED = 4;

// `speed` is the kart's speed along its nose (negative in reverse). `controls` is { steer, accelerate, brake }.
// `offRoad` is true on the shoulders. `boost` is the kart's boost (kart-boosts.js) or null: while it lasts the
// kart speeds up to its speed whatever the pedals, and off-road does not slow it, as in MK8DX, where a boost
// is the way across the grass. `roadTopSpeed` is the kart's top speed on the road (kartTopSpeed). Returns the
// speed after `dt` seconds.
export function nextSpeed(speed, controls, offRoad, dt, boost, roadTopSpeed) {
  if (boost) {
    const boostSpeed = roadTopSpeed * boost.speedShare;
    return speed < boostSpeed ? Math.min(speed + boost.acceleration * dt, boostSpeed) : Math.max(speed - OVER_TOP_DRAG * dt, boostSpeed);
  }
  const topSpeed = offRoad ? roadTopSpeed * OFF_ROAD_SPEED_SHARE : roadTopSpeed;
  if (speed > topSpeed) {
    // Faster than the top speed (just onto the grass, or pushed by a bump): drag it down, whatever the pedals.
    return Math.max(speed - (offRoad ? OFF_ROAD_DRAG : OVER_TOP_DRAG) * dt, topSpeed);
  }
  if (controls.brake) {
    return speed > 0 ? Math.max(speed - BRAKING * dt, 0) : Math.max(speed - REVERSE_ACCELERATION * dt, -MAX_REVERSE_SPEED);
  }
  if (controls.accelerate) {
    if (speed < 0) {
      return Math.min(speed + BRAKING * dt, 0);
    }
    // The share of the gap closed in dt: MK8_RELATIVE_ACCELERATION per frame, compounded.
    const share = 1 - (1 - MK8_RELATIVE_ACCELERATION) ** (dt * FRAMES_PER_SECOND);
    return speed + Math.min(fromMk8Acceleration(MK8_ACCELERATION_LIMIT, roadTopSpeed) * dt, (topSpeed - speed) * share);
  }
  return speed > 0 ? Math.max(speed - COASTING * dt, 0) : Math.min(speed + COASTING * dt, 0);
}

// The turn rate in radians per second for `steer` from -1 (left) to 1 (right), at any speed above a crawl. Near
// the middle it is a straight line of slope steerRate, so small movements turn gently; the steering curve's
// power then bends it up to fullSteerRate at the end of the stick's travel:
// rate = steerRate x steer + (fullSteerRate - steerRate) x steer ^ curve.
export function steeringRate(steer) {
  const amount = Math.min(Math.abs(steer), 1);
  const base = tuning.steerRate * DEGREES;
  const full = tuning.fullSteerRate * DEGREES;
  return Math.sign(steer) * Math.max(base * amount + (full - base) * amount ** tuning.steerCurve, 0);
}

// The steer (-1 to 1) that turns at `rate` radians per second: steeringRate turned round, for drivers that work
// out the turn they want (cpu-driver.js). The curve only rises, so halving the interval finds it.
export function steerForRate(rate) {
  const wanted = Math.abs(rate);
  if (wanted >= steeringRate(1)) {
    return Math.sign(rate);
  }
  let low = 0;
  let high = 1;
  for (let round = 0; round < 30; round += 1) {
    const middle = (low + high) / 2;
    if (steeringRate(middle) < wanted) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return Math.sign(rate) * (low + high) / 2;
}

// How far the kart turns in `dt` seconds, in radians (positive is right), for `steer` from -1 to 1.
export function turnAngle(steer, speed, dt) {
  return steeringRate(steer) * speedShare(speed) * dt;
}

// How far a drifting kart turns in `dt` seconds, in radians (positive is right). `direction` is the drift's side
// (-1 left, 1 right); `steer` (-1 to 1) pushed into the drift tightens it, pushed away widens it, but the kart
// always turns toward the drift's side: from driftWideShare of the tightest drift, through halfway between with
// the stick in the middle, to driftTightRate pushed fully into it.
export function driftTurnAngle(direction, steer, speed, dt) {
  const into = Math.min(Math.max(steer * direction, -1), 1);
  const share = tuning.driftWideShare + ((1 - tuning.driftWideShare) * (into + 1)) / 2;
  return direction * tuning.driftTightRate * DEGREES * share * speedShare(speed) * dt;
}

// 0 standing still, rising to 1 at STEER_FULL_SPEED; negative in reverse, so steering flips.
function speedShare(speed) {
  return Math.min(Math.max(speed / STEER_FULL_SPEED, -1), 1);
}
