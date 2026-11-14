// The CPU karts' catch-up (M7e): a CPU kart far behind the leading player gets a slightly higher top speed, one far
// ahead a slightly lower one. The reference game has a mild catch-up (rubber-banding), weaker than older console kart racers, with no
// published numbers, so the strength and range (tuning.js) are guesses to tune on the device run. Used by race.js.

import { tuning } from './tuning.js';

// `gap` is how many units of race distance the CPU kart is ahead of the leading player (negative: behind).
// Returns its top-speed share: 1 at gap 0, rising to 1 + cpuCatchUp when behind and falling to 1 - cpuCatchUp when
// ahead, linearly in |gap| up to cpuCatchUpRange, and flat beyond it. Reads the live tuning, so the sliders work.
export function cpuPaceShare(gap) {
  const strength = Math.min(Math.abs(gap) / tuning.cpuCatchUpRange, 1);
  return 1 - Math.sign(gap) * strength * tuning.cpuCatchUp;
}
