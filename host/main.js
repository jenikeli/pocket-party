// Host entry point: fits the stage to the screen, stops zooming, draws the shell's icons and shows Tap to start;
// the tap brings up the game picker. Loaded by host/index.html. The shell is plain HTML (host/game-picker.js and
// the screens it opens); games are modules in host/games/ that the picker starts through host/game-session.js,
// each in a room of its own, and only the games that draw with Phaser load it.

import { keepStageFitted } from '/host/stage.js';
import { icon } from '/shared/icons.js';
import { createGamePicker } from '/host/game-picker.js';
import { showTapToStart, hideTapToStart } from '/host/tap-to-start.js';
import { showTopBar } from '/host/game-bar.js';
import { setUpSettings } from '/host/settings.js';
import { preloadPictures } from '/host/pictures.js';
import { GAMES } from '/host/games/index.js';

keepStageFitted();
// iPad Safari ignores the viewport's user-scalable=no and pinches anyway; its own gesture event can be stopped.
document.addEventListener('gesturestart', (event) => event.preventDefault());

// host/index.html marks where an icon goes with data-icon="<name>" (a name from shared/icons.js).
for (const element of document.querySelectorAll('[data-icon]')) {
  element.innerHTML = icon(element.dataset.icon);
}

const picker = createGamePicker();
setUpSettings();

// The picker's pictures start loading now, while Tap to start shows, so it never appears half drawn.
const pickerPictures = GAMES.flatMap((game) => [game.cover, game.background]).filter(Boolean);
const picturesLoaded = preloadPictures(pickerPictures);

showTapToStart(async () => {
  await picturesLoaded;
  hideTapToStart();
  showTopBar();
  picker.show(null);
});
