// The jump item (M8d): using it lifts the kart straight up from where it is, keeping its speed along the road, so
// it can trick in the air. A plain function on the kart's plain data, unit tested in Node. Used by item-catalog.js.

import { addScaled } from '../vector.js';
import { GRAVITY } from '../kart-physics.js';
import { crossLip } from '../kart-techniques.js';
import { tuning } from '../tuning.js';

// Throws the kart up so it peaks tuning.jumpHeight over the road: a launch speed of sqrt(2 g h), and with the
// game's gravity 2.5 units is about 0.9 s in the air. Only an up part is added to its velocity, so its speed
// along the road stays. The launch counts as a takeoff off a lip (crossLip): Drift pressed up to trickEarly before
// or trickLate after it does a trick, for the boost on landing, as off the course's ramps. jumpedAt (the race
// time) is for the look (jump-look.js), which puffs once each time it changes.
export function launchJump(race, kart) {
  kart.velocity = addScaled(kart.velocity, kart.up, Math.sqrt(2 * GRAVITY * tuning.jumpHeight));
  kart.grounded = false;
  kart.surface = null;
  kart.item.jumpedAt = race.time;
  crossLip(kart);
}
