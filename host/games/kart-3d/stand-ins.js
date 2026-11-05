// Stand-in players: karts that drive themselves (the CPU karts' driver, cpu-driver.js) in the players' places,
// so the host can draw 1 to 4 views with no phones. Used by the Measure tool (measure-plan.js, M7d4b) and the
// setup screen's Watch buttons (index.js, M7d4c1: a race to watch on the host, for the frame rate with several
// views). Plain data, unit tested in Node.

import { createRace } from './race.js';
import { freshItemSeed } from './items/item-rules.js';
import { handOver } from './race-cpus.js';

// At most four, as a race draws at most four views.
export const MAX_STAND_INS = 4;

// A race on `track` with `count` stand-ins (1 to MAX_STAND_INS) in the players' grid places and CPU karts in
// the rest, all driven at `cpuLevel` (a key of CPU_LEVELS), with the item boxes of `allowedItems` (item ids,
// none by default, as createRace), drawn from `itemSeed` (a fresh one by default): { race, players }, players
// a Map of the stand-ins by playerId in slot order, shaped like the room's players (playerId, colorIndex, name, connected), so the renderer and the results draw
// them as players.
export function createStandInRace(track, count, laps, engineClass, cpuLevel, allowedItems = [], itemSeed = freshItemSeed()) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_STAND_INS) {
    throw new Error(`A race takes 1 to ${MAX_STAND_INS} stand-ins, not ${count}`);
  }
  const standIns = Array.from({ length: count }, (unused, index) => ({
    playerId: `stand-in-${index + 1}`,
    colorIndex: index,
    name: `View ${index + 1}`,
    connected: true,
  }));
  const race = createRace(track, standIns.map((standIn) => standIn.playerId), laps, engineClass, cpuLevel, allowedItems, itemSeed);
  // A kart with a CPU driver drives itself (race.js), as a CPU kart does.
  race.karts.filter((kart) => kart.playerId !== null).forEach((kart) => handOver(race, kart));
  return { race, players: new Map(standIns.map((standIn) => [standIn.playerId, standIn])) };
}
