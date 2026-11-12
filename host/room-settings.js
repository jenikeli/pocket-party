// Room settings: a small panel under the lobby's "Room settings" button, with how long a dropped player's slot is
// held. The button opens and closes it; a click anywhere else in the lobby closes it too. Used by host/lobby.js.

import { formatMinutes } from '/host/roster.js';
import { stepGraceSeconds } from '/host/lobby-rules.js';

const panel = document.getElementById('room-settings');
const button = document.getElementById('room-settings-button');
const graceValue = document.getElementById('grace-value');

// `room.settings` holds the values. A new grace time applies to players who drop from now on; anyone already
// waiting keeps the time they were given.
export function setUpRoomSettings(room) {
  function show() {
    graceValue.textContent = formatMinutes(room.settings.graceSeconds);
  }

  function stepGrace(step) {
    room.settings.graceSeconds = stepGraceSeconds(room.settings.graceSeconds, step);
    show();
  }

  function setOpen(open) {
    panel.hidden = !open;
    button.setAttribute('aria-pressed', String(open));
  }

  button.addEventListener('click', () => setOpen(panel.hidden));
  document.getElementById('grace-minus').addEventListener('click', () => stepGrace(-1));
  document.getElementById('grace-plus').addEventListener('click', () => stepGrace(1));
  document.getElementById('lobby').addEventListener('click', (event) => {
    if (!panel.contains(event.target) && !button.contains(event.target)) {
      setOpen(false);
    }
  });
  show();
}
