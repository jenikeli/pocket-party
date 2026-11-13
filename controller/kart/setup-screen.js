// The phone's setup screen for both kart races, before every race: the race's line (game, course, laps),
// steering (stick or tilt), accelerate (Go button or auto) and Ready (green with a tick once pressed). What is
// picked is shown from the host's view, so the highlight only moves once the host has the choice. Used by
// controller/kart/controls.js.

import { KART_CHOICES, KART_STEERING } from '/shared/protocol.js';
import * as steering from '/controller/kart/steering.js';
import { icon } from '/shared/icons.js';

let elements = null; // { setup, game, title, laps, readyButton }
let gameTitle = ''; // the race's own name ("Kart race 3D"), set by start
let sendChoice = null; // (choice, value), set by start
let ready = false; // from the newest view

export function start(pageElements, title, choiceSender) {
  elements = pageElements;
  gameTitle = title;
  sendChoice = choiceSender;
  elements.setup.addEventListener('click', onClick);
}

// `view` is a race's setup view: { laps, engineClass, courseName, steering, autoAccelerate, ready }. engineClass
// (the 3D race's 50, 100, 150 or 200) is missing in the 2D race, which has none; courseName is the 3D race's
// course, when the host sends it.
export function show(view) {
  ready = view.ready;
  // With a course, the course is the title and the game's name a small line above it; without, the game's name
  // is the title.
  elements.game.textContent = gameTitle;
  elements.game.hidden = !view.courseName;
  elements.title.textContent = view.courseName || gameTitle;
  const laps = view.laps === 1 ? '1 lap' : `${view.laps} laps`;
  elements.laps.textContent = view.engineClass === undefined ? laps : `${laps}, ${view.engineClass}cc`;
  for (const button of elements.setup.querySelectorAll('[data-choice]')) {
    const picked = String(view[button.dataset.choice]) === button.dataset.value;
    button.setAttribute('aria-pressed', String(picked));
  }
  elements.readyButton.setAttribute('aria-pressed', String(ready));
  // Ready turns green (setup.css) and gains a tick once it is on; the word stays.
  elements.readyButton.innerHTML = ready ? `${icon('check')}Ready` : 'Ready';
}

function onClick(event) {
  // contains(), not ===: once ready the button holds the tick, and a tap on the tick has the SVG as its target.
  if (elements.readyButton.contains(event.target)) {
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
