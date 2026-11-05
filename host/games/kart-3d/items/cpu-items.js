// When a kart the CPU drives (a CPU kart, a stand-in) uses its held item (M8): a short wait after the item
// lands, then a simple rule per item. The same at every CPU level: the level changes only the driving
// (cpu-driver.js). Plain functions, unit tested in Node. Used by item-rules.js.

import { KART_ITEMS } from '../../../../shared/protocol.js';
import { turnAhead, wrapIndex } from '../track.js';
import { subtract, length, dot } from '../vector.js';
import { magnetTargets } from './field-forces.js';

// Blocker: a kart this close behind, about in line, to bump into it.
const BLOCKER_BEHIND_REACH = 12;
const BLOCKER_IN_LINE = 3;
// Ramp: on the ground with the road running straight: less than this turn (radians) at these stations ahead
// (the ramp is 15 ahead and a launched kart flies about 16 further).
const RAMP_STRAIGHT = 0.25;
const CORNER_LOOKS = [0, 10, 20, 30, 40];
// Push: a kart this close, any way round, to shove aside (the push is strongest close up).
const PUSH_CLOSE = 5;
// Sticky walls: once it has held the item this long, so not every CPU kart uses it the moment it lands.
const STICKY_AFTER_SECONDS = 3;

// Per item: (race, track, kart, heldFor) -> true to use it now. heldFor is the seconds since it landed.
const CPU_RULES = Object.freeze({
  [KART_ITEMS.BLOCKER]: (race, track, kart) =>
    otherKarts(race, kart).some(({ ahead, sideways }) => ahead < 0 && ahead >= -BLOCKER_BEHIND_REACH && sideways <= BLOCKER_IN_LINE),
  [KART_ITEMS.RAMP]: (race, track, kart) => kart.grounded && cornersAhead(track, kart, CORNER_LOOKS) < RAMP_STRAIGHT,
  // Teleport: only from the back half of the field, where a shake-up can only help.
  [KART_ITEMS.TELEPORT]: (race, track, kart) => kart.place > race.karts.length / 2,
  [KART_ITEMS.MAGNET]: (race, track, kart) => magnetTargets(race, kart).length > 0,
  [KART_ITEMS.PUSH]: (race, track, kart) => otherKarts(race, kart).some(({ distance }) => distance <= PUSH_CLOSE),
  [KART_ITEMS.STICKY]: (race, track, kart, heldFor) => heldFor >= STICKY_AFTER_SECONDS,
});

// True when the CPU-driven `kart` should use its held item this step.
export function cpuWantsItem(race, track, kart) {
  const heldFor = race.time - kart.item.landedAt;
  return heldFor >= kart.item.cpuWait && CPU_RULES[kart.item.held](race, track, kart, heldFor);
}

// Every other kart seen from `kart`: [{ ahead, sideways, distance }], ahead how far in front along its nose
// (negative behind), sideways how far off that line either way, distance how far in all.
function otherKarts(race, kart) {
  return race.karts
    .filter((other) => other !== kart)
    .map((other) => {
      const offset = subtract(other.position, kart.position);
      const distance = length(offset);
      const ahead = dot(offset, kart.forward);
      return { ahead, sideways: Math.sqrt(Math.max(distance * distance - ahead * ahead, 0)), distance };
    });
}

// How much the road turns, either way, at the stations `looks` ahead of `kart`.
function cornersAhead(track, kart, looks) {
  return looks.reduce((sum, look) => sum + Math.abs(turnAhead(track, wrapIndex(track, kart.trackIndex + look))), 0);
}
