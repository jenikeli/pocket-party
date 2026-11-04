// Karts bumping into each other in the 3D race, decided by weight as in MK8DX: each kart's mass blends between
// a minimum and a maximum by how fast it goes relative to its top speed, so a heavy kart at full speed shoves a
// light one aside, and a kart standing still is easy to push. A bump ends a slipstream boost, and two karts
// bumping in an anti-gravity section both get a spin boost, as in MK8DX. Karts bounce apart (partly elastic,
// never less than a least parting speed) and slide loose for a moment, so a bump visibly throws them apart.
// Plain functions, unit tested in Node. Used by host/games/kart-3d/race.js after every kart has stepped. The
// tuned numbers are tuning.js's.

import { subtract, length, scale, addScaled, dot } from './vector.js';
import { KART_RADIUS } from './kart-walls.js';
import { tuning } from './tuning.js';
import { kartTopSpeed } from './kart-driving.js';
import { startBoost, endBoost, BOOST_KINDS } from './kart-boosts.js';
import { startSpin } from './kart-body.js';
import { effectMassShare, effectSize, effectBounceShare } from './items/effect-rules.js';

// Pushes every overlapping pair apart and bounces their velocities along the line between them. Karts that are
// falling after leaving the road are left out.
export function bumpKarts(karts) {
  const solid = karts.filter((kart) => kart.respawnIn === null);
  for (let i = 0; i < solid.length; i += 1) {
    for (let j = i + 1; j < solid.length; j += 1) {
      bumpPair(solid[i], solid[j]);
    }
  }
}

// The kart's weight (times its item effect's mass share) times tuning.standingMassShare standing still, rising to its full weight at its top speed.
export function kartMass(kart) {
  const speedShare = Math.min(length(kart.velocity) / kartTopSpeed(kart), 1);
  return kart.weight * effectMassShare(kart) * (tuning.standingMassShare + (1 - tuning.standingMassShare) * speedShare);
}

// A bouncy kart (item effect) parts from a normal kart at its bounce share times the usual parting speed. The
// extra speed goes wholly to the other kart, so the bouncy one keeps its line. Two bouncy karts, or none, part
// as usual.
function addBouncyExtra(first, second, normal, partingSpeed) {
  const firstBounce = effectBounceShare(first);
  const secondBounce = effectBounceShare(second);
  if ((firstBounce > 1) === (secondBounce > 1)) {
    return;
  }
  const extra = partingSpeed * (Math.max(firstBounce, secondBounce) - 1);
  if (firstBounce > 1) {
    second.velocity = addScaled(second.velocity, normal, extra);
  } else {
    first.velocity = addScaled(first.velocity, normal, -extra);
  }
}

function bumpPair(first, second) {
  const between = subtract(second.position, first.position);
  const distance = length(between);
  const overlap = KART_RADIUS * (effectSize(first) + effectSize(second)) - distance;
  if (overlap <= 0) {
    return;
  }
  // Two karts on exactly the same spot have no direction between them, so use the first one's side.
  const normal = distance > 0 ? scale(between, 1 / distance) : first.forward;
  const firstMass = kartMass(first);
  const secondMass = kartMass(second);
  const firstShare = secondMass / (firstMass + secondMass);
  // The lighter kart is moved further apart, and its speed changes more.
  first.position = addScaled(first.position, normal, -overlap * firstShare);
  second.position = addScaled(second.position, normal, overlap * (1 - firstShare));
  endBoost(first, BOOST_KINDS.SLIPSTREAM);
  endBoost(second, BOOST_KINDS.SLIPSTREAM);
  const closingSpeed = dot(subtract(second.velocity, first.velocity), normal);
  if (closingSpeed >= 0) {
    return;
  }
  // They part at the bounce's share of the speed they met at, and at least the least parting speed. The push
  // that does it is shared out by mass (the lighter kart's speed changes more), which keeps their momentum.
  const partingSpeed = Math.max(-tuning.bumpBounce * closingSpeed, tuning.bumpMinSpeed);
  const impulse = (partingSpeed - closingSpeed) / (1 / firstMass + 1 / secondMass);
  first.velocity = addScaled(first.velocity, normal, -impulse / firstMass);
  second.velocity = addScaled(second.velocity, normal, impulse / secondMass);
  addBouncyExtra(first, second, normal, partingSpeed);
  first.slideLeft = tuning.slideSeconds;
  second.slideLeft = tuning.slideSeconds;
  // Only when they meet (closing in), not every step they stay touching.
  if (first.antiGravity && second.antiGravity) {
    for (const kart of [first, second]) {
      startBoost(kart, BOOST_KINDS.SPIN);
      startSpin(kart);
    }
  }
}
