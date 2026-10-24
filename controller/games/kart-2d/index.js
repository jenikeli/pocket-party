// The phone side of the 2D race, a game module: the setup screen (control style and ready), then the controls
// (steering on the left, held brake and accelerate buttons on the right) and the countdown, lap and place the
// host sends as this player's view. Loaded and started by controller/game-screen.js.

import { MESSAGE_TYPES, INPUT_KINDS } from '/shared/protocol.js';
import { ordinal } from '/shared/ordinal.js';
import * as buttonInput from '/controller/inputs/button.js';
import * as steering from '/controller/games/kart-2d/steering.js';
import * as setupScreen from '/controller/games/kart-2d/setup-screen.js';
import { MARKUP } from '/controller/games/kart-2d/markup.js';

// The page elements, looked up by start() once MARKUP is in place.
let setup, controls, pedals, accelerateButton, bigText, lineText;
let sendMessage = null; // set by start

export function start(container, send) {
  container.innerHTML = MARKUP;
  const byId = (id) => document.getElementById(id);
  setup = byId('kart-setup');
  controls = byId('kart-controls');
  pedals = byId('kart-pedals');
  accelerateButton = byId('kart-accelerate');
  bigText = byId('kart-big');
  lineText = byId('kart-line');
  sendMessage = send;
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

// `view` is what host/games/kart-2d/race-views.js made for this player: a setup view (phase 'setup') or a race
// view (its phase one of RACE_PHASES in host/games/kart-2d/race.js). It is null when they have no kart (they
// joined after the race was set up) or the host has not sent one yet.
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
  if (view.countdown !== null) {
    bigText.textContent = view.countdown === 0 ? 'GO!' : String(view.countdown);
  } else {
    bigText.textContent = ordinal(view.place);
  }
  lineText.textContent = describeLine(view);
}

function describeLine(view) {
  if (view.phase === 'results') {
    return 'Race over';
  }
  if (view.finished) {
    return 'Finished!';
  }
  return view.phase === 'countdown' ? 'Get ready!' : `Lap ${view.lap}/${view.laps}`;
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
