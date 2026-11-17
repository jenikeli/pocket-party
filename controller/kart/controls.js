// The phone side shared by both kart races: the setup screen (colour, control style, options and ready), then the
// driving controls, shown from Ready on (still, with Back to setup, until the race starts): steering, the status
// in the middle (Leave, the player's colour and name, the race's own words) and the held buttons, laid out per
// race and steering (controller/kart/controls.css) and mirrored for Left-handed. In the 3D race with the stick and
// no auto-accelerate, a double tap on Go drifts (controller/kart/go-drift.js). On a portrait page the controls are
// drawn turned round (controller/kart/turned-layout.js). Used by controller/games/kart-2d/index.js and
// controller/games/kart-3d/index.js, which pass their own title and describeStatus and say whether they have
// Drift.

import { MESSAGE_TYPES, INPUT_KINDS, KART_BUTTONS, KART_CHOICES, KART_STEERING } from '/shared/protocol.js';
import * as buttonInput from '/controller/inputs/button.js';
import * as steering from '/controller/kart/steering.js';
import * as setupScreen from '/controller/kart/setup-screen.js';
import { kartMarkup } from '/controller/kart/markup.js';
import { ITEM_ICONS } from '/shared/item-icons.js';
import { createItemSlot } from '/controller/kart/item-slot.js';
import { createGoButton } from '/controller/kart/go-drift.js';
import { PORTRAIT_QUERY } from '/controller/kart/turned-layout.js';
import { confirmOnSecondClick } from '/shared/confirm-click.js';
import { phoneScreen, PHONE_SCREENS } from '/controller/kart/phone-screen.js';
import { icon } from '/shared/icons.js';

// The page elements, looked up by findElements() once the markup is in place.
let screen, setup, controls, accelerateButton, driftButton, goHint, bigText, lineText, playerName, backButton;
let sendMessage = null; // set by start
let hasDrift = false; // the 3D race: Drift (a button with tilt, the double tap on Go with the stick). Set by start
let itemSlot = null; // the Item button's display in the 3D race, else null. Set by start
// (view) -> { big, line }: what the middle of the controls says for a race view. Set by start.
let describeStatus = null;
let portrait = null; // the MediaQueryList for PORTRAIT_QUERY, set by start
let previousPhase = null; // the newest view's phase, to see the countdown end
let goInput = null; // (input, goDrifts, now) -> the input Go sends, through the double tap; set by start

// `race` is { title, describeStatus, drift, items }: title is the race's name for the setup screen,
// describeStatus(view) -> { big, line }, drift true for the 3D race's Drift and items true to show the Item
// button. `leave()` is the shell's Leave game, which the status column's door calls on its second tap.
export function start(container, send, race, leave) {
  container.innerHTML = kartMarkup(race.drift);
  findElements();
  sendMessage = send;
  describeStatus = race.describeStatus;
  hasDrift = race.drift;
  controls.classList.toggle('race-3d', race.drift);
  itemSlot = race.items ? createItemSlot(byId('kart-item-slot'), ITEM_ICONS) : null;
  goInput = createGoButton();
  // A long press on a held button must not open the browser's menu.
  // On the game's own element, not the container, which the shell keeps between games.
  screen.addEventListener('contextmenu', (event) => event.preventDefault());
  // Registered here, not when the module loads: the input modules are shared with the input lab, and each
  // keeps only one callback, so whichever game runs must set it again. The surface is the whole controls area,
  // whose grid holds every button. Leave has no data-button, so the button input never sends anything for it.
  buttonInput.onInput(onButtonInput);
  buttonInput.start(controls);
  confirmOnSecondClick(byId('kart-leave'), leave);
  // Not ready again: the host's next view, ready false, brings the setup screen back.
  backButton.addEventListener('click', () => sendChoice(KART_CHOICES.READY, false));
  startSteeringAndSetup(race.title);
  previousPhase = null;
  // The page turns between portrait and landscape when the phone turns with rotation lock off; the drawing
  // follows by itself (CSS), the inputs through updateTurn.
  portrait = window.matchMedia(PORTRAIT_QUERY);
  portrait.addEventListener('change', updateTurn);
  updateTurn();
}

