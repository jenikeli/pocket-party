// The spin-boost posts of the airport's anti-gravity ring (M9): round posts standing on the road. A kart that
// touches one is slid round its side with its speed along the road kept, and in anti-gravity it spins and gets a
// spin boost forward, as in MK8DX: no bounce back (the M9 device run: a bounce threw karts into walls and each
// other, which MK8DX's pillars never do). Plain functions on plain data, unit tested in Node. Used by race.js after
// the karts have bumped each other.

import { add, subtract, length, scale, addScaled, dot } from './vector.js';
import { KART_RADIUS } from './kart-walls.js';
import { pointAt } from './track.js';
import { tuning } from './tuning.js';
import { startBoost, BOOST_KINDS } from './kart-boosts.js';
import { startSpin } from './kart-body.js';

// A post is this wide (radius) and this tall; a kart higher above the road than the top passes over it.
export const SPIN_POST_RADIUS = 0.8;
export const SPIN_POST_HEIGHT = 1.8;

// One { sinceHit } per post of the track, in order: the seconds since a kart last touched it (null before).
export function createSpinPosts(track) {
  return track.spinPosts.map(() => ({ sinceHit: null }));
}

// Once per step: the posts' clocks and the karts' cooldowns count on, then every kart touching a post is slid
// round it. Karts falling off the road are left out.
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

// Slides `kart` round the side of the post standing at `base` (a pointAt result) if it touches it, and spins and
// boosts it in anti-gravity. Returns whether it touched.
function hitPost(kart, base) {
  const offset = subtract(kart.position, base.position);
  const height = dot(offset, base.normal);
  // The offset along the road, without its height: the post is round seen from above.
  const across = addScaled(offset, base.normal, -height);
  const reach = SPIN_POST_RADIUS + KART_RADIUS;
  if (height >= SPIN_POST_HEIGHT || length(across) >= reach) {
    return false;
  }
  slideRound(kart, base, across, reach);
  if (kart.antiGravity && kart.postCooldown === 0) {
    startBoost(kart, BOOST_KINDS.SPIN);
    startSpin(kart);
    kart.postCooldown = tuning.postCooldown;
  }
  return true;
}

// Moves the kart sideways (along the road's right), never back, until it just clears the post, on the side it is
// already on (the right if dead centre); then takes away only its sideways speed toward the post. Its speed along
// the road is untouched, so even a head-on hit carries on round the post.
function slideRound(kart, base, across, reach) {
  const along = dot(across, base.forward);
  const side = Math.sign(dot(across, base.right)) || 1;
  const clear = addScaled(scale(base.forward, along), base.right, Math.sqrt(reach * reach - along * along) * side);
  kart.position = add(kart.position, subtract(clear, across));
  const towardPost = -dot(kart.velocity, base.right) * side;
  if (towardPost > 0) {
    kart.velocity = addScaled(kart.velocity, base.right, towardPost * side);
  }
}
