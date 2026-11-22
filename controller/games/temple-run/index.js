// The phone side of Temple Chase, a game module: a full-height swipe pad (up jump, down slide, left and right
// change lane or turn a corner), a big arrow when a corner is near, chips for role, lives, coins and the active
// powerup, and one button below the pad: Ready in the lobby, Revive during a run. A downed runner sees the revive
// screen. Loaded and started by controller/game-screen.js.

import { MESSAGE_TYPES, INPUT_KINDS, TEMPLE_CHOICES } from '/shared/protocol.js';
import * as swipeInput from '/controller/inputs/swipe.js';
import { templeIcon } from '/shared/temple-icons.js';

// The button sits outside the pad: the pad captures the pointer for swipes, which would swallow a tap on it.
// Everything built with innerHTML below is made from constant icons and numbers; text from the host goes in
// through textContent.
const MARKUP = `
  <div id="tr-pad">
    <div id="tr-top"><span id="tr-role" class="tr-chip"></span><span id="tr-stats"></span></div>
    <div id="tr-center">
      <p id="tr-turn" hidden></p>
      <div id="tr-badge" aria-hidden="true"></div>
      <p id="tr-big"></p>
      <p id="tr-sub"></p>
    </div>
    <div id="tr-hint">
      <span>${templeIcon('arrow-up')}Jump</span><span>${templeIcon('arrow-down')}Slide</span>
      <span>${templeIcon('arrow-left')}${templeIcon('arrow-right')}Lane and turn</span>
    </div>
  </div>
  <button type="button" id="tr-action" class="pp-button pp-primary pp-big" hidden></button>`;

const POWERS = { boost: ['bolt', 'Boost'], shield: ['shield', 'Shield'], magnet: ['magnet', 'Magnet'] };

let sendMessage = null;
let currentView = null;
let pad, role, stats, turn, badge, big, sub, hint, action;

export function start(container, send) {
  container.innerHTML = MARKUP;
  const byId = (id) => document.getElementById(id);
  [pad, role, stats, turn, badge, big, sub, hint, action] =
    ['tr-pad', 'tr-role', 'tr-stats', 'tr-turn', 'tr-badge', 'tr-big', 'tr-sub', 'tr-hint', 'tr-action'].map(byId);
  sendMessage = send;
  // Registered here: input modules keep one callback each, so whichever game runs sets it again.
  swipeInput.onInput(sendInput);
  swipeInput.start(pad);
  action.addEventListener('click', onActionClick);
}

export function stop() {
  swipeInput.stop();
  currentView = null;
}

function heartsHtml(view) {
  return Array.from({ length: view.maxLives }, (unused, index) =>
    `<span class="${index < view.lives ? 'tr-heart' : 'tr-heart-lost'}">${templeIcon(index < view.lives ? 'heart' : 'heart-empty')}</span>`).join('');
}

function statsHtml(view) {
  const power = view.power ? `<span class="tr-chip tr-power">${templeIcon(POWERS[view.power.kind][0])}${view.power.secs}</span>` : '';
  return `${heartsHtml(view)}<span class="tr-chip tr-coins">${templeIcon('coin')}${view.coins}</span><span class="tr-chip">${view.meters} m</span>${power}`;
}

// `view` is what host/games/temple-run/views.js made for this player.
export function showView(view) {
  currentView = view;
  const isChaser = view.role === 'chaser';
  const running = view.phase === 'run' && view.status === 'alive';
  pad.dataset.role = view.phase === 'lobby' ? 'lobby' : view.role;
  role.innerHTML = view.phase === 'lobby' ? '' : `${templeIcon(isChaser ? 'monkey' : 'runner')}${isChaser ? 'Monkey' : 'Runner'}`;
  role.hidden = view.phase === 'lobby';
  stats.innerHTML = view.phase === 'run' ? statsHtml(view) : '';
  hint.hidden = !running;
  turn.hidden = !(running && view.turn);
  turn.innerHTML = view.turn ? `${templeIcon(`turn-${view.turn}`)}<span>Turn ${view.turn}</span>` : '';
  action.hidden = true;

  if (view.phase === 'lobby') {
    showLobby(view);
  } else if (view.phase === 'countdown') {
    setMessage(String(view.countdown), isChaser ? 'You are the monkey. Catch the runners' : 'Run. Grab coins, keep out of the monkey\'s lane', isChaser ? 'monkey' : 'runner');
  } else if (view.status === 'down') {
    setMessage('You\'re down', `A teammate can revive you for ${view.reviveCost} coins: ${view.reviveLeft} s`, 'skull');
  } else if (view.status === 'out') {
    setMessage(view.maxLives > 0 && view.lives <= 0 ? 'Game over' : 'You\'re out', 'Watch the screen', 'skull');
  } else {
    setMessage('', '', null);
    showRevive(view);
  }
}

function showLobby(view) {
  const result = view.result ? `Last round: ${view.result.meters} m, ${view.result.coins} coins. ` : '';
  setMessage('Temple Chase', `${result}${view.readyCount} of ${view.playerCount} ready`, 'monkey');
  action.hidden = false;
  action.disabled = false;
  action.classList.toggle('tr-ready', view.ready);
  action.innerHTML = `${templeIcon('ready')}<span>${view.ready ? 'Ready. Tap to undo' : 'Ready'}</span>`;
}

// One Revive button for the first downed teammate; the host revives that one if the team has the coins.
function showRevive(view) {
  if (view.downed.length > 0) {
    action.hidden = false;
    action.disabled = view.coins < view.reviveCost;
    action.classList.remove('tr-ready');
    action.innerHTML = `${templeIcon('heart')}<span></span><span class="tr-cost">${templeIcon('coin')}${view.reviveCost}</span>`;
    action.children[1].textContent = `Revive ${view.downed[0].name}`;
  }
}

function setMessage(bigText, subText, iconName) {
  badge.innerHTML = iconName ? templeIcon(iconName) : '';
  big.textContent = bigText;
  sub.textContent = subText;
}

function onActionClick() {
  if (currentView.phase === 'lobby') {
    sendChoice(TEMPLE_CHOICES.READY, !currentView.ready);
  } else if (currentView.downed?.length > 0) {
    sendChoice(TEMPLE_CHOICES.REVIVE, currentView.downed[0].id);
  }
}

function sendChoice(choice, value) {
  sendInput({ kind: INPUT_KINDS.CHOICE, choice, value });
}

function sendInput(input) {
  sendMessage({ type: MESSAGE_TYPES.INPUT, input, sentAt: Date.now() });
}
