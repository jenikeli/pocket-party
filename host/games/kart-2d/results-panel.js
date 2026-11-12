// The 2D race's results, shown over the dimmed track when the race is over: places, names and finish times, and
// the "Race again" and "Back to lobby" buttons. HTML in the race's stage. Used by host/games/kart-2d/renderer.js.

import { standingRows } from './race-views.js';
import { formatRaceTime } from '/host/kart/race-time.js';
import { ordinal } from '/shared/ordinal.js';
import { createPlayerChip, fillPlayerChip } from './panel-parts.js';

// Adds the screen to `stage` (a .pp-stage). `onRaceAgain()` and `onBackToLobby()` run on a click. Returns
// { show(race, players), hide() }.
export function createResultsPanel(stage, { onRaceAgain, onBackToLobby }) {
  const screen = document.createElement('section');
  screen.id = 'kart-2d-results';
  screen.className = 'k2d-screen';
  screen.hidden = true;
  screen.innerHTML = `
    <div class="pp-panel k2d-panel">
      <h1 class="pp-title k2d-heading">Results</h1>
      <ol id="kart-2d-results-rows" class="k2d-list"></ol>
      <div class="k2d-buttons">
        <button type="button" id="kart-2d-race-again-button" class="pp-button pp-primary pp-big">Race again</button>
        <button type="button" id="kart-2d-lobby-button" class="pp-button pp-big">Back to lobby</button>
      </div>
    </div>`;
  stage.append(screen);
  const rows = screen.querySelector('#kart-2d-results-rows');
  screen.querySelector('#kart-2d-race-again-button').addEventListener('click', onRaceAgain);
  screen.querySelector('#kart-2d-lobby-button').addEventListener('click', onBackToLobby);

  // Called once per race, so the rows are built fresh each time.
  function show(race, players) {
    const items = [];
    for (const standing of standingRows(race)) {
      const player = players.get(standing.playerId);
      if (player) {
        items.push(createRow(standing, player));
      }
    }
    rows.replaceChildren(...items);
    screen.hidden = false;
  }

  function hide() {
    rows.replaceChildren();
    screen.hidden = true;
  }

  return { show, hide };
}

function createRow(standing, player) {
  const row = document.createElement('li');
  row.className = 'k2d-result';
  const place = document.createElement('span');
  place.className = 'pp-muted';
  place.textContent = ordinal(standing.place);
  const chip = createPlayerChip();
  fillPlayerChip(chip, player);
  const time = document.createElement('span');
  time.textContent = standing.finishTime === null ? 'Did not finish' : formatRaceTime(standing.finishTime);
  row.append(place, chip, time);
  return row;
}
