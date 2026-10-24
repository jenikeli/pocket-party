// The phone side of the 2D race, a game module: a steering stick and held accelerate and brake buttons, plus
// the countdown, lap and place the host sends as this player's view. Loaded and started by
// controller/game-screen.js.

import { MESSAGE_TYPES } from '/shared/protocol.js';
import { ordinal } from '/shared/ordinal.js';
import * as dragInput from '/controller/inputs/drag.js';
import * as buttonInput from '/controller/inputs/button.js';
import { MARKUP } from '/controller/games/kart-2d/markup.js';

// How far (CSS px) the knob moves when the stick is all the way over.
const KNOB_TRAVEL_PX = 45;

// The page elements, looked up by start() once MARKUP is in place.
let stickZone, stickKnob, pedals, bigText, lineText;
let sendMessage = null; // set by start

export function start(container, send) {
  container.innerHTML = MARKUP;
  const byId = (id) => document.getElementById(id);
  stickZone = byId('kart-stick-zone');
  stickKnob = byId('kart-stick-knob');
  pedals = byId('kart-pedals');
  bigText = byId('kart-big');
  lineText = byId('kart-line');
  sendMessage = send;
  // A long press on a held button must not open the browser's menu.
  // On the game's own element, not the container, which the shell keeps between games.
  byId('kart-screen').addEventListener('contextmenu', (event) => event.preventDefault());
  dragInput.start(stickZone);
  buttonInput.start(pedals);
}

// `view` is what host/games/kart-2d/race-views.js made for this player (its phase is one of RACE_PHASES in
// host/games/kart-2d/race.js), or null when they have no kart (they joined after the race was set up) or the
// host has not sent one yet.
export function showView(view) {
  if (!view) {
    bigText.textContent = '';
    lineText.textContent = 'Waiting for the next race';
    return;
  }
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
  dragInput.stop();
  buttonInput.stop();
}

function sendInput(input) {
  sendMessage({ type: MESSAGE_TYPES.INPUT, input, sentAt: Date.now() });
}

dragInput.onInput((input) => {
  sendInput(input);
  // Only left and right steer, so the knob only moves sideways.
  stickKnob.style.transform = `translateX(${input.x * KNOB_TRAVEL_PX}px)`;
});

buttonInput.onInput((input) => {
  sendInput(input);
  pedals.querySelector(`[data-button="${input.button}"]`)?.classList.toggle('held', input.pressed);
});
