// Scripted drivers for the 2D race tests: functions that return a kart's controls each step, standing in for
// players. Used by test/unit/kart-race.test.js; STEADY_LEFT is also what test/browser/m5b-kart-race.test.js
// does with real touches on the phones.

import { pointOnTrack } from '../../host/games/kart-2d/track.js';
import { wrapAngle } from '../../host/games/kart-2d/kart-physics.js';

// Accelerate held and the stick pushed a fifth of the way left, for the whole race. With no eyes on the track
// this still gets round: every bend is a left turn, and the walls turn a kart that meets them at a shallow
// angle to slide along. Simulations finished 3 laps with any steer from -0.16 to -0.24 and any start delay
// up to 1.5 s, so a browser test's timing jitter does not matter.
export const STEADY_LEFT = Object.freeze({ steer: -0.2, accelerate: true, brake: false });

// A driver that looks 250 px ahead along the middle of the road and steers towards it: a player who drives well.
export function followTrack(race, playerId) {
  const kart = race.karts.find((each) => each.playerId === playerId);
  const target = pointOnTrack(kart.distance + 250);
  const wanted = Math.atan2(target.y - kart.y, target.x - kart.x);
  const steer = Math.min(Math.max(wrapAngle(wanted - kart.heading) * 3, -1), 1);
  return { steer, accelerate: true, brake: false };
}
