// The 2D race's results, shown over the dimmed track when the race is over: a heading with the laps raced, the
// winner's row larger, then each kart's place, name, finish time and gap to the winner, and the Race again button
// across the panel. Leaving the game is the shell's Back to games. HTML in the race's stage. Used by
// host/games/kart-2d/renderer.js.

import { resultRows, lapsText } from './race-views.js';
import { formatRaceTime } from '/host/kart/race-time.js';
import { ordinal } from '/shared/ordinal.js';
import { icon } from '/shared/icons.js';
import { createPlayerChip, fillPlayerChip } from './panel-parts.js';

// Adds the screen to `stage` (a .pp-stage). `onRaceAgain()` runs on a click. Returns { show(race, players),
// hide() }.
export function createResultsPanel(stage, { onRaceAgain }) {
  const screen = document.createElement('section');
  screen.id = 'kart-2d-results';
  screen.className = 'k2d-screen';
  screen.hidden = true;
  screen.innerHTML = `
    <div class="pp-panel k2d-panel">
      <div class="k2d-head">
        <h1 class="pp-title k2d-heading">Results</h1>
        <span id="kart-2d-results-summary" class="pp-muted"></span>
      </div>
      <ol id="kart-2d-results-rows" class="k2d-list"></ol>
      <button type="button" id="kart-2d-race-again-button" class="pp-button pp-primary pp-big">${icon('again')}Race again</button>
    </div>`;
  stage.append(screen);
  const summary = screen.querySelector('#kart-2d-results-summary');
  const rows = screen.querySelector('#kart-2d-results-rows');
  screen.querySelector('#kart-2d-race-again-button').addEventListener('click', onRaceAgain);

  // Called once per race, so the rows are built fresh each time.
  function show(race, players) {
    const items = [];
    for (const standing of resultRows(race)) {
      const player = players.get(standing.playerId);
      if (player) {
        items.push(createRow(standing, player));
      }
    }
    summary.textContent = lapsText(race.laps);
    rows.replaceChildren(...items);
    screen.hidden = false;
  }

  function hide() {
    rows.replaceChildren();
    screen.hidden = true;
  }

  return { show, hide };
}

// Place, player, time and gap. The first place is the winner: a larger row with its place in the accent.
function createRow(standing, player) {
  const row = document.createElement('li');
  row.className = standing.place === 1 ? 'k2d-result k2d-winner' : 'k2d-result';
  const place = document.createElement('span');
  place.className = 'k2d-place';
  place.textContent = ordinal(standing.place);
  const chip = createPlayerChip();
  fillPlayerChip(chip, player);
  const time = document.createElement('span');
  time.textContent = standing.finishTime !== null ? formatRaceTime(standing.finishTime) : 'Did not finish';
  const gap = document.createElement('span');
  gap.className = 'k2d-gap pp-muted';
  gap.textContent = standing.gap;
  row.append(place, chip, time, gap);
  return row;
}
