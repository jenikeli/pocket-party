// How a CPU driver uses the Drift button (M7e): hopping into a drift where its racing line bends long enough to
// charge sparks, following the line within the drift while pumping the stick to charge, and letting go for the
// mini-turbo as the corner ends (or before it runs into the inside of the road). Off a ramp's lip the button
// tricks instead (cpu-trick.js). The button's rules are kart-techniques.js's. Plain functions on the driver's
// plain-data state (kart.cpu), unit tested in Node through cpu-driver.js. Used by cpu-driver.js every step.
//
// Why pump: the counter charges 5 a frame with the stick pushed well into the drift and 2 otherwise, whatever the
// turn. Per degree turned, the widest turn (2 a frame at about 25 deg/s) and a hard push (5 a frame at about 63)
// both charge about 4.8, but a turn between them charges less (2 a frame at, say, 40 deg/s is 3). So it switches
// between the two, and its steering's aim sets how long it holds each. Blue then takes about 55 degrees of turn,
// orange 115 and purple 170, so a corner's sparks are set by how far it turns while drifting: as a corner ends
// short of the level's sparks, it may push on into it and turn further than the road (the level's overshoot,
// cpu-levels.js) before letting go and straightening up.

import { forwardSpeed } from './kart-physics.js';
import { MIN_DRIFT_SPEED, sparkLevel } from './kart-techniques.js';
import { driftTurnAngle, steeringRate } from './kart-driving.js';
import { lineCurvatureAhead, lineTurnAhead, lipAhead, headingToLine } from './cpu-road.js';
import { trickPress, landed } from './cpu-trick.js';

const DEGREES = Math.PI / 180;
// It only starts a drift this fast (the drift ends below MIN_DRIFT_SPEED).
const DRIFT_FROM_SPEED = MIN_DRIFT_SPEED * 1.5;
// It hops where the line bends at least this share of the widest drift's turn this long ahead (a hop lasts about
// 0.27 s). A drift cannot turn more gently than that, so starting where the line is gentler cuts inside it.
const HOP_LEAD_SECONDS = 0.3;
const DRIFT_ENTRY_SHARE = 0.9;
// How far ahead it judges how far a corner turns, in seconds of driving: about as long as a drift lasts.
const CORNER_LOOK_SECONDS = 3;
// The corner is ending when the line turns less than this over the next ENDING_LOOK_SECONDS.
const ENDING_DEGREES = 12;
const ENDING_LOOK_SECONDS = 0.6;
// It only turns in past a corner's end if the road does not turn the other way within this time (an S-bend).
const OVERSHOOT_LOOK_SECONDS = 1;
// The stick it holds toward the drift's side during the hop (landing needs at least 0.3).
const HOP_STEER = 0.5;
// Pumping: the hard push (the counter's fast charge needs 0.55 into the drift), the aim's "into" (-1 widest, 1
// tightest) above which it pushes, and the least time it holds either, so the wheels do not flicker.
const HARD_INTO = 0.6;
const PUMP_SPLIT = -0.2;
const PUMP_HOLD = 0.1;
// It lets go before it comes within INSIDE_KEEP of touching the inside edge of the road, judging with
// REACTION_SECONDS to spare.
const INSIDE_KEEP = 1;
const REACTION_SECONDS = 0.15;
// No drift starts within this many seconds of a ramp's lip (it must take off straight), and a drift is let go
// as one comes near.
const LIP_CLEAR_SECONDS = 1.2;
// After a drift ends, it waits this long before the next hop.
const DRIFT_COOLDOWN = 0.4;

// The drift fields of a fresh driver: driftHeld the button it pressed last step; driftSide the side of the drift
// it is hopping into or holding (0 when none); overshooting true once it turns in past the corner's end;
// driftCooldown seconds before it may hop again; pumpHard whether it is pushing hard and pumpHold how long it
// keeps to that.
export function freshDrift() {
  return { driftHeld: false, driftSide: 0, overshooting: false, driftCooldown: 0, pumpHard: false, pumpHold: 0 };
}

// Whether to hold Drift this step, for `kart` driven by `cpu` at `level` (cpu-levels.js).
export function driftButton(track, kart, cpu, level, dt) {
  cpu.driftCooldown = Math.max(cpu.driftCooldown - dt, 0);
  cpu.pumpHold -= dt;
  if (kart.sinceLip !== null && !kart.grounded) {
    return press(cpu, trickPress(kart, cpu, level, cpu.driftHeld));
  }
  landed(cpu);
  if (kart.driftDirection !== 0) {
    return holdDrift(track, kart, cpu, level) ? press(cpu, true) : letGo(cpu);
  }
  if (cpu.driftHeld) {
    // Pressed and still hopping; once down without a drift (too slow, or the stick was not over), let go.
    return kart.grounded ? letGo(cpu) : true;
  }
  cpu.driftSide = startSide(track, kart, cpu, level);
  return press(cpu, cpu.driftSide !== 0);
}

