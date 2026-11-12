// What the 2D race shows, worked out from the setup and race state: each phone's view (sent with
// setControllerView), the rows of the host's setup screen, standings and results (times as text are
// host/kart/race-time.js's), and when the room is open to new players.
// Plain functions, unit tested in Node. Used by index.js and the renderer.

import { kartsInPlaceOrder, currentLap, countdownNumber, RACE_PHASES } from './race.js';
import { playerSetup } from '../../kart/setup.js';
import { playersInSlotOrder } from '../../roster.js';
import { KART_STEERING } from '../../../shared/protocol.js';

// The phase a phone's view has on the setup screen, before every race; the race's own are RACE_PHASES.
export const SETUP_PHASE = 'setup';

// One row per player on the host's setup screen, in slot order: { player, controlsText, stateText, ready }. A
// player who joined while the screen was up is in `players`, so they get a row (and a kart) like the rest.
export function setupRows(setup, players) {
  return playersInSlotOrder(players).map((player) => {
    const { steering, autoAccelerate, ready } = playerSetup(setup, player.playerId);
    const steeringText = steering === KART_STEERING.TILT ? 'Tilt' : 'Stick';
    const stateText = !player.connected ? '(away)' : ready ? 'Ready' : 'Choosing...';
    return {
      player,
      controlsText: `${steeringText}, ${autoAccelerate ? 'auto-accelerate' : 'Go button'}`,
      stateText,
      ready: player.connected && ready,
    };
  });
}

// Whether new players may join: on the setup screen (no race) and the results, not while karts are racing.
export function roomIsOpen(race) {
  return race === null || race.phase === RACE_PHASES.RESULTS;
}

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
