// The phone side shared by both kart races: the setup screen (control style and ready), then the controls
// (steering on the left, held brake and accelerate buttons on the right, plus Drift in the 3D race) and a
// status in the middle that each race words itself. Used by controller/games/kart-2d/index.js and
// controller/games/kart-3d/index.js, which pass their own describeStatus and say whether they have Drift.

import { MESSAGE_TYPES, INPUT_KINDS } from '/shared/protocol.js';
import * as buttonInput from '/controller/inputs/button.js';
import * as steering from '/controller/kart/steering.js';
import * as setupScreen from '/controller/kart/setup-screen.js';
import { MARKUP } from '/controller/kart/markup.js';

// The page elements, looked up by start() once MARKUP is in place.
let setup, controls, pedals, accelerateButton, driftButton, bigText, lineText;
let sendMessage = null; // set by start
// (view) -> { big, line }: what the middle of the controls says for a race view. Set by start.
let describeStatus = null;

// `race` is { describeStatus, drift }: describeStatus(view) -> { big, line }, and drift true to show the Drift
// button (the 3D race).
export function start(container, send, race) {
  container.innerHTML = MARKUP;
  const byId = (id) => document.getElementById(id);
  setup = byId('kart-setup');
  controls = byId('kart-controls');
  pedals = byId('kart-pedals');
  accelerateButton = byId('kart-accelerate');
  driftButton = byId('kart-drift');
  bigText = byId('kart-big');
  lineText = byId('kart-line');
  sendMessage = send;
  describeStatus = race.describeStatus;
  // With Drift the buttons become a grid (controller/kart/style.css), with the Item button's place kept free.
  pedals.classList.toggle('with-drift', race.drift);
  driftButton.hidden = !race.drift;
  byId('kart-item-slot').hidden = !race.drift;
  // A long press on a held button must not open the browser's menu.
  // On the game's own element, not the container, which the shell keeps between games.
  byId('kart-screen').addEventListener('contextmenu', (event) => event.preventDefault());
  // Registered here, not when the module loads: the input modules are shared with the input lab, and each
  // keeps only one callback, so whichever game runs must set it again.
  buttonInput.onInput(onButtonInput);
  buttonInput.start(pedals);
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
  setupScreen.start({ setup, laps: byId('kart-setup-laps'), readyButton: byId('kart-ready-button') }, sendChoice);
}

// `view` is what the race's host side made for this player: a setup view (phase 'setup') or a race view (any
// other phase). Both carry steering and autoAccelerate. It is null when they have no kart (they joined after
// the race was set up) or the host has not sent one yet.
export function showView(view) {
  const onSetup = view?.phase === 'setup';
  setup.hidden = !onSetup;
  controls.hidden = onSetup;
  if (!view) {
    bigText.textContent = '';
    lineText.textContent = 'Waiting for the next race';
    return;
  }
  steering.show(view.steering);
  if (onSetup) {
    setupScreen.show(view);
    return;
  }
  // With auto-accelerate the kart drives unless braking, so there is no Go button.
  accelerateButton.hidden = view.autoAccelerate;
  pedals.classList.toggle('auto-accelerate', view.autoAccelerate);
  // The 3D race's drift shows its spark colour on the button (styled by data-spark), so a player can see the
  // level without looking up at the host screen.
  driftButton.dataset.spark = view.spark ?? '';
  const status = describeStatus(view);
  bigText.textContent = status.big;
  lineText.textContent = status.line;
}

// The shell empties the container afterwards, which takes the elements and their listeners with it.
export function stop() {
  steering.stop();
  buttonInput.stop();
}

function sendInput(input) {
  sendMessage({ type: MESSAGE_TYPES.INPUT, input, sentAt: Date.now() });
}

function sendChoice(choice, value) {
  sendInput({ kind: INPUT_KINDS.CHOICE, choice, value });
}

function onButtonInput(input) {
  sendInput(input);
  pedals.querySelector(`[data-button="${input.button}"]`)?.classList.toggle('held', input.pressed);
}
