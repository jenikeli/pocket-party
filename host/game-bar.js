// The shell's buttons over a running game, bottom right: "Add players" (only while the game has the room open),
// "End game" and "Close room". End game and Close room ask first: the first click arms the button and a second
// click within 3 s does it (host/confirm-click.js). Used by host/game-session.js.

import { confirmButton } from '/host/confirm-click.js';

const bar = document.getElementById('game-bar');
const addPlayersButton = document.getElementById('game-add-players-button');
let handlers = { onAddPlayers: () => {}, onEndGame: () => {}, onCloseRoom: () => {} };

addPlayersButton.addEventListener('click', () => handlers.onAddPlayers());
const endButton = confirmButton(document.getElementById('end-game-button'), 'End it?', () => handlers.onEndGame());
const closeButton = confirmButton(document.getElementById('close-room-button'), 'Close it?', () =>
  handlers.onCloseRoom(),
);

// `onAddPlayers()` runs on a click, `onEndGame()` and `onCloseRoom()` on a confirmed click.
export function showGameBar(newHandlers) {
  handlers = newHandlers;
  bar.hidden = false;
}

export function hideGameBar() {
  bar.hidden = true;
  addPlayersButton.hidden = true;
  endButton.disarm();
  closeButton.disarm();
}

// Shown while the room is open to new players (a game's setup and results screens), hidden during a race.
export function showAddPlayersButton(shown) {
  addPlayersButton.hidden = !shown;
}
