// Settings (#settings): a small panel under the top bar's gear (above it while a game has the bar docked), with
// the music and effects volumes and how long a dropped player's slot is held. The gear opens and closes it, on
// the game picker and over a game alike; a
// press anywhere else closes it. Set up once by host/main.js.

import { formatMinutes } from '/host/roster.js';
import { browserStorage, readGraceSeconds, storeGraceSeconds, stepGraceSeconds } from '/host/shell-rules.js';
import { getVolume, setVolume } from '/host/audio/audio.js';

const panel = document.getElementById('settings');
const button = document.getElementById('settings-button');
const graceValue = document.getElementById('grace-value');

// The hold time is kept in this browser's storage, like the volumes (host/audio/audio.js): rooms last one game
// each, so it cannot live in a room. A new time applies to players who drop from now on; anyone already
// waiting keeps the time they were given (host/room.js reads it at each drop).
export function setUpSettings() {
  const storage = browserStorage();

  function showGrace() {
    graceValue.textContent = formatMinutes(readGraceSeconds(storage));
  }

  function stepGrace(step) {
    storeGraceSeconds(storage, stepGraceSeconds(readGraceSeconds(storage), step));
    showGrace();
  }

  function setOpen(open) {
    panel.hidden = !open;
    button.setAttribute('aria-pressed', String(open));
  }

  // The sliders hold 0 to 100; audio.js keeps each volume as 0 to 1 and remembers it between visits.
  for (const kind of ['music', 'effects']) {
    const slider = document.getElementById(`${kind}-volume`);
    slider.value = Math.round(getVolume(kind) * 100);
    slider.addEventListener('input', () => setVolume(kind, slider.value / 100));
  }

  button.addEventListener('click', () => setOpen(panel.hidden));
  document.getElementById('grace-minus').addEventListener('click', () => stepGrace(-1));
  document.getElementById('grace-plus').addEventListener('click', () => stepGrace(1));
  // pointerdown in the capture phase, as shared/confirm-click.js does, so a press on a game's canvas closes it
  // too, whatever the canvas does with the press.
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) {
        setOpen(false);
      }
    },
    true,
  );
  showGrace();
}
