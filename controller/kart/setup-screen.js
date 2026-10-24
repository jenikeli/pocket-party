// The phone's setup screen for both kart races, before every race: steering (stick or tilt), accelerate (Go
// button or auto) and Ready. What is picked is shown from the host's view, so the highlight only moves once the
// host has the choice. Used by controller/kart/controls.js.

import { KART_CHOICES, KART_STEERING } from '/shared/protocol.js';
import * as steering from '/controller/kart/steering.js';

let elements = null; // { setup, laps, readyButton }
let sendChoice = null; // (choice, value), set by start
let ready = false; // from the newest view

export function start(pageElements, choiceSender) {
  elements = pageElements;
  sendChoice = choiceSender;
  elements.setup.addEventListener('click', onClick);
}

// `view` is a race's setup view: { laps, steering, autoAccelerate, ready }. laps is null when the game has no
// laps (the 3D test drive), and the line stays empty.
export function show(view) {
  ready = view.ready;
  elements.laps.textContent = view.laps === null ? '' : view.laps === 1 ? '1 lap' : `${view.laps} laps`;
  for (const button of elements.setup.querySelectorAll('[data-choice]')) {
    const picked = String(view[button.dataset.choice]) === button.dataset.value;
    button.setAttribute('aria-pressed', String(picked));
  }
  elements.readyButton.setAttribute('aria-pressed', String(ready));
  elements.readyButton.textContent = ready ? 'Ready!' : 'Ready';
}

function onClick(event) {
  if (event.target === elements.readyButton) {
    sendChoice(KART_CHOICES.READY, !ready);
    return;
  }
  const button = event.target.closest('[data-choice]');
  if (!button) {
    return;
  }
  const { choice, value } = button.dataset;
  if (choice === KART_CHOICES.STEERING) {
    // Tilt needs the motion permission, which iOS only grants from inside this tap.
    if (value === KART_STEERING.TILT) {
      steering.enableTilt();
    } else {
      steering.chooseStick();
    }
  } else if (choice === KART_CHOICES.AUTO_ACCELERATE) {
    sendChoice(choice, value === 'true');
  }
}
