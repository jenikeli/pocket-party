// The shell's top bar (#top-bar): the settings gear top right on the game picker, and over a running game also
// the back arrow top left and, while the game has its room open, the room code and the add-players icon beside
// the gear. Back closes the room, so it takes two clicks: the first arms it (red), the second goes back
// (shared/confirm-click.js). Shown by host/main.js; the game's part by host/game-session.js.

import { confirmOnSecondClick } from '/shared/confirm-click.js';

const bar = document.getElementById('top-bar');
const backButton = document.getElementById('game-back-button');
const roomCodeChip = document.getElementById('room-code-chip');
const addPlayersButton = document.getElementById('game-add-players-button');
let handlers = { onBack: () => {}, onAddPlayers: () => {} };

addPlayersButton.addEventListener('click', () => handlers.onAddPlayers());
const back = confirmOnSecondClick(backButton, () => handlers.onBack());

// Once, after Tap to start: the gear is there from the picker on.
export function showTopBar() {
  bar.hidden = false;
}

// `onBack()` runs on a confirmed click, `onAddPlayers()` on a click. The room code and add players stay hidden
// until showRoomOpen(true).
export function showGameControls({ roomCode, onBack, onAddPlayers }) {
  handlers = { onBack, onAddPlayers };
  roomCodeChip.textContent = roomCode;
  backButton.hidden = false;
}

export function hideGameControls() {
  back.disarm();
  backButton.hidden = true;
  showRoomOpen(false);
}

// Shown while the game has its room open to new players (its setup and results screens), hidden during a race:
// a code nobody can join with would only mislead.
export function showRoomOpen(open) {
  roomCodeChip.hidden = !open;
  addPlayersButton.hidden = !open;
}
