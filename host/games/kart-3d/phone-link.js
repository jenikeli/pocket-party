// What the 3D game sends to the phones: the view each one shows (only when it changes) and the pings that measure
// each round trip. Used by host/games/kart-3d/index.js.

import { setupView, raceView } from './race-views.js';

// Each phone's round-trip time is measured this often while the game runs, for the readout.
const PING_INTERVAL_MS = 2000;

// Starts pinging every connected phone and returns the function that stops it. The PING travels host -> server ->
// phone and back, the path an input takes, there and back. A timer, not the game's steps, which run slow when the
// frame rate drops. Disconnected phones are skipped.
export function startPinging(shell) {
  const timer = setInterval(() => {
    for (const player of shell.players.values()) {
      if (player.connected) {
        shell.pingPlayer(player.playerId, performance.now());
      }
    }
  }, PING_INTERVAL_MS);
  return () => clearInterval(timer);
}

// `session` is race-session.js's, `setup` and `choices` as there, `courseName()` the chosen course's name. Returns
// { sendChanged(), forget(playerId) }.
export function createPhoneViews({ shell, session, setup, choices, courseName }) {
  // playerId -> the view last sent to that phone as JSON, so a view is only sent when it changes.
  const sentViews = new Map();

  // Every player in the room gets a view. On the setup screen it is the setup view; during a race a player with
  // no kart (they joined on the results screen) gets null ("waiting for the next race") until the next setup
  // screen, and so does every phone in a watched race.
  function sendChanged() {
    const { race, standIns } = session;
    for (const playerId of shell.players.keys()) {
      const view = !race ? setupView(setup, choices.engineClass, courseName(), shell.players, playerId) : standIns ? null : raceView(race, setup, playerId);
      const viewText = JSON.stringify(view);
      if (sentViews.get(playerId) !== viewText) {
        sentViews.set(playerId, viewText);
        shell.setControllerView(playerId, view);
      }
    }
  }

  function forget(playerId) {
    sentViews.delete(playerId);
  }

  return { sendChanged, forget };
}
