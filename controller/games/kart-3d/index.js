// The phone side of the 3D race, a game module: the shared kart controls (controller/kart/controls.js) with the
// Drift and Item buttons. The middle of the controls shows the countdown, then the place, with a line for the lap, how
// the start went (for a moment after GO), the final lap and the finish. Loaded and started by
// controller/game-screen.js.

import { ordinal } from '/shared/ordinal.js';
import * as kartControls from '/controller/kart/controls.js';

const START_TEXT = { rocket: 'Rocket start!', stall: 'Too early: stalled' };

export function start(container, send) {
  kartControls.start(container, send, { title: 'Kart race 3D', describeStatus, drift: true, items: true });
}

// `view` is what host/games/kart-3d/race-views.js made for this player (see kartControls.showView).
export function showView(view) {
  kartControls.showView(view);
}

export function stop() {
  kartControls.stop();
}

// A race view's phase is one of RACE_PHASES in host/games/kart-3d/race.js. view.countdown is 3, 2, 1, 0 (GO)
// or null; view.start is 'rocket', 'stall', 'normal' or null.
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
  if (view.phase === 'countdown') {
    return 'Get ready!';
  }
  return START_TEXT[view.start] ?? (view.finalLap ? 'Final lap!' : `Lap ${view.lap}/${view.laps}`);
}
