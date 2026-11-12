// The phone side of the 2D race, a game module: the shared kart controls (controller/kart/controls.js), with
// the countdown, lap and place the host sends as this player's view. Loaded and started by
// controller/game-screen.js.

import { ordinal } from '/shared/ordinal.js';
import * as kartControls from '/controller/kart/controls.js';

export function start(container, send) {
  kartControls.start(container, send, { title: 'Kart race 2D', describeStatus, drift: false });
}

// `view` is what host/games/kart-2d/race-views.js made for this player (see kartControls.showView).
export function showView(view) {
  kartControls.showView(view);
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
