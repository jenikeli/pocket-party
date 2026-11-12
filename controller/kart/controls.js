// The phone side shared by both kart races: the setup screen (control style and ready), then the controls
// (steering on the left, held brake and accelerate buttons on the right, plus Drift in the 3D race) and a
// status in the middle that each race words itself. On a portrait page the controls are drawn turned round
// (controller/kart/turned-layout.js). Used by controller/games/kart-2d/index.js and
// controller/games/kart-3d/index.js, which pass their own title and describeStatus and say whether they have Drift.

import { MESSAGE_TYPES, INPUT_KINDS, KART_STEERING } from '/shared/protocol.js';
import * as buttonInput from '/controller/inputs/button.js';
import * as steering from '/controller/kart/steering.js';
import * as setupScreen from '/controller/kart/setup-screen.js';
import { MARKUP } from '/controller/kart/markup.js';
import { ITEM_ICONS } from '/shared/item-icons.js';
import { createItemSlot } from '/controller/kart/item-slot.js';
import { PORTRAIT_QUERY } from '/controller/kart/turned-layout.js';

// The page elements, looked up by start() once MARKUP is in place.
let setup, controls, accelerateButton, driftButton, bigText, lineText;
let sendMessage = null; // set by start
let itemSlot = null; // the Item button's display in the 3D race, else null. Set by start
// (view) -> { big, line }: what the middle of the controls says for a race view. Set by start.
let describeStatus = null;
let portrait = null; // the MediaQueryList for PORTRAIT_QUERY, set by start
let previousPhase = null; // the newest view's phase, to see the countdown end

// `race` is { title, describeStatus, drift, items }: title is the race's name for the setup screen,
// describeStatus(view) -> { big, line }, drift true to show the Drift button and items true to show the Item
// button (the 3D race).
export function start(container, send, race) {
  container.innerHTML = MARKUP;
  const byId = (id) => document.getElementById(id);
  setup = byId('kart-setup');
  controls = byId('kart-controls');
  accelerateButton = byId('kart-accelerate');
  driftButton = byId('kart-drift');
  bigText = byId('kart-big');
  lineText = byId('kart-line');
  sendMessage = send;
  describeStatus = race.describeStatus;
  // With Drift the buttons join the controls' grid (controller/kart/controls.css), the Item button's place too.
  controls.classList.toggle('with-drift', race.drift);
  driftButton.hidden = !race.drift;
  itemSlot = race.items ? createItemSlot(byId('kart-item-slot'), ITEM_ICONS) : null;
  // A long press on a held button must not open the browser's menu.
  // On the game's own element, not the container, which the shell keeps between games.
  byId('kart-screen').addEventListener('contextmenu', (event) => event.preventDefault());
  // Registered here, not when the module loads: the input modules are shared with the input lab, and each
  // keeps only one callback, so whichever game runs must set it again. The surface is the whole controls area:
  // in the 3D race the buttons are laid out on its grid (the pedals element has display: contents, so no box of
  // its own to capture fingers on), and with tilt Drift sits on the left.
  buttonInput.onInput(onButtonInput);
  buttonInput.start(controls);
  const steeringElements = {
    stickZone: byId('kart-stick-zone'),
    stickKnob: byId('kart-stick-knob'),
    tiltZone: byId('kart-tilt-zone'),
    wheel: byId('kart-wheel'),
    enableTiltButton: byId('kart-enable-tilt'),
    recenterButton: byId('kart-recenter'),
    note: byId('kart-steering-note'),
  };
  steering.start(steeringElements, { sendChoice, sendInput });
  const setupElements = {
    setup,
    game: byId('kart-setup-game'),
    title: byId('kart-setup-title'),
    laps: byId('kart-setup-laps'),
    readyButton: byId('kart-ready-button'),
  };
  setupScreen.start(setupElements, race.title, sendChoice);
  previousPhase = null;
  // The page turns between portrait and landscape when the phone turns with rotation lock off; the drawing
  // follows by itself (CSS), the inputs through updateTurn.
  portrait = window.matchMedia(PORTRAIT_QUERY);
  portrait.addEventListener('change', updateTurn);
  updateTurn();
}

// `view` is what the race's host side made for this player: a setup view (phase 'setup') or a race view (any
// other phase). Both carry steering and autoAccelerate. It is null when they have no kart (they joined after
// the race was set up) or the host has not sent one yet.
export function showView(view) {
  const onSetup = view?.phase === 'setup';
  setup.hidden = !onSetup;
  controls.hidden = onSetup;
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
  // The 3D race moves Drift to the left with tilt: the layout follows the steering the phone shows.
  controls.classList.toggle('tilt', steering.current() === KART_STEERING.TILT);
  if (onSetup) {
    setupScreen.show(view);
    return;
  }
  // With auto-accelerate the kart drives unless braking, so there is no Go button.
  accelerateButton.hidden = view.autoAccelerate;
  controls.classList.toggle('auto-accelerate', view.autoAccelerate);
  // The 3D race's drift shows its spark colour on the button (styled by data-spark), so a player can see the
  // level without looking up at the host screen.
  driftButton.dataset.spark = view.spark ?? '';
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

function onButtonInput(input) {
  sendInput(input);
  controls.querySelector(`[data-button="${input.button}"]`)?.classList.toggle('held', input.pressed);
}
