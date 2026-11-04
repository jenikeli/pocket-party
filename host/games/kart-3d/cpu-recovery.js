// How a CPU driver gets itself going again (M7e): turning round when it faces the wrong way along the road (after
// a big bump or a spin), and backing off a wall or a kart it is stuck nose against. Plain functions on the
// driver's plain-data state (kart.cpu), unit tested in Node through cpu-driver.js. Used by cpu-driver.js every
// step, before it drives the racing line. (Being put back on the road after a fall is cpu-driver.js's: the
// driver just starts again from where it was put.)

import { forwardSpeed } from './kart-physics.js';
import { headingToRoad } from './cpu-road.js';
import { isHeldOnWall } from './items/sticky-walls.js';

const DEGREES = Math.PI / 180;
// Pointing more than this far from the road's direction is the wrong way; it turns until it is within the
// second angle, so it does not flick between turning round and driving at the edge of the first.
const WRONG_WAY = 100 * DEGREES;
const TURNED_ROUND = 45 * DEGREES;
// It turns round at a crawl, where the full turn is tightest: at 5 units a second the circle is about 9 across,
// inside any road's width.
const TURN_ROUND_SPEED = 5;
// Barely moving for this long, though not stalled (a too-early rocket start holds a kart still), is stuck.
const STUCK_SPEED = 1.5;
const STUCK_SECONDS = 1;
// Stuck, it reverses for this long, steering its nose back toward the road's direction.
const REVERSE_SECONDS = 1.2;
// Nearly straight along the road, it turns its nose away from the nearer edge instead.
const STRAIGHT_ENOUGH = 8 * DEGREES;

// The recovery fields of a fresh driver: stuckFor seconds it has been barely moving, reverseLeft seconds of
// backing off left, reverseSteer the stick while backing off, turningRound true while it turns to face the
// right way.
export function freshRecovery() {
  return { stuckFor: 0, reverseLeft: 0, reverseSteer: 0, turningRound: false };
}

// The controls while recovering, or null to drive the racing line. Only on the road: in the air nothing helps.
// A kart held on a sticky wall (M8c) is not stuck: it is let go by itself, so it does not count as standing.
export function recoveryControls(track, kart, cpu, dt) {
  if (!kart.grounded) {
    return null;
  }
  if (isHeldOnWall(kart)) {
    cpu.stuckFor = 0;
    return null;
  }
  const heading = headingToRoad(track, kart);
  if (cpu.reverseLeft > 0) {
    cpu.reverseLeft -= dt;
    return backOff(cpu);
  }
  const speed = forwardSpeed(kart);
  cpu.stuckFor = Math.abs(speed) < STUCK_SPEED && kart.stallLeft === 0 ? cpu.stuckFor + dt : 0;
  if (cpu.stuckFor >= STUCK_SECONDS) {
    cpu.stuckFor = 0;
    cpu.reverseLeft = REVERSE_SECONDS;
    // Backing up, steering flips (kart-driving.js): the stick toward the side the nose points turns the nose
    // back the other way, toward the road's direction (or away from the nearer edge).
    cpu.reverseSteer = Math.abs(heading) > STRAIGHT_ENOUGH ? Math.sign(heading) : Math.sign(kart.lateral) || 1;
    return backOff(cpu);
  }
  cpu.turningRound = Math.abs(heading) > (cpu.turningRound ? TURNED_ROUND : WRONG_WAY);
  if (cpu.turningRound) {
    return { steer: -Math.sign(heading) || 1, accelerate: speed < TURN_ROUND_SPEED, brake: speed > TURN_ROUND_SPEED + 2, drift: false };
  }
  return null;
}

function backOff(cpu) {
  return { steer: cpu.reverseSteer, accelerate: false, brake: true, drift: false };
}
