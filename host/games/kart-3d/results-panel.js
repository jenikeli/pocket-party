// The 3D race's results, a panel in the host's look over the views once the race is over (the karts drive on
// behind it): a "Results" heading with what was raced beside it, every kart's place, name, finish time and gap to
// the winner (the winner's row larger, its place in the accent), a player's colour as a dot beside the name and CPU
// karts' in grey, and the Race again button across the panel. Leaving the game is the shell's Back to games.
// Used by host/games/kart-3d/index.js.

import { displayName, colorText } from '../../roster.js';
import { ordinal } from '../../../shared/ordinal.js';
import { formatRaceTime, formatGap } from '../../kart/race-time.js';
import { icon } from '../../../shared/icons.js';
import { createRaceStage } from './race-stage.js';

const CPU_COLOR = '#9aa4bf';

// `onRaceAgain()` runs on a click. Returns { show(standings, players, summaryText), hide() }.
export function createResultsPanel(container, { onRaceAgain }) {
  // Centred in the area above the strip, so the panel never reaches under it (race-panels.css).
  const stage = createRaceStage(container, 'k3d-race-stage k3d-above-strip');
  const panel = document.createElement('div');
  panel.id = 'kart-3d-results';
  panel.className = 'pp-panel k3d-results';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="k3d-results-heading">
      <h2 class="pp-title">Results</h2>
      <p id="kart-3d-results-summary" class="pp-muted"></p>
    </div>
    <ol id="kart-3d-results-rows" class="k3d-results-rows"></ol>
    <button type="button" id="kart-3d-race-again-button" class="pp-button pp-primary pp-big">${icon('again')}Race again</button>`;
  stage.append(panel);
  const rows = panel.querySelector('#kart-3d-results-rows');
  const summary = panel.querySelector('#kart-3d-results-summary');
  panel.querySelector('#kart-3d-race-again-button').addEventListener('click', onRaceAgain);
  // What the summary and the rows show, as text, so they are only rebuilt when something changed (this runs every
  // frame).
  let shownRows = null;

  // `standings` is race-views.js standingRows: { place, playerId, finishTime } in place order. `players` is the
  // shell's roster, for names and colours. `summaryText` is what was raced (race-views.js describeRaceSummary).
  function show(standings, players, summaryText) {
    panel.hidden = false;
    const winnerTime = standings[0]?.finishTime ?? null;
    const entries = standings.map((standing) => describeResultRow(standing, players.get(standing.playerId), winnerTime));
    const rowsText = JSON.stringify([summaryText, entries]);
    if (rowsText !== shownRows) {
      shownRows = rowsText;
      summary.textContent = summaryText;
      rows.replaceChildren(...entries.map(createRow));
    }
  }

  function hide() {
    panel.hidden = true;
  }

  return { show, hide };
}

// What one row shows. A player who left mid-race has no kart, so every player here is in the roster; `player` is
// undefined for a CPU kart. `winnerTime` is the winner's finish time (null if none): the gap is a kart's time
// behind it, empty for the winner and for a kart that did not finish.
export function describeResultRow(standing, player, winnerTime) {
  const isWinner = standing.place === 1;
  const hasGap = !isWinner && standing.finishTime !== null && winnerTime !== null;
  return {
    place: ordinal(standing.place),
    name: player ? displayName(player) : 'CPU',
    color: player ? colorText(player) : CPU_COLOR,
    time: standing.finishTime === null ? '--' : formatRaceTime(standing.finishTime),
    gap: hasGap ? formatGap(standing.finishTime, winnerTime) : '',
    isPlayer: Boolean(player),
    isWinner,
  };
}

// Built from text nodes, never innerHTML: names come from the players' phones.
function createRow(entry) {
  const row = document.createElement('li');
  row.className = `k3d-result ${entry.isPlayer ? 'player' : 'cpu'}${entry.isWinner ? ' first' : ''}`;
  const place = createCell('place', entry.place);
  const name = createCell('name', entry.name);
  const dot = document.createElement('span');
  dot.className = 'pp-dot';
  dot.style.setProperty('--pp-dot-color', entry.color);
  name.prepend(dot);
  row.append(place, name, createCell('time', entry.time), createCell('gap', entry.gap));
  return row;
}

function createCell(className, text) {
  const cell = document.createElement('span');
  cell.className = className;
  cell.append(text);
  return cell;
}
