// When a CPU driver tricks off a jump (M7e): one press of Drift just after the ramp's lip, inside the trick's
// window (kart-techniques.js), on the share of jumps its level gives (cpu-levels.js). Which jumps it tricks off
// is drawn from its own seed, so a race replays the same. Plain functions on the driver's plain-data state
// (kart.cpu), unit tested in Node through cpu-driver.js. Used by cpu-drift.js, which owns the Drift button.

import { createRandom } from './random.js';
import { tuning } from './tuning.js';

// Each jump's draw is its own random number, from the kart's seed and how many jumps it has taken.
const JUMP_SEED_STRIDE = 7919;

// The trick fields of a fresh driver: jumps the jumps it has taken; inJump true from a lip to the landing;
// trickThisJump whether it tricks off this one.
export function freshTrick() {
  return { jumps: 0, inJump: false, trickThisJump: false };
}

// Whether to press Drift this step, in the air after a lip (kart.sinceLip is the time since it). One press:
// not if Drift was held last step (`driftHeld`), nor once the kart is tricking.
export function trickPress(kart, cpu, level, driftHeld) {
  if (!cpu.inJump) {
    cpu.inJump = true;
    cpu.jumps += 1;
    cpu.trickThisJump = createRandom(cpu.seed * JUMP_SEED_STRIDE + cpu.jumps)() < level.trickChance;
  }
  const inWindow = kart.sinceLip >= cpu.trickDelay && kart.sinceLip <= tuning.trickLate;
  return cpu.trickThisJump && inWindow && !kart.tricking && !driftHeld;
}

// Back on the ground: the next lip is a new jump.
export function landed(cpu) {
  cpu.inJump = false;
}
