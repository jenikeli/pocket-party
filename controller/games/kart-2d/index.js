// The phone side of the 2D race, a game module: the shared kart controls (controller/kart/controls.js), with
// the countdown, lap and place the host sends as this player's view. Loaded and started by
// controller/game-screen.js.

import { ordinal } from '/shared/ordinal.js';
import * as kartControls from '/controller/kart/controls.js';

// `leave()` is the shell's Leave game, for the controls' door.
export function start(container, send, leave) {
  kartControls.start(container, send, { title: 'Kartwheel Mini', describeStatus, drift: false }, leave);
}

// `view` is what host/games/kart-2d/race-views.js made for this player and `player` its { name, color }
// (see kartControls.showView).
export function showView(view, player) {
  kartControls.showView(view, player);
}

export function stop() {
  kartControls.stop();
}

// A race view's phase is one of RACE_PHASES in host/games/kart-2d/race.js.
function describeStatus(view) {
  const big = view.countdown === null ? ordinal(view.place) : view.countdown === 0 ? 'GO!' : String(view.countdown);
  return { big, line: describeLine(view) };
}

function describeLine(view) {
  if (view.phase === 'results') {
    return 'Race over';
  }
  if (view.finished) {
    return 'Finished!';
  }
  return view.phase === 'countdown' ? 'Get ready!' : `Lap ${view.lap}/${view.laps}`;
}
