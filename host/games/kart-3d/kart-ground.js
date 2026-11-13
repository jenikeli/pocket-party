// Where a kart is put after it moves: stuck to the road, taking off, landing, or falling off (it then waits for
// kart-physics.js to put it back). Plain functions on plain kart objects, unit tested in Node.
// Used by kart-physics.js.

import { scale, addScaled, cross, dot, normalize, flatten } from './vector.js';
import { surfaceAt } from './track.js';
import { endGlide } from './kart-glide.js';

// How far the road may drop away or rise under a kart in one step while it stays stuck to it. Big enough for
// the outer lane of a road rolling up to a wall; a ramp's lip is followed by a gap, so karts still take off.
const GROUND_SNAP = 0.5;
// A kart coming down lands if it is no deeper than this below the road (it crossed the surface this step).
const LANDING_DEPTH = 1.5;
// This far below the road (or below where the road would be), it has fallen off.
const FALL_DEPTH = 3;
// Seconds from falling past FALL_DEPTH (about half a second after leaving the road) to being put back.
export const RESPAWN_DELAY = 1;

// After the move: stuck to the road, taking off, landing, or falling off.
export function settle(track, kart, contact) {
  const surface = surfaceAt(contact);
  kart.trackIndex = contact.index;
  kart.s = contact.s;
  kart.lateral = contact.lateral;
  kart.antiGravity = contact.station.antiGravity;
  const nearSurface = contact.height > -GROUND_SNAP && contact.height < GROUND_SNAP;
  const landing = !kart.grounded && contact.height <= 0 && contact.height > -LANDING_DEPTH;
  if (surface && ((kart.grounded && nearSurface) || landing)) {
    stickToRoad(kart, contact, surface);
  } else {
    kart.grounded = false;
    kart.surface = null;
    if (contact.height < -FALL_DEPTH) {
      kart.respawnIn = RESPAWN_DELAY;
      endGlide(kart);
    }
  }
}

// Puts the kart on the surface with its up along the road's normal and its nose flat on the road. A kart that
// was already on the road keeps its speed along the nose over a change of slope (so a ramp does not slow it);
// one landing keeps only the part of its velocity along the road.
function stickToRoad(kart, contact, surface) {
  const oldSide = cross(kart.forward, kart.up);
  const forward = normalize(flatten(kart.forward, contact.normal));
  const side = cross(forward, contact.normal);
  const speed = dot(kart.velocity, kart.grounded ? kart.forward : forward);
  const slide = dot(kart.velocity, kart.grounded ? oldSide : side);
  kart.position = addScaled(kart.position, contact.normal, -contact.height);
  kart.up = contact.normal;
  kart.forward = forward;
  kart.velocity = addScaled(scale(forward, speed), side, slide);
  kart.grounded = true;
  kart.surface = surface;
  kart.lastGroundIndex = contact.index;
}
