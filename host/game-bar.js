// The shell's top bar (#top-bar): the settings gear top right on the game picker, and over a running game also
// "Back to games" top left and, while the game has its room open, the room code and Add players beside the
// gear. Back closes the room, so it takes two clicks: the first arms it (red), the second goes back
// (shared/confirm-click.js). A game may dock the bar as a strip along the bottom and put its own controls in
// the bar's slot. Shown by host/main.js; the game's part by host/game-session.js.

import { confirmOnSecondClick } from '/shared/confirm-click.js';

const bar = document.getElementById('top-bar');
const backButton = document.getElementById('game-back-button');
const roomCodeChip = document.getElementById('room-code-chip');
const addPlayersButton = document.getElementById('game-add-players-button');
// Where a running game puts its own controls (`bar.slot` in game.start()); empty at the top, and emptied when
// the game ends.
export const barSlot = document.getElementById('bar-slot');
let handlers = { onBack: () => {}, onAddPlayers: () => {} };
// Whether a game is running (Back to games belongs to it), kept apart from docking, which hides the button too.
let gameRunning = false;

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
  gameRunning = true;
  showBackButton();
}

// The game is over: its controls go, the slot is emptied and the bar is back at the top.
export function hideGameControls() {
  gameRunning = false;
  showRoomOpen(false);
  barSlot.replaceChildren();
  setBarDocked(false);
}

// Shown while the game has its room open to new players (its setup and results screens), hidden during a race:
// a code nobody can join with would only mislead.
export function showRoomOpen(open) {
  roomCodeChip.hidden = !open;
  addPlayersButton.hidden = !open;
}

// Docked, the bar is a strip along the bottom of the window (class `docked`, host/top-bar.css); the game's
// container is shortened to match by host/game-session.js. The strip has no Back to games (the user, after
// M10c): a game that docks the bar offers its own way back to a screen that has it (the 3D race's Back to setup).
export function setBarDocked(docked) {
  bar.classList.toggle('docked', docked);
  showBackButton();
}

// Back to games shows over a running game while the bar is at the top. Hidden with the hidden attribute rather
// than a stylesheet rule, which an iPad kept showing it past; hiding it also disarms it.
function showBackButton() {
  const shown = gameRunning && !bar.classList.contains('docked');
  backButton.hidden = !shown;
  if (!shown) {
    back.disarm();
  }
}
