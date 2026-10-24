// The dummy karts' driver for the M6b test drive: follows the centre line in its own lane and brakes before
// bends it cannot take at speed, with the same controls a phone gives. A first rough stand-in for M7's CPU
// drivers, there to measure stepping a full field of 12 karts. Plain maths, unit tested in Node. Used by
// host/games/kart-3d/drive.js.

import { subtract, cross, dot } from './vector.js';
import { pointAt } from './track.js';
import { turnAngle, steeringRate, steerForRate } from './kart-driving.js';
import { forwardSpeed } from './kart-physics.js';

// How far ahead along the road it aims, and how far it looks for bends to slow down for.
const STEER_LOOK_AHEAD = 10;
const SPEED_LOOK_AHEADS = [12, 24];
// Brake once this much faster than a bend allows.
const BRAKE_MARGIN = 1.05;

// The controls { steer, accelerate, brake } for `kart`, driving `lane` units right of the centre line.
export function dummyControls(track, kart, lane) {
  if (!kart.grounded) {
    return { steer: 0, accelerate: true, brake: false };
  }
  const speed = forwardSpeed(kart);
  const aim = aimAt(track, kart, lane, STEER_LOOK_AHEAD);
  // Pure pursuit: the arc from the kart through the aim point has curvature 2 sin(angle) / distance, so it
  // needs that times the speed as a turn rate. A kart at a crawl turns less for the same stick (turnAngle), so
  // the stick asks for more; steerForRate finds the stick for that rate on the steering curve.
  const wantedTurnRate = (speed * 2 * Math.sin(aim.angle)) / aim.distance;
  const crawlShare = Math.max(turnAngle(1, speed, 1) / steeringRate(1), 1e-6);
  const steer = steerForRate(wantedTurnRate / crawlShare);
  const bendSpeed = Math.min(...SPEED_LOOK_AHEADS.map((lookAhead) => fastestThrough(track, kart, lane, lookAhead)));
  const brake = speed > bendSpeed * BRAKE_MARGIN;
  return { steer, accelerate: !brake, brake };
}

// Where the point `lookAhead` along the road is, seen from the kart: { angle, distance }, angle positive to
// its right. Measured on the road's surface (in the kart's own frame), so a road rolled up to a wall, which
// carries the kart round without steering, does not look like a bend.
function aimAt(track, kart, lane, lookAhead) {
  const offset = subtract(pointAt(track, kart.s + lookAhead, lane).position, kart.position);
  const side = cross(kart.forward, kart.up);
  const across = dot(offset, side);
  const ahead = dot(offset, kart.forward);
  return { angle: Math.atan2(across, ahead), distance: Math.hypot(across, ahead) };
}

// The fastest speed at which a full steer still reaches the point `lookAhead` along the road.
function fastestThrough(track, kart, lane, lookAhead) {
  const aim = aimAt(track, kart, lane, lookAhead);
  const sine = Math.abs(Math.sin(aim.angle));
  return sine < 1e-3 ? Infinity : (turnAngle(1, Infinity, 1) * aim.distance) / (2 * sine);
}
