// The spin-boost posts of the airport's anti-gravity ring (M9): round obstacles standing on the road. A kart that
// hits one bounces off like off a wall, and in anti-gravity it also gets a spin boost, as in MK8DX. Plain
// functions on plain data, unit tested in Node. Used by race.js after the karts have bumped each other.

import { subtract, length, scale, addScaled, dot } from './vector.js';
import { KART_RADIUS } from './kart-walls.js';
import { pointAt } from './track.js';
import { tuning } from './tuning.js';
import { startBoost, BOOST_KINDS } from './kart-boosts.js';
import { startSpin } from './kart-body.js';

// A post is this wide (radius) and this tall; a kart higher above the road than the top passes over it.
export const SPIN_POST_RADIUS = 0.8;
export const SPIN_POST_HEIGHT = 1.8;

// One { sinceHit } per post of the track, in order: the seconds since a kart last bounced off it (null before).
export function createSpinPosts(track) {
  return track.spinPosts.map(() => ({ sinceHit: null }));
}

// Once per step: the posts' clocks and the karts' cooldowns count on, then every kart touching a post is pushed
// out and bounced. Karts falling off the road are left out.
export function stepSpinPosts(race, track, dt) {
  for (const kart of race.karts) {
    kart.postCooldown = Math.max(kart.postCooldown - dt, 0);
  }
  race.spinPosts.forEach((post, index) => {
    if (post.sinceHit !== null) {
      post.sinceHit += dt;
    }
    const base = pointAt(track, track.spinPosts[index].s, track.spinPosts[index].lateral);
    for (const kart of race.karts) {
      if (kart.respawnIn === null && hitPost(kart, base)) {
        post.sinceHit = 0;
      }
    }
  });
}

// Bounces `kart` off the post standing at `base` (a pointAt result) if it touches it. Returns whether it did.
function hitPost(kart, base) {
  const offset = subtract(kart.position, base.position);
  const height = dot(offset, base.normal);
  // The offset along the road, without its height: the post is round seen from above.
  const across = addScaled(offset, base.normal, -height);
  const distance = length(across);
  const reach = SPIN_POST_RADIUS + KART_RADIUS;
  if (height >= SPIN_POST_HEIGHT || distance >= reach) {
    return false;
  }
  // A kart exactly on the post's middle has no side to leave by: use the road's right.
  const out = distance > 0 ? scale(across, 1 / distance) : base.right;
  kart.position = addScaled(kart.position, out, reach - distance);
  bounce(kart, out);
  if (kart.antiGravity && kart.postCooldown === 0) {
    startBoost(kart, BOOST_KINDS.SPIN);
    startSpin(kart);
    kart.postCooldown = tuning.postCooldown;
  }
  return true;
}

// The speed toward the post comes back at the bounce's share, and at least the parting speed; the grip is loose
// for a moment, so the kart visibly slides away. `out` points from the post to the kart.
function bounce(kart, out) {
  const outwardSpeed = dot(kart.velocity, out);
  if (outwardSpeed < 0) {
    const partingSpeed = Math.max(-tuning.postBounce * outwardSpeed, tuning.postPartingSpeed);
    kart.velocity = addScaled(kart.velocity, out, partingSpeed - outwardSpeed);
  }
  kart.slideLeft = tuning.slideSeconds;
}
