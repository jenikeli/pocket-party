// The 2D race's setup screen on the host, shown over the dimmed track before every race: the title and laps, one
// row per player (host/kart/player-rows.js), the line that says why Start race is off, and the button. HTML in
// the race's stage. Used by host/games/kart-2d/renderer.js.

import { startBlocker } from '/host/kart/setup.js';
import { playersInSlotOrder } from '/host/roster.js';
import { setupRows } from '/host/kart/setup-rows.js';
import { createPlayerRows } from '/host/kart/player-rows.js';
import { setText, lapsStepperMarkup } from '/host/kart/panel-parts.js';
import { MIN_PLAYERS } from './race.js';

// Adds the screen to `stage` (a .pp-stage). Returns { show(setup, players) }; `setup` null hides it.
// `onLapsStep(step)` gets -1 or 1, `onStartRace()` runs on a click of Start race (enabled once the race can
// start) and `onRemovePlayer(playerId)` on a confirmed click of a row's cross.
export function createSetupPanel(stage, { onLapsStep, onStartRace, onRemovePlayer }) {
  const screen = document.createElement('section');
  screen.id = 'kart-2d-setup';
  screen.className = 'k2d-screen';
  screen.hidden = true;
  screen.innerHTML = `
    <div class="pp-panel k2d-panel">
      <div class="k2d-head">
        <h1 class="pp-title k2d-heading">Kart race 2D</h1>
        ${lapsStepperMarkup({ minusId: 'kart-2d-laps-minus', valueId: 'kart-2d-laps-value', plusId: 'kart-2d-laps-plus' })}
      </div>
      <ul id="kart-2d-players" class="kart-player-rows"></ul>
      <p id="kart-2d-setup-status" class="pp-muted k2d-status"></p>
      <button type="button" id="kart-2d-start-button" class="pp-button pp-primary pp-big">Start race</button>
    </div>`;
  stage.append(screen);
  const lapsValue = screen.querySelector('#kart-2d-laps-value');
  const status = screen.querySelector('#kart-2d-setup-status');
  const startButton = screen.querySelector('#kart-2d-start-button');
  screen.querySelector('#kart-2d-laps-minus').addEventListener('click', () => onLapsStep(-1));
  screen.querySelector('#kart-2d-laps-plus').addEventListener('click', () => onLapsStep(1));
  startButton.addEventListener('click', onStartRace);
  const rows = createPlayerRows(screen.querySelector('#kart-2d-players'), { onRemove: onRemovePlayer });

  function show(setup, players) {
    screen.hidden = !setup;
    if (!setup) {
      return;
    }
    setText(lapsValue, String(setup.laps));
    rows.show(setupRows(setup, players));
    // The only sentence on the screen: why Start race is off.
    const blocker = startBlocker(setup, playersInSlotOrder(players), MIN_PLAYERS);
    setText(status, blocker);
    startButton.disabled = blocker !== '';
  }

  return { show };
}
