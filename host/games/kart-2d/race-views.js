// What the 2D race shows, worked out from the setup and race state: each phone's view (sent with
// setControllerView) and the rows of the standings and results. Plain functions, unit tested in Node. Used by
// index.js and the renderer.

import { kartsInPlaceOrder, currentLap, countdownNumber } from './race.js';
import { playerSetup } from './setup.js';

// The phase a phone's view has on the setup screen, before every race; the race's own are RACE_PHASES.
export const SETUP_PHASE = 'setup';

// The view for one player's phone on the setup screen: { phase: 'setup', laps, steering, autoAccelerate, ready }.
export function setupView(setup, playerId) {
  const { steering, autoAccelerate, ready } = playerSetup(setup, playerId);
  return { phase: SETUP_PHASE, laps: setup.laps, steering, autoAccelerate, ready };
}

// The view for one player's phone during the race, or null if they have no kart in it (they joined after it
// started). { phase, countdown, lap, laps, place, finished, steering, autoAccelerate }: countdown as
// countdownNumber, place 1 = first. The control style is in every view, so a phone that reloads mid-race shows
// the right controls again. It only changes when something on the phone should change, so the host sends it
// rarely.
export function controllerView(race, setup, playerId) {
  const order = kartsInPlaceOrder(race);
  const index = order.findIndex((kart) => kart.playerId === playerId);
  if (index === -1) {
    return null;
  }
  const kart = order[index];
  const { steering, autoAccelerate } = playerSetup(setup, playerId);
  return {
    phase: race.phase,
    countdown: countdownNumber(race),
    lap: currentLap(race, kart),
    laps: race.laps,
    place: index + 1,
    finished: kart.finishTime !== null,
    steering,
    autoAccelerate,
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
