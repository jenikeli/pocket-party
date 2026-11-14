// Slipstream (drafting) in the 3D race, as in the reference game: a kart that stays close behind another for a while gets a
// modest boost, which a wall or a bump ends (kart-walls.js, kart-bumps.js). Plain maths, unit tested in Node.
// Used by host/games/kart-3d/race.js after every kart has stepped.

import { subtract, cross, dot } from './vector.js';
import { startBoost, BOOST_KINDS } from './kart-boosts.js';
import { kartTopSpeed } from './kart-driving.js';

// The reference says "about 3-5 s" close behind; the short end, to be checked on a device.
export const SLIPSTREAM_SECONDS = 3;
// "Close behind": the kart ahead is 1.5 to 12 units in front (up to 6 kart lengths), at most 1.6 to either side
// and 2 above or below, and this kart goes at least 60% of top speed. Guesses.
const NEAREST_AHEAD = 1.5;
const FARTHEST_AHEAD = 12;
const MOST_ACROSS = 1.6;
const MOST_ABOVE = 2;
const MIN_SPEED_SHARE = 0.6;
// Out of the slipstream, the charge drains at this many seconds per second, so a brief wobble loses little.
const DRAIN_RATE = 1;

// `karts` is the whole field; each kart's slipstreamCharge (kart-boosts.js) grows while it is close behind
// another, and fires the boost when it reaches SLIPSTREAM_SECONDS.
export function updateSlipstreams(karts, dt) {
  for (const kart of karts) {
    const drafting = kart.grounded && kart.respawnIn === null && karts.some((other) => other !== kart && isCloseBehind(kart, other));
    kart.slipstreamCharge = drafting ? kart.slipstreamCharge + dt : Math.max(kart.slipstreamCharge - DRAIN_RATE * dt, 0);
    if (kart.slipstreamCharge >= SLIPSTREAM_SECONDS) {
      kart.slipstreamCharge = 0;
      startBoost(kart, BOOST_KINDS.SLIPSTREAM);
    }
  }
}

// Measured in the kart's own frame, so it works the same on a wall or upside down.
function isCloseBehind(kart, other) {
  if (other.respawnIn !== null || dot(kart.velocity, kart.forward) < MIN_SPEED_SHARE * kartTopSpeed(kart)) {
    return false;
  }
  const offset = subtract(other.position, kart.position);
  const ahead = dot(offset, kart.forward);
  const across = dot(offset, cross(kart.forward, kart.up));
  const above = dot(offset, kart.up);
  return ahead >= NEAREST_AHEAD && ahead <= FARTHEST_AHEAD && Math.abs(across) <= MOST_ACROSS && Math.abs(above) <= MOST_ABOVE;
}
