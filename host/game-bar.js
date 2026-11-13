// The shell's buttons over a running game, bottom right: "Add players" (only while the game has the room open),
// "End game" and "Close room". End game and Close room take two clicks: the first arms the button (red), the
// second does it (shared/confirm-click.js). Used by host/game-session.js.

import { confirmOnSecondClick } from '/shared/confirm-click.js';

const bar = document.getElementById('game-bar');
const addPlayersButton = document.getElementById('game-add-players-button');
let handlers = { onAddPlayers: () => {}, onEndGame: () => {}, onCloseRoom: () => {} };

addPlayersButton.addEventListener('click', () => handlers.onAddPlayers());
const endButton = confirmOnSecondClick(document.getElementById('end-game-button'), () => handlers.onEndGame());
const closeButton = confirmOnSecondClick(document.getElementById('close-room-button'), () => handlers.onCloseRoom());

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