// `view` is what the race's host side made for this player: a setup view (phase 'setup') or a race view (any
// other phase). Both carry steering, autoAccelerate and leftHanded. It is null when they have no kart (they
// joined after the race was set up) or the host has not sent one yet. `player` is { name, color } from the
// shell's CONTROLLER_STATE.
export function showView(view, player) {
  showPlayer(player);
  const shown = phoneScreen(view);
  const waiting = shown === PHONE_SCREENS.WAITING;
  setup.hidden = shown !== PHONE_SCREENS.SETUP;
  controls.hidden = shown === PHONE_SCREENS.SETUP;
  // While waiting the buttons and the stick stay still (controller/kart/status.css), so nothing is sent.
  controls.classList.toggle('waiting', waiting);
  backButton.hidden = !waiting;
  updateTurn();
  // GO: the countdown is over (both races name the phase 'countdown'), and the player is holding the phone
  // the way they mean as straight ahead (steering.recenterTilt).
  if (previousPhase === 'countdown' && view?.phase !== 'countdown') {
    steering.recenterTilt();
  }
  previousPhase = view?.phase ?? null;
  if (!view) {
    bigText.textContent = '';
    lineText.textContent = 'Waiting for the next race';
    return;
  }
  steering.show(view.steering);
  if (view.phase === 'setup') {
    setupScreen.show(view);
  }
  if (shown === PHONE_SCREENS.SETUP) {
    return;
  }
  showLayout(view);
  if (waiting) {
    // The setup view has no items yet, so the 3D race's Item shows empty.
    itemSlot?.show({ held: null, effects: [] });
    bigText.innerHTML = `${icon('check')}Ready`;
    lineText.textContent = 'Waiting for the race to start';
    return;
  }
  itemSlot?.show(view.item);
  const status = describeStatus(view);
  bigText.textContent = status.big;
  lineText.textContent = status.line;
}

// The shell empties the container afterwards, which takes the elements and their listeners with it.
export function stop() {
  portrait.removeEventListener('change', updateTurn);
  steering.stop();
  buttonInput.stop();
  itemSlot?.stop();
}

function byId(id) {
  return document.getElementById(id);
}

// The elements this module changes itself, once the markup is in place.
function findElements() {
  screen = byId('kart-screen');
  setup = byId('kart-setup');
  controls = byId('kart-controls');
  accelerateButton = byId('kart-accelerate');
  driftButton = byId('kart-drift');
  goHint = byId('kart-go-hint');
  bigText = byId('kart-big');
  lineText = byId('kart-line');
  playerName = byId('kart-me-name');
  backButton = byId('kart-back');
}

// Starts the steering (controller/kart/steering.js) and the setup screen (setup-screen.js) on their elements.
function startSteeringAndSetup(title) {
  const steeringElements = {
    stickZone: byId('kart-stick-zone'),
    stickRing: byId('kart-stick-ring'),
    stickKnob: byId('kart-stick-knob'),
    steerAmount: byId('kart-steer-amount'),
    tiltZone: byId('kart-tilt-zone'),
    wheel: byId('kart-wheel'),
    enableTiltButton: byId('kart-enable-tilt'),
    recenterButton: byId('kart-recenter'),
    note: byId('kart-steering-note'),
  };
  steering.start(steeringElements, { sendChoice, sendInput });
  setupScreen.start(title, sendChoice);
}

// The player's colour edges the controls and dots the status chip (controls.css reads --kart-player-color).
function showPlayer(player) {
  screen.style.setProperty('--kart-player-color', player.color);
  playerName.textContent = player.name;
}

// Which buttons show and where (controls.css): the layout follows the steering the phone shows, auto-accelerate
// and left-handed. Drift is the Drift button with tilt or with auto-accelerate, and the double tap on Go with the
// stick when the player presses Go themselves.
function showLayout(view) {
  const tilt = steering.current() === KART_STEERING.TILT;
  const goDrifts = hasDrift && !tilt && !view.autoAccelerate;
  controls.classList.toggle('tilt', tilt);
  controls.classList.toggle('auto-accelerate', view.autoAccelerate);
  controls.classList.toggle('left-handed', view.leftHanded);
  driftButton.hidden = !hasDrift || goDrifts;
  goHint.hidden = !goDrifts;
  // With auto-accelerate the kart drives unless braking, so there is no Go button (with the stick, Drift takes
  // its place).
  accelerateButton.hidden = view.autoAccelerate;
  // The 3D race's drift shows its spark colour on whichever button drifts (styled by data-spark), so a player can
  // see the level without looking up at the host screen.
  const spark = view.spark ?? '';
  accelerateButton.dataset.spark = goDrifts ? spark : '';
  driftButton.dataset.spark = goDrifts ? '' : spark;
}

// The controls are drawn turned round while they show on a portrait page (controller/kart/controls.css).
function updateTurn() {
  steering.setTurned(portrait.matches && !controls.hidden);
}

function sendInput(input) {
  sendMessage({ type: MESSAGE_TYPES.INPUT, input, sentAt: Date.now() });
}

function sendChoice(choice, value) {
  sendInput({ kind: INPUT_KINDS.CHOICE, choice, value });
}

// Go also drifts while its hint shows (the 3D race with the stick, without auto-accelerate).
function onButtonInput(input) {
  const isGo = input.button === KART_BUTTONS.ACCELERATE;
  sendInput(isGo ? goInput(input, !goHint.hidden, performance.now()) : input);
  controls.querySelector(`[data-button="${input.button}"]`)?.classList.toggle('held', input.pressed);
}
