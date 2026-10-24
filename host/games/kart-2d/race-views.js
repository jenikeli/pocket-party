// What the 2D race shows, worked out from the race state: each phone's view (sent with setControllerView) and
// the rows of the standings and results. Plain functions, unit tested in Node. Used by index.js and the renderer.

import { kartsInPlaceOrder, currentLap, countdownNumber } from './race.js';

// The view for one player's phone, or null if they have no kart in this race (they joined after it started).
// { phase, countdown, lap, laps, place, finished }: countdown as countdownNumber, place 1 = first.
// It only changes when something on the phone should change, so the host sends it rarely.
export function controllerView(race, playerId) {
  const order = kartsInPlaceOrder(race);
  const index = order.findIndex((kart) => kart.playerId === playerId);
  if (index === -1) {
    return null;
  }
  const kart = order[index];
  return {
    phase: race.phase,
    countdown: countdownNumber(race),
    lap: currentLap(race, kart),
    laps: race.laps,
    place: index + 1,
    finished: kart.finishTime !== null,
  };
}

// One row per kart in place order: { place, playerId, lap, finishTime } (finishTime null if not finished).
export function standingRows(race) {
  return kartsInPlaceOrder(race).map((kart, index) => ({
    place: index + 1,
    playerId: kart.playerId,
    lap: currentLap(race, kart),
    finishTime: kart.finishTime,
  }));
}

// 83.456 -> '1:23.45'. Hundredths are cut, not rounded, so a time never shows later than it was. The tiny
// extra stops floating point turning 0.29 s into 28.999... hundredths.
export function formatRaceTime(seconds) {
  const hundredths = Math.floor(seconds * 100 + 1e-6);
  const minutes = Math.floor(hundredths / 6000);
  const rest = String(Math.floor(hundredths / 100) % 60).padStart(2, '0');
  return `${minutes}:${rest}.${String(hundredths % 100).padStart(2, '0')}`;
}
