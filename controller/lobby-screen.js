// The controller's lobby screen: who this phone plays as (name and color, as the host decided) and the
// ready button. Used by controller/main.js, which passes in each CONTROLLER_STATE from the host.

const playerSwatch = document.getElementById('player-swatch');
const playerLabel = document.getElementById('player-label');
const readyButton = document.getElementById('ready-button');
const lobbyHint = document.getElementById('lobby-hint');

let isReady = false;
let readyCallback = () => {};

// `state` is { name, color, ready } from a CONTROLLER_STATE message.
export function showLobbyState(state) {
  isReady = state.ready === true;
  playerSwatch.style.background = state.color;
  playerLabel.textContent = `Connected as ${state.name}`;
  readyButton.textContent = isReady ? 'Not ready' : "I'm ready";
  readyButton.setAttribute('aria-pressed', String(isReady));
  lobbyHint.textContent = isReady ? 'Waiting for everyone else...' : 'Tap when you are ready to play.';
}

// Shown between JOINED and the host's first CONTROLLER_STATE.
export function showConnectedPlaceholder() {
  playerLabel.textContent = 'Connected. Waiting for the host...';
  lobbyHint.textContent = '';
}

// callback(wantsReady) runs when the player taps the button. The button only changes once the host answers
// with a new CONTROLLER_STATE: the host decides whether the player is ready.
export function onReadyChange(callback) {
  readyCallback = callback;
}

readyButton.addEventListener('click', () => readyCallback(!isReady));
