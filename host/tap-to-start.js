// The host page's first screen: "Pocket Party" and one button. Browsers allow full screen, a wake lock (on
// some) and sound only from a tap, so everything that needs one happens on this tap, and the room is created
// after it. Used by host/main.js.

import { keepScreenAwake } from '/shared/wake-lock.js';
import { unlockAudio } from '/host/audio/audio.js';

const screen = document.getElementById('tap-to-start');
const button = document.getElementById('tap-to-start-button');

// `onStart()` runs once, on the tap, after the unlocks; the screen stays until hideTapToStart(), so the button
// reads "Starting..." while the room is being created.
export function showTapToStart(onStart) {
  button.addEventListener(
    'click',
    () => {
      button.disabled = true;
      button.textContent = 'Starting...';
      // Called before anything else, while the browser still counts this as the tap.
      goFullScreen();
      // A Web Audio context starts only from a tap too; the game sounds and the music play through it.
      unlockAudio();
      // Nobody touches the host during a game, so without this it would dim and lock part way through. Asked for
      // here, inside the tap, because some browsers grant the lock only during one; the wake-lock module asks
      // again whenever the page comes back into view.
      const wakeStatus = document.getElementById('wake-status');
      keepScreenAwake((status) => (wakeStatus.textContent = `Screen awake: ${status}`));
      onStart();
    },
    { once: true },
  );
}

export function hideTapToStart() {
  screen.hidden = true;
}

// Full screen is optional: iPhone Safari has none, and a browser may refuse (in a frame, for instance). The
// older Safari on iPads has only the webkit-prefixed name.
function goFullScreen() {
  const page = document.documentElement;
  const request = page.requestFullscreen ?? page.webkitRequestFullscreen;
  if (!request) {
    console.info('Full screen is not available in this browser');
    return;
  }
  // The prefixed one returns nothing rather than a promise; Promise.resolve covers both.
  Promise.resolve(request.call(page)).catch((error) => console.warn('Full screen was refused:', error));
}
