// The 3D race's walls: a kart that went through one is pushed back inside, bounces off it and scrapes along
// it. Plain maths on plain kart objects, unit tested in Node through kart-physics.js, which calls it every step
// after moving the kart. KART_RADIUS is also the size kart-bumps.js uses.

import { scale, addScaled, dot, normalize, flatten } from './vector.js';
import { outerEdge, wallOnSide } from './track.js';
import { endBoost, BOOST_KINDS } from './kart-boosts.js';

// A kart is a ball of this radius for walls and bumps (it is 2 units long and about 1.4 wide).
export const KART_RADIUS = 1;
// Walls stand this high above the road; a kart flying higher goes over them. One this far below the road (as
// deep as a landing kart can be) still meets them.
const WALL_HEIGHT = 1.5;
const WALL_DEPTH = 1.5;
const WALL_BOUNCE = 0.3;
// Scraping along a wall drags the kart (per second while touching), so the wall is never the fast line.
const WALL_SCRAPE = 1.6;
// A kart meeting a wall at under this angle turns to slide along it instead of stopping nose first.
const WALL_ALIGN_ANGLE = Math.PI / 4;

// Pushes the kart back inside a wall it went through and takes away its speed into the wall. Returns true if
// it touched one. Edges without a wall let it through, to fall. A wall ends a slipstream boost, as in MK8DX.
export function hitWall(track, kart, contact, dt) {
  const limit = outerEdge(track, contact) - KART_RADIUS;
  const nearRoad = contact.height < WALL_HEIGHT && contact.height > -WALL_DEPTH;
  if (contact.station.gap || !nearRoad || Math.abs(contact.lateral) <= limit || !wallOnSide(contact)) {
    return false;
  }
  const outward = scale(contact.right, Math.sign(contact.lateral));
  kart.position = addScaled(kart.position, outward, limit - Math.abs(contact.lateral));
  const intoWall = dot(kart.velocity, outward);
  if (intoWall > 0) {
    kart.velocity = addScaled(kart.velocity, outward, -(1 + WALL_BOUNCE) * intoWall);
  }
  kart.velocity = scale(kart.velocity, Math.exp(-WALL_SCRAPE * dt));
  endBoost(kart, BOOST_KINDS.SLIPSTREAM);
  // Nose into the wall at a shallow angle: point it along the wall instead.
  const noseIntoWall = dot(kart.forward, outward);
  if (noseIntoWall > 0 && Math.asin(Math.min(noseIntoWall, 1)) <= WALL_ALIGN_ANGLE) {
    kart.forward = normalize(flatten(kart.forward, outward));
  }
  return true;
}
