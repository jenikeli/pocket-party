// Karts bumping into each other in the 3D race, decided by weight as in MK8DX: each kart's mass blends between
// a minimum and a maximum by how fast it goes relative to its top speed, so a heavy kart at full speed shoves a
// light one aside, and a kart standing still is easy to push. Plain functions, unit tested in Node. Used by
// host/games/kart-3d/drive.js after every kart has stepped.

import { subtract, length, scale, addScaled, dot } from './vector.js';
import { KART_RADIUS } from './kart-physics.js';
import { TOP_SPEED } from './kart-driving.js';

// A kart's mass is its weight times this share at a standstill, and times 1 at top speed. MK8DX's own minimum
// and maximum are in its data but not in the reference, so this is a guess.
const STANDING_MASS_SHARE = 0.5;
// How much of the closing speed bounces back (0 = none, 1 = all), as in the 2D race.
const BOUNCE = 0.6;

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

export function kartMass(kart) {
  const speedShare = Math.min(length(kart.velocity) / TOP_SPEED, 1);
  return kart.weight * (STANDING_MASS_SHARE + (1 - STANDING_MASS_SHARE) * speedShare);
}

function bumpPair(first, second) {
  const between = subtract(second.position, first.position);
  const distance = length(between);
  const overlap = 2 * KART_RADIUS - distance;
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
  const closingSpeed = dot(subtract(second.velocity, first.velocity), normal);
  if (closingSpeed >= 0) {
    return;
  }
  const impulse = ((1 + BOUNCE) * closingSpeed) / (1 / firstMass + 1 / secondMass);
  first.velocity = addScaled(first.velocity, normal, impulse / firstMass);
  second.velocity = addScaled(second.velocity, normal, -impulse / secondMass);
}
