// Sticky walls (M8c): for the effect's time every wall of the course is sticky. A kart touching one is held
// still for tuning.stickyHoldSeconds, then let go with a small push off the wall, and cannot stick again for a
// moment. Plain functions on the race's plain data, unit tested in Node. Used by item-catalog.js (using the
// item), item-rules.js (every step), kart-walls.js (a kart touching a wall), kart-physics.js (a held kart does
// not move) and cpu-recovery.js (a held CPU kart is not stuck).
//
// The race's state is race.items.stickyLeft, the seconds the walls stay sticky (0 when they are not); each
// kart's, its kart.item fields stuckLeft (seconds still held, 0 when free), stickAgainIn (seconds before it can
// stick again) and stickyWalls (a copy of "the walls are sticky" for kart-walls.js, which sees only the kart).

import { pointAt } from '../track.js';
import { scale, vec } from '../vector.js';
import { tuning } from '../tuning.js';

// After being let go, a kart cannot stick again for this long, so it gets away from the wall.
export const STICK_AGAIN_SECONDS = 0.5;

// Every wall turns sticky for the effect's time (a second use starts the time again).
export function makeWallsSticky(race) {
  race.items.stickyLeft = tuning.itemEffectSeconds;
}

// True while `kart` is held on a wall. False for a kart with no items (the physics tests' karts).
export function isHeldOnWall(kart) {
  return (kart.item?.stuckLeft ?? 0) > 0;
}

// kart-walls.js calls this when `kart` on the road touches a wall: while the walls are sticky and the kart may
// stick, it is held where it is, its drift ended without a mini-turbo and its boost gone. Returns true if it
// stuck (the wall's bounce is then skipped).
export function stickToWall(kart) {
  const item = kart.item;
  if (!item?.stickyWalls || !kart.grounded || item.stuckLeft > 0 || item.stickAgainIn > 0) {
    return false;
  }
  item.stuckLeft = tuning.stickyHoldSeconds;
  kart.velocity = vec(0, 0, 0);
  kart.driftDirection = 0;
  kart.driftCharge = 0;
  kart.boost = null;
  return true;
}

// One step: the walls' time counts down, held karts count down to being let go, and each kart learns whether
// the walls are sticky for its next step.
export function stepStickyWalls(race, track, dt) {
  race.items.stickyLeft = Math.max(race.items.stickyLeft - dt, 0);
  for (const kart of race.karts) {
    const item = kart.item;
    item.stickAgainIn = Math.max(item.stickAgainIn - dt, 0);
    if (item.stuckLeft > 0) {
      item.stuckLeft = Math.max(item.stuckLeft - dt, 0);
      if (item.stuckLeft === 0) {
        letGo(track, kart);
      }
    }
    item.stickyWalls = race.items.stickyLeft > 0;
  }
}

// Pushed off the wall it is on (on the side of the road its middle is), toward the road's middle, with loose
// grip so the push carries it clear.
function letGo(track, kart) {
  const inward = scale(pointAt(track, kart.s).right, -Math.sign(kart.lateral));
  kart.velocity = scale(inward, tuning.stickyPushOffSpeed);
  kart.slideLeft = tuning.slideSeconds;
  kart.item.stickAgainIn = STICK_AGAIN_SECONDS;
}
