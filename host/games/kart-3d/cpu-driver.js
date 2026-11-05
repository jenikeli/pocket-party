// The CPU karts' driver (M7e), also driving a player's kart once they have finished: it follows the course's
// racing line (racing-line.js) a little to one side of its own and round slower karts (cpu-aim.js), brakes only
// as much as the corners ahead need, drifts through long corners for mini-turbos (cpu-drift.js) and tricks off
// jumps and glides (cpu-trick.js), and gets itself going again when turned round or stuck (cpu-recovery.js). It
// gives the same controls a phone does. Its state is plain data, kept on the kart as kart.cpu. Plain maths, unit
// tested in Node. Used by host/games/kart-3d/race.js.

import { subtract, cross, dot } from './vector.js';
import { pointAt } from './track.js';
import { turnAngle, steeringRate, steerForRate, driftTurnAngle, kartTopSpeed } from './kart-driving.js';
import { forwardSpeed } from './kart-physics.js';
import { createRandom, between } from './random.js';
import { tuning } from './tuning.js';
import { CPU_LEVELS } from './cpu-levels.js';
import { lineCurvatureAhead, stationAhead } from './cpu-road.js';
import { freshAim, rejoinFrom, aimLateral, updateAim } from './cpu-aim.js';
import { freshDrift, driftButton, driftSteer, hopSteer } from './cpu-drift.js';
import { freshTrick } from './cpu-trick.js';
import { freshRecovery, recoveryControls } from './cpu-recovery.js';

// The steering's aim is never closer than this, however slow the kart, ...
const LOOK_AHEAD_MIN = 5;
// ... and stays this far inside the road's edges.
const EDGE_KEEP = 1.5;
// Corners within this much driving time count against the speed it may reach, plus its braking distance ...
const REACTION_SECONDS = 0.3;
// ... sampled this often along the road.
const SPEED_SAMPLE_STEP = 3;
// It brakes once this much faster than the speed it wants, and coasts between.
const BRAKE_SLACK = 1;
// The stick in the air when falling or thrown up: neutral. Off a ramp's lip it steers for its line instead (half
// the steering works in the air, kart-physics.js): a kart boosted over Seaside Skyway's jump lands in the hairpin
// after it, and flying straight it would land pointing at the wall. Under a glider (kart-glide.js) it steers for
// its line the same way, down the middle of the glide, and never holds Brake, so it never dives.
const IN_AIR = Object.freeze({ steer: 0, accelerate: true, brake: false });
// Its trick comes this many seconds after the lip, drawn per kart (the trick window is 0.3 s after it).
const TRICK_DELAY_FROM = 0.03;
const TRICK_DELAY_TO = 0.15;

// A fresh driver of `level` (a key of CPU_LEVELS), its own variety drawn from `seed`: its offset from the racing
// line, a small change to how close to the limit it corners, and its reaction off a ramp. started is false until
// its first step, when it joins its line from wherever its kart is; falling is true while its kart falls. Plus
// the fields of cpu-aim.js, cpu-drift.js, cpu-trick.js and cpu-recovery.js.
export function createCpu(level, seed) {
  const random = createRandom(seed);
  const { offsetRange, skillRange } = CPU_LEVELS[level];
  return {
    level,
    seed,
    offset: between(random, -offsetRange, offsetRange),
    skill: between(random, -skillRange, skillRange),
    trickDelay: between(random, TRICK_DELAY_FROM, TRICK_DELAY_TO),
    started: false,
    falling: false,
    ...freshAim(),
    ...freshDrift(),
    ...freshTrick(),
    ...freshRecovery(),
  };
}

