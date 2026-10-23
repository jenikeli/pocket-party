// The shell's two buttons over a running game: "End game" and "Close room". They are HTML, not canvas,
// because the shell's canvas is hidden while a game runs. Like the canvas confirm buttons (host/buttons.js),
// the first click only arms a button and a second click within 3 s does it. Used by host/game-session.js.

const CONFIRM_WINDOW_MS = 3000;

const bar = document.getElementById('game-bar');
let handlers = { onEndGame: () => {}, onCloseRoom: () => {} };

// `onEndGame()` and `onCloseRoom()` run on a confirmed click.
export function showGameBar(newHandlers) {
  handlers = newHandlers;
  bar.hidden = false;
}

export function hideGameBar() {
  bar.hidden = true;
  disarmEndButton();
  disarmCloseButton();
}

// Returns the button's disarm function.
function makeConfirmButton(id, confirmLabel, onConfirm) {
  const button = document.getElementById(id);
  const label = button.textContent;
  let disarmTimer = null;

  function disarm() {
    clearTimeout(disarmTimer);
    disarmTimer = null;
    button.textContent = label;
    button.classList.remove('armed');
  }

  button.addEventListener('click', () => {
    if (disarmTimer === null) {
      button.textContent = confirmLabel;
      button.classList.add('armed');
      disarmTimer = setTimeout(disarm, CONFIRM_WINDOW_MS);
      return;
    }
    disarm();
    onConfirm();
  });
  return disarm;
}

const disarmEndButton = makeConfirmButton('end-game-button', 'End it?', () => handlers.onEndGame());
const disarmCloseButton = makeConfirmButton('close-room-button', 'Close it?', () => handlers.onCloseRoom());
