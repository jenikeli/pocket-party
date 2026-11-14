// The phone's setup screen for both kart races, before every race: the race's line (game, course, laps), the
// player's colour (controller/kart/color-picker.js) and in the 3D race the driver it brings, steering (stick or
// tilt), the options (Auto-accelerate, Left-handed) and Ready (green with a tick once pressed). What is picked is
// shown from the host's view, so the highlight only moves once the host has the choice. Used by
// controller/kart/controls.js.

import { KART_CHOICES, KART_STEERING } from '/shared/protocol.js';
import * as steering from '/controller/kart/steering.js';
import { createColorPicker } from '/controller/kart/color-picker.js';
import { icon } from '/shared/icons.js';

let elements = null; // { setup, game, title, laps, colors, driver, readyButton }
let gameTitle = ''; // the race's own name ("Kartwheel"), set by start
let sendChoice = null; // (choice, value), set by start
let colorPicker = null; // set by start
let shownView = null; // the newest view, which the option toggles turn round

export function start(pageElements, title, choiceSender) {
  elements = pageElements;
  gameTitle = title;
  sendChoice = choiceSender;
  colorPicker = createColorPicker(elements.colors, sendChoice);
  shownView = null;
  elements.setup.addEventListener('click', onClick);
}

// `view` is a race's setup view: { laps, engineClass, courseName, steering, autoAccelerate, leftHanded, ready,
// colorIndex, colors, driverName }. engineClass (the 3D race's 50, 100, 150 or 200) is missing in the 2D race,
// which has none; courseName is the 3D race's course, when the host sends it; driverName is the 3D race's only.
export function show(view) {
  shownView = view;
  // With a course, the course is the title and the game's name a small line above it; without, the game's name
  // is the title.
  elements.game.textContent = gameTitle;
  elements.game.hidden = !view.courseName;
  elements.title.textContent = view.courseName || gameTitle;
  const laps = view.laps === 1 ? '1 lap' : `${view.laps} laps`;
  elements.laps.textContent = view.engineClass === undefined ? laps : `${laps}, ${view.engineClass}cc`;
  colorPicker.show(view.colors, view.colorIndex);
  showDriver(view);
  // A segment button is picked when the view holds its value; a toggle (no data-value) when the view says true.
  for (const button of elements.setup.querySelectorAll('[data-choice]')) {
    const { choice, value } = button.dataset;
    const picked = value === undefined ? view[choice] === true : String(view[choice]) === value;
    button.setAttribute('aria-pressed', String(picked));
  }
  elements.readyButton.setAttribute('aria-pressed', String(view.ready));
  // Ready turns green (setup.css) and gains a tick once it is on; the word stays.
  elements.readyButton.innerHTML = view.ready ? `${icon('check')}Ready` : 'Ready';
}

// "Red: you drive Blaze", in the 3D race only: the 2D race has no drivers.
function showDriver(view) {
  elements.driver.hidden = !view.driverName;
  if (!view.driverName) {
    return;
  }
  const driver = document.createElement('b');
  driver.textContent = view.driverName;
  elements.driver.replaceChildren(`${view.colors[view.colorIndex].name}: you drive `, driver);
}

function onClick(event) {
  // contains(), not ===: once ready the button holds the tick, and a tap on the tick has the SVG as its target.
  if (elements.readyButton.contains(event.target)) {
    sendChoice(KART_CHOICES.READY, !shownView.ready);
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
  } else if (choice === KART_CHOICES.AUTO_ACCELERATE || choice === KART_CHOICES.LEFT_HANDED) {
    sendChoice(choice, !shownView[choice]);
  }
}