// The controls { steer, accelerate, brake, drift } for `kart` (which has kart.cpu) this step; `karts` is the
// whole field, to pass the slower ones.
export function cpuControls(track, kart, karts, dt) {
  const cpu = kart.cpu;
  const level = CPU_LEVELS[cpu.level];
  if (kart.respawnIn !== null) {
    cpu.falling = true;
    return { ...IN_AIR, drift: false };
  }
  if (!cpu.started || cpu.falling) {
    startFresh(kart, cpu);
  }
  const recovery = recoveryControls(track, kart, cpu, dt);
  if (recovery) {
    Object.assign(cpu, freshDrift());
    return recovery;
  }
  updateAim(track, kart, karts, cpu, dt);
  const drift = driftButton(track, kart, cpu, level, dt);
  const speed = forwardSpeed(kart);
  const wantedRate = pursuitRate(track, kart, cpu, speed);
  if (!kart.grounded && !kart.hopping) {
    return { ...IN_AIR, steer: kart.sinceLip === null ? 0 : steerFor(wantedRate, speed), drift };
  }
  const steer = kart.driftDirection === 0 ? hopSteer(kart, cpu, steerFor(wantedRate, speed)) : driftSteer(kart, cpu, level, wantedRate);
  const wantedSpeed = speedAhead(track, kart, cpu, level, speed);
  return { steer, accelerate: speed < wantedSpeed, brake: speed > wantedSpeed + BRAKE_SLACK, drift };
}

// From its grid spot, or wherever it was put back after a fall: it joins its line from where it is, with
// nothing left of a pass, a drift or a recovery.
function startFresh(kart, cpu) {
  Object.assign(cpu, { started: true, falling: false }, freshAim(), freshDrift(), freshRecovery());
  rejoinFrom(cpu, kart.lateral);
}

// The turn rate (radians per second, right positive) that carries the kart through its aim point ahead, by pure
// pursuit: the arc from the kart through a point at `angle` and `distance` has curvature 2 sin(angle) /
// distance. Measured in the kart's own frame, on the road's surface, so a road rolled up to a wall does not
// look like a bend.
function pursuitRate(track, kart, cpu, speed) {
  const ahead = Math.max(LOOK_AHEAD_MIN, Math.abs(speed) * tuning.cpuLookAhead);
  const limit = stationAhead(track, kart, ahead).halfWidth - EDGE_KEEP;
  const lateral = Math.min(Math.max(aimLateral(track, cpu, kart.s + ahead), -limit), limit);
  const offset = subtract(pointAt(track, kart.s + ahead, lateral).position, kart.position);
  const across = dot(offset, cross(kart.forward, kart.up));
  const along = dot(offset, kart.forward);
  const distance = Math.hypot(across, along);
  return (speed * 2 * (across / distance)) / distance;
}

// The stick that turns at `rate`. A kart at a crawl turns less for the same stick (turnAngle), so the stick
// asks for more; steerForRate finds the stick for a rate on the steering curve.
function steerFor(rate, speed) {
  const crawlShare = Math.max(turnAngle(1, speed, 1) / steeringRate(1), 1e-6);
  return steerForRate(rate / crawlShare);
}

// The fastest it may go now and still slow, braking at tuning.cpuBraking, to each corner ahead's speed: the
// speed at which the level's share of the tightest turn (a drift's, while drifting) follows the line's bend
// there. Never past the level's share of its top speed. All read from the live tuning, so the speed and
// steering sliders change how CPUs drive.
function speedAhead(track, kart, cpu, level, speed) {
  const tightest = kart.driftDirection === 0 ? steeringRate(1) : driftTurnAngle(1, 1, Infinity, 1);
  const turnRate = tightest * level.cornerShare * (1 + cpu.skill);
  const braking = tuning.cpuBraking;
  const reaction = speed * REACTION_SECONDS;
  const reach = (speed * speed) / (2 * braking) + reaction + SPEED_SAMPLE_STEP;
  let wanted = kartTopSpeed(kart) * level.throttleShare;
  for (let ahead = 0; ahead <= reach; ahead += SPEED_SAMPLE_STEP) {
    const curvature = Math.abs(lineCurvatureAhead(track, kart, ahead));
    const cornerSpeed = turnRate / Math.max(curvature, 1e-6);
    wanted = Math.min(wanted, Math.sqrt(cornerSpeed * cornerSpeed + 2 * braking * Math.max(ahead - reaction, 0)));
  }
  return wanted;
}
