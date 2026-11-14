// The end of the 3D race's laps: the race clock, counting laps, finishing, places and when the race is over. Plain
// functions on the race data of race.js, unit tested in Node through race.js. Used by race.js and race-views.js.

import { GO_AT } from './rocket-start.js';
import { handOver } from './race-cpus.js';
import { RACE_PHASES } from './race-phases.js';

// Once the first player finishes, the others have this long before the race ends without them (the 2D race's
// rule; the reference game waits for every player, but a phone left on a table would then hold the race up for ever).
export const FINISH_TIME_LIMIT_SECONDS = 30;

// The race's own clock: seconds since GO (0 before it).
export function raceClock(race) {
  return Math.max(race.time - GO_AT, 0);
}

// A new lap starts the clock for that lap; past the last lap's line the kart has finished. distance only
// grows by driving forward, so a kart that reverses over the line must drive that bit again. A finished player
// hands their kart to the CPU driver, as in the reference game, so it does not stand in the road.
export function countLaps(race, track, kart) {
  const lap = Math.min(Math.max(Math.floor(kart.distance / track.length) + 1, 1), race.laps);
  if (kart.finishTime === null && lap > kart.lap) {
    kart.lapStartedAt = raceClock(race);
  }
  kart.lap = lap;
  if (kart.finishTime !== null || kart.distance < race.laps * track.length) {
    return;
  }
  kart.finishTime = raceClock(race);
  if (kart.playerId !== null) {
    race.firstPlayerFinishTime ??= kart.finishTime;
    handOver(race, kart);
  }
}

// The results: places are final, and every player still racing hands their kart to the CPU driver too.
export function endRace(race) {
  race.phase = RACE_PHASES.RESULTS;
  race.karts.filter((kart) => kart.cpu === null).forEach((kart) => handOver(race, kart));
}

// Finishers by finish time, then everyone else by how far round they got. Places stop changing at the results:
// the karts still driving behind them do not overtake.
export function updatePlaces(race) {
  const order = [...race.karts].sort((first, second) => {
    if (first.finishTime !== null || second.finishTime !== null) {
      return (first.finishTime ?? Infinity) - (second.finishTime ?? Infinity);
    }
    return second.distance - first.distance;
  });
  order.forEach((kart, index) => (kart.place = index + 1));
}

// Over when every player has finished, or the time limit after the first player is up. CPU karts never hold the
// race up: those still driving are placed by how far round they got, as in the reference game.
export function isRaceOver(race) {
  const players = race.karts.filter((kart) => kart.playerId !== null);
  if (players.every((kart) => kart.finishTime !== null)) {
    return true;
  }
  return race.firstPlayerFinishTime !== null && raceClock(race) - race.firstPlayerFinishTime >= FINISH_TIME_LIMIT_SECONDS;
}
