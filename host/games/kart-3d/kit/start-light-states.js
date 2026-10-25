// What the start lights over the grid show (M7d2): during the countdown one more of the three lamps lights red
// with each number (3, 2, 1), all three turn green at GO and stay green a few seconds while the karts drive off,
// then go out. Off on the setup screen and at the results. Drawing only, read from the race's clock. Plain
// maths, unit tested in Node. Used by kit/start-lights.js.

import { GO_AT } from '../rocket-start.js';
import { RACE_PHASES } from '../race.js';

export const LAMP_STATES = Object.freeze({ OFF: 'off', RED: 'red', GREEN: 'green' });
const GREEN_SECONDS = 3;

// The three lamps' states, left to right, for `race` (null on the setup screen).
export function startLightStates(race) {
  const { OFF, RED, GREEN } = LAMP_STATES;
  if (!race || race.phase === RACE_PHASES.RESULTS || race.time >= GO_AT + GREEN_SECONDS) {
    return [OFF, OFF, OFF];
  }
  if (race.time >= GO_AT) {
    return [GREEN, GREEN, GREEN];
  }
  // "3" lights the first lamp, "2" the second, "1" the third (a second each).
  const lit = Math.floor(race.time) + 1;
  return [0, 1, 2].map((lamp) => (lamp < lit ? RED : OFF));
}
