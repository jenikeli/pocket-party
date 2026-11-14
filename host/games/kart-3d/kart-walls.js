// The 3D race's walls: a kart that went through one is pushed back inside; a hit costs speed by how square it
// was and bounces the kart off, and rubbing along the wall drags it, so the wall is never the fast line round a
// corner. Plain maths on plain kart objects, unit tested in Node through kart-physics.js, which calls it every
// step after moving the kart. KART_RADIUS is also the size kart-bumps.js uses. While the sticky walls item runs
// (M8c), a wall holds a kart that touches it instead (items/sticky-walls.js). The tuned numbers are tuning.js's.

import { scale, addScaled, dot, length, normalize, flatten } from './vector.js';
import { outerEdge, wallOnSide } from './track.js';
import { endBoost, BOOST_KINDS } from './kart-boosts.js';
import { tuning } from './tuning.js';
import { stickToWall } from './items/sticky-walls.js';

// A kart is a ball of this radius for walls and bumps (it is 2 units long and about 1.4 wide).
export const KART_RADIUS = 1;
// Walls stand this high above the road; a kart flying higher goes over them. One this far below the road (as
// deep as a landing kart can be) still meets them.
const WALL_HEIGHT = 1.5;
const WALL_DEPTH = 1.5;
// Going into the wall slower than this (units per second) is resting against it, not a hit: a kart steered
// along a curving wall meets it a little every step, and only scrapes.
export const HIT_SPEED = 1;

// Pushes the kart back inside a wall it went through and deals with its speed into the wall. Returns true if
// it touched one. Edges without a wall let it through, to fall. A wall ends a slipstream boost, as in the reference game. A
// sticky wall holds the kart where it touched it, with no bounce.
export function hitWall(track, kart, contact, dt) {
  const limit = outerEdge(contact) - KART_RADIUS;
  const nearRoad = contact.height < WALL_HEIGHT && contact.height > -WALL_DEPTH;
  if (contact.station.gap || !nearRoad || Math.abs(contact.lateral) <= limit || !wallOnSide(contact)) {
    return false;
  }
  const outward = scale(contact.right, Math.sign(contact.lateral));
  kart.position = addScaled(kart.position, outward, limit - Math.abs(contact.lateral));
  if (stickToWall(kart)) {
    return true;
  }
  const intoWall = dot(kart.velocity, outward);
  if (intoWall > HIT_SPEED) {
    bounceOff(kart, outward, intoWall);
  } else if (intoWall > 0) {
    kart.velocity = addScaled(kart.velocity, outward, -intoWall);
  }
  kart.velocity = scale(kart.velocity, Math.exp(-tuning.wallScrape * dt));
  endBoost(kart, BOOST_KINDS.SLIPSTREAM);
  // Nose into the wall at a shallow angle: point it along the wall instead.
  const noseIntoWall = dot(kart.forward, outward);
  if (noseIntoWall > 0 && Math.asin(Math.min(noseIntoWall, 1)) <= (tuning.wallAlignDegrees * Math.PI) / 180) {
    kart.forward = normalize(flatten(kart.forward, outward));
  }
  return true;
}

// A hit: the speed along the wall drops by the graze loss plus the hit loss times the sine of the angle (all of
// it for a square hit), and the kart bounces back with a share of its speed into the wall, at least the least
// bounce speed. Its grip stays loose for a moment (kart-physics.js), so the bounce carries it away from the wall.
// `outward` points into the wall. Also the items' blocker's hit (items/road-objects.js).
export function bounceOff(kart, outward, intoWall) {
  const sine = intoWall / length(kart.velocity);
  const kept = Math.max(1 - tuning.wallGrazeLoss - tuning.wallHitLoss * sine, 0);
  const alongWall = addScaled(kart.velocity, outward, -intoWall);
  const bounce = Math.max(tuning.wallBounce * intoWall, tuning.wallBounceSpeed);
  kart.velocity = addScaled(scale(alongWall, kept), outward, -bounce);
  kart.slideLeft = tuning.slideSeconds;
}
