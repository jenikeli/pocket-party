// Stand-in players: karts that drive themselves (the CPU karts' dummy driver) in the players' places, so the host
// can draw 1 to 4 views with no phones. Used by the Measure tool (measure-plan.js, M7d4b) and the setup screen's
// Watch buttons (index.js, M7d4c1: a race to watch on the host, for the frame rate with several views). Plain
// data, unit tested in Node.

import { createRace } from './race.js';

// The stand-ins drive in these lanes (units right of the centre line), like the CPU karts; at most four, as a
// race draws at most four views.
const STAND_IN_LANES = Object.freeze([-2, 2, -1, 1]);
export const MAX_STAND_INS = STAND_IN_LANES.length;

// A race on `track` with `count` stand-ins (1 to MAX_STAND_INS) in the players' grid places and CPU karts in
// the rest: { race, players }, players a Map of the stand-ins by playerId in slot order, shaped like the room's
// players (playerId, colorIndex, name, connected), so the renderer and the results draw them as players.
export function createStandInRace(track, count, laps, engineClass) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_STAND_INS) {
    throw new Error(`A race takes 1 to ${MAX_STAND_INS} stand-ins, not ${count}`);
  }
  const standIns = STAND_IN_LANES.slice(0, count).map((lane, index) => ({
    playerId: `stand-in-${index + 1}`,
    colorIndex: index,
    name: `View ${index + 1}`,
    connected: true,
  }));
  const race = createRace(track, standIns.map((standIn) => standIn.playerId), laps, engineClass);
  // A kart with a lane drives itself (race.js), as a CPU kart does.
  race.karts.filter((kart) => kart.playerId !== null).forEach((kart, index) => (kart.lane = STAND_IN_LANES[index]));
  return { race, players: new Map(standIns.map((standIn) => [standIn.playerId, standIn])) };
}
