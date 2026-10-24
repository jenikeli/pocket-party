// The phone side of the 3D race, for now the test drive, a game module: the shared kart controls
// (controller/kart/controls.js) with the Drift button. The middle of the controls shows the countdown and, for
// a moment after GO, how the start went. Loaded and started by controller/game-screen.js.

import * as kartControls from '/controller/kart/controls.js';

const START_TEXT = { rocket: 'Rocket start!', stall: 'Too early: stalled' };

export function start(container, send) {
  kartControls.start(container, send, { describeStatus, drift: true });
}

// `view` is what host/games/kart-3d/drive-views.js made for this player (see kartControls.showView).
export function showView(view) {
  kartControls.showView(view);
}

export function stop() {
  kartControls.stop();
}

// view.countdown is 3, 2, 1, 0 (GO) or null; view.start is 'rocket', 'stall', 'normal' or null.
function describeStatus(view) {
  const big = view.countdown === null ? '' : view.countdown === 0 ? 'GO!' : String(view.countdown);
  return { big, line: START_TEXT[view.start] ?? 'Test drive' };
}
