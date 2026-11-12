// The controller's lobby screen: who this phone plays as (name and color, as the host decided), where to look,
// and a way to change the name. There is no ready button: the host picks the game on the big screen, and the
// game's own setup screen is where players get ready. Used by controller/main.js, which passes in each
// CONTROLLER_STATE from the host.

const playerSwatch = document.getElementById('player-swatch');
const playerLabel = document.getElementById('player-label');
const lobbyHint = document.getElementById('lobby-hint');
const changeNameButton = document.getElementById('change-name-button');
const changeNameForm = document.getElementById('change-name-form');
const changeNameInput = document.getElementById('change-name-input');

let nameChangeCallback = () => {};
let currentName = '';

// `state` is { name, color } from a CONTROLLER_STATE message.
// The host re-sends the state whenever anything about the player changes, so the name field is closed only when
// the name itself changed: otherwise a re-send would throw away what the player is typing.
export function showLobbyState(state) {
  if (state.name !== currentName) {
    hideNameField();
  }
  currentName = state.name;
  playerSwatch.style.background = state.color;
  playerLabel.textContent = state.name;
  lobbyHint.textContent = 'You are in. The game is picked on the big screen.';
}

// Shown between JOINED and the host's first CONTROLLER_STATE.
export function showConnectedPlaceholder() {
  playerLabel.textContent = 'Connected';
  lobbyHint.textContent = 'Waiting for the host...';
}

// callback(name) runs when the player saves a new name. The label only changes once the host answers with a
// new CONTROLLER_STATE: the host cleans the name (length, duplicates) and decides what it is.
export function onNameChange(callback) {
  nameChangeCallback = callback;
}

function showNameField() {
  changeNameInput.value = currentName;
  changeNameButton.hidden = true;
  changeNameForm.hidden = false;
  changeNameInput.focus();
}

function hideNameField() {
  changeNameButton.hidden = false;
  changeNameForm.hidden = true;
}

changeNameButton.addEventListener('click', showNameField);

changeNameForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = changeNameInput.value.trim();
  changeNameInput.blur();
  hideNameField();
  if (name !== '' && name !== currentName) {
    nameChangeCallback(name);
  }
});