// The stick when not drifting, from the stick it would use anyway: during a hop into a drift, held at least
// HOP_STEER toward the drift's side, so the drift starts on that side as the kart lands.
export function hopSteer(kart, cpu, normalSteer) {
  return cpu.driftHeld && kart.hopping ? cpu.driftSide * Math.max(HOP_STEER, normalSteer * cpu.driftSide) : normalSteer;
}

// The stick while drifting, from the turn rate the driver wants (radians per second, right positive).
export function driftSteer(kart, cpu, level, wantedRate) {
  const side = kart.driftDirection;
  if (cpu.overshooting) {
    // Pushed hard, the turn past the corner's end is quick and tight, so it needs the least room.
    return side * HARD_INTO;
  }
  // driftTurnAngle runs from the widest turn (stick away) to the tightest (stick into it) in a straight line.
  const speed = forwardSpeed(kart);
  const widest = driftTurnAngle(1, -1, speed, 1);
  const tightest = driftTurnAngle(1, 1, speed, 1);
  const into = -1 + (2 * (wantedRate * side - widest)) / (tightest - widest);
  if (!level.pumpsDrift) {
    return side * Math.min(Math.max(into, -1), 1);
  }
  if (cpu.pumpHold <= 0) {
    cpu.pumpHard = into > PUMP_SPLIT;
    cpu.pumpHold = PUMP_HOLD;
  }
  return side * (cpu.pumpHard ? Math.max(HARD_INTO, Math.min(into, 1)) : -1);
}

function press(cpu, held) {
  cpu.driftHeld = held;
  return held;
}

function letGo(cpu) {
  Object.assign(cpu, { driftSide: 0, overshooting: false, driftCooldown: DRIFT_COOLDOWN });
  return press(cpu, false);
}

// The side (1 right, -1 left) to hop into a drift now, or 0: where the line bends just ahead nearly as much as
// the widest drift turns, and goes on turning that way at least the level's driftTurnDegrees, with no jump
// coming before it ends.
function startSide(track, kart, cpu, level) {
  const speed = forwardSpeed(kart);
  if (!kart.grounded || cpu.driftCooldown > 0 || speed < DRIFT_FROM_SPEED) {
    return 0;
  }
  const lead = speed * HOP_LEAD_SECONDS;
  const curvature = lineCurvatureAhead(track, kart, lead);
  const side = Math.sign(curvature);
  if (Math.abs(curvature) * speed < driftTurnAngle(1, -1, speed, 1) * DRIFT_ENTRY_SHARE) {
    return 0;
  }
  const cornerLength = speed * CORNER_LOOK_SECONDS;
  if (lipAhead(track, kart.s, lead + cornerLength) || lineTurnAhead(track, kart, lead, cornerLength, side) < level.driftTurnDegrees * DEGREES) {
    return 0;
  }
  return side;
}

// Keep drifting while the corner goes on; as it ends, let go once at the level's sparks, or push on and turn
// further than the line (up to the level's overshoot) to reach them. Always let go before running into the
// inside of the road, before a jump, or when too slow to keep the drift.
function holdDrift(track, kart, cpu, level) {
  const side = kart.driftDirection;
  const speed = forwardSpeed(kart);
  if (speed < MIN_DRIFT_SPEED + 1 || lipAhead(track, kart.s, speed * LIP_CLEAR_SECONDS) || nearInside(track, kart, side, speed)) {
    return false;
  }
  const remaining = lineTurnAhead(track, kart, 0, speed * ENDING_LOOK_SECONDS, side);
  if (remaining > ENDING_DEGREES * DEGREES && !cpu.overshooting) {
    return true;
  }
  const turnsBack = lineTurnAhead(track, kart, 0, speed * OVERSHOOT_LOOK_SECONDS, -side) > ENDING_DEGREES * DEGREES;
  if (sparkLevel(kart) >= level.sparkTarget || turnsBack) {
    return false;
  }
  cpu.overshooting = true;
  return headingToLine(track, kart) * side < level.overshootDegrees * DEGREES;
}

// True if the kart, heading in toward the drift's inside across its line, has only just room left to straighten
// up before the inside edge of the road. Once it lets go it turns away at the full normal turn, while the line
// bends toward the inside, so it straightens against the line at the sum of the two.
function nearInside(track, kart, side, speed) {
  const room = track.stations[kart.trackIndex].halfWidth - INSIDE_KEEP - kart.lateral * side;
  const inward = Math.max(headingToLine(track, kart) * side, 0);
  const lineBend = Math.max(lineCurvatureAhead(track, kart, 0) * side * speed, 0);
  const straighten = (speed / (steeringRate(1) + lineBend)) * (1 - Math.cos(inward)) + speed * Math.sin(inward) * REACTION_SECONDS;
  return room < straighten;
}
