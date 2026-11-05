// How the road objects move in their looks (M8b), as plain functions of an object's seconds left (road-objects.js:
// `left` counts down from tuning.itemEffectSeconds, solid while above 0, then down to -OBJECT_VANISH_SECONDS while
// it vanishes). The sandcastle drops in with a bounce and slumps into a pile that sinks. It writes into a `motion`
// object it is given, so the drawing allocates nothing a frame. Only drawing, never game state. Used by road-object-drawing.js; unit tested in Node.

import { OBJECT_VANISH_SECONDS } from './road-objects.js';
import { tuning } from '../tuning.js';

// The castle falls from this high (units) at this gravity, stretched by FALL_STRETCH, lands squashed by
// LAND_SQUASH and hops once at HOP_SHARE of its landing speed, wobbling (damping a second, rate in radians a
// second) as it settles.
const DROP_HEIGHT = 3.2;
const DROP_GRAVITY = 36;
const HOP_SHARE = 0.26;
const FALL_STRETCH = 0.14;
const LAND_SQUASH = 0.32;
const WOBBLE_DAMPING = 7;
const WOBBLE_RATE = 24;
export const DROP_SECONDS = Math.sqrt((2 * DROP_HEIGHT) / DROP_GRAVITY);
// Its vanishing: slumping over the first SLUMP_SHARE of it (to this share of its height, this much wider,
// leaning over by SLUMP_LEAN radians and settling SLUMP_DROP units into its pile, which is whole by PILE_SHARE of
// the way), and sinking CASTLE_SINK_DEPTH units from SINK_FROM of the way through to the end.
const SLUMP_SHARE = 0.5;
const SLUMPED_HEIGHT = 0.08;
const SLUMPED_WIDTH = 1.4;
const SLUMP_LEAN = 0.35;
const SLUMP_DROP = 0.3;
const PILE_SHARE = 0.32;
const SINK_FROM = 0.35;
const CASTLE_SINK_DEPTH = 0.9;

// The castle: { lift (units above the road), height and width (shares of its own), lean (radians over), pile (the
// pile's size, 0 to 1), sink (units below the road, castle and pile), landed (true once it has first touched
// down), vanishing (true once its time is up) }.
export function sandcastleMotion(left, motion = {}) {
  const elapsed = Math.max(tuning.itemEffectSeconds - left, 0);
  motion.landed = elapsed >= DROP_SECONDS;
  motion.vanishing = left <= 0;
  motion.lean = 0;
  motion.pile = 0;
  motion.sink = 0;
  if (!motion.landed) {
    motion.lift = DROP_HEIGHT - 0.5 * DROP_GRAVITY * elapsed ** 2;
    motion.height = 1 + FALL_STRETCH;
  } else {
    const since = elapsed - DROP_SECONDS;
    const rebound = HOP_SHARE * DROP_GRAVITY * DROP_SECONDS;
    motion.lift = Math.max(since * (rebound - 0.5 * DROP_GRAVITY * since), 0);
    motion.height = 1 - LAND_SQUASH * Math.exp(-WOBBLE_DAMPING * since) * Math.cos(WOBBLE_RATE * since);
  }
  // As tall as it stretches, that much thinner, so it keeps its bulk like soft sand.
  motion.width = 1 / Math.sqrt(motion.height);
  if (motion.vanishing) {
    const vanished = vanishedShare(left);
    const slump = smoothstep(Math.min(vanished / SLUMP_SHARE, 1));
    motion.lift = -SLUMP_DROP * slump;
    motion.height = 1 - (1 - SLUMPED_HEIGHT) * slump;
    motion.width = 1 + (SLUMPED_WIDTH - 1) * slump;
    motion.lean = SLUMP_LEAN * slump;
    motion.pile = smoothstep(Math.min(vanished / PILE_SHARE, 1));
    motion.sink = CASTLE_SINK_DEPTH * sinkShare(vanished);
  }
  return motion;
}

// How far through its vanishing an object is, 0 to 1.
function vanishedShare(left) {
  return Math.min(-left / OBJECT_VANISH_SECONDS, 1);
}

function sinkShare(vanished) {
  return smoothstep(Math.max((vanished - SINK_FROM) / (1 - SINK_FROM), 0));
}

function smoothstep(share) {
  return share * share * (3 - 2 * share);
}
