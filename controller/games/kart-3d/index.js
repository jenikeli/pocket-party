// The phone side of the 3D race, for now the M6b test drive, a game module: the shared kart controls
// (controller/kart/controls.js). The test drive has no countdown, laps or places, so the middle of the controls
// only says what it is. Loaded and started by controller/game-screen.js.

import * as kartControls from '/controller/kart/controls.js';

export function start(container, send) {
  kartControls.start(container, send, describeStatus);
}

// `view` is what host/games/kart-3d/drive-views.js made for this player (see kartControls.showView).
export function showView(view) {
  kartControls.showView(view);
}

export function stop() {
  kartControls.stop();
}

function describeStatus() {
  return { big: '', line: 'Test drive' };
}
