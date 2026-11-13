// The 3D race's results, a panel in the host's look over the race once it is over (the karts drive on behind it):
// every kart's place, name and finish time, a player's colour as a dot beside the name and CPU karts' in grey,
// and the Race again button. Leaving the game is the shell's back arrow. Used by host/games/kart-3d/index.js.

import { displayName, colorText } from '../../roster.js';
import { ordinal } from '../../../shared/ordinal.js';
import { formatRaceTime } from '../../kart/race-time.js';
import { icon } from '../../../shared/icons.js';
import { createRaceStage } from './race-stage.js';

const CPU_COLOR = '#9aa4bf';

// `onRaceAgain()` runs on a click. Returns { show(standings, players), hide() }.
export function createResultsPanel(container, { onRaceAgain }) {
  const stage = createRaceStage(container, 'k3d-race-stage');
  const panel = document.createElement('div');
  panel.id = 'kart-3d-results';
  panel.className = 'pp-panel k3d-results';
  panel.hidden = true;
  panel.innerHTML = `
    <ol id="kart-3d-results-rows" class="k3d-results-rows"></ol>
    <button type="button" id="kart-3d-race-again-button" class="pp-button pp-primary pp-big">${icon('again')}Race again</button>`;
  stage.append(panel);
  const rows = panel.querySelector('#kart-3d-results-rows');
  panel.querySelector('#kart-3d-race-again-button').addEventListener('click', onRaceAgain);
  // What the rows show, as text, so they are only rebuilt when something changed (this runs every frame).
  let shownRows = null;

  // `standings` is race-views.js standingRows: { place, playerId, finishTime } in place order. `players` is the
  // shell's roster, for names and colours.
  function show(standings, players) {
    panel.hidden = false;
    const entries = standings.map((standing) => describeResultRow(standing, players.get(standing.playerId)));
    const rowsText = JSON.stringify(entries);
    if (rowsText !== shownRows) {
      shownRows = rowsText;
      rows.replaceChildren(...entries.map(createRow));
    }
  }

  function hide() {
    panel.hidden = true;
  }

  return { show, hide };
}

// What one row shows. A player who left mid-race has no kart, so every player here is in the roster; `player` is
// undefined for a CPU kart.
export function describeResultRow(standing, player) {
  return {
    place: ordinal(standing.place),
    name: player ? displayName(player) : 'CPU',
    color: player ? colorText(player) : CPU_COLOR,
    time: standing.finishTime === null ? '--' : formatRaceTime(standing.finishTime),
    isPlayer: Boolean(player),
  };
}

// Built from text nodes, never innerHTML: names come from the players' phones.
function createRow(entry) {
  const row = document.createElement('li');
  row.className = entry.isPlayer ? 'k3d-result player' : 'k3d-result cpu';
  const place = createCell('place pp-muted', entry.place);
  const name = createCell('name', entry.name);
  const dot = document.createElement('span');
  dot.className = 'pp-dot';
  dot.style.setProperty('--pp-dot-color', entry.color);
  name.prepend(dot);
  row.append(place, name, createCell('time', entry.time));
  return row;
}

function createCell(className, text) {
  const cell = document.createElement('span');
  cell.className = className;
  cell.append(text);
  return cell;
}
