// The 3D race's results, an HTML panel over the race once it is over (the karts drive on behind it): every
// kart's place, name and finish time, players in their colours and CPU karts in grey, and the "Race again" and
// "Back to lobby" buttons. Used by host/games/kart-3d/index.js.

import { displayName, colorText } from '/host/roster.js';
import { ordinal } from '/shared/ordinal.js';
import { formatRaceTime } from '/host/kart/race-time.js';

const STYLE = `
  #kart-3d-results { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(640px, 90vw);
    max-height: 96dvh; overflow-y: auto; box-sizing: border-box; padding: 16px 32px; border-radius: 16px;
    background: rgba(28, 33, 48, 0.92); color: #ffffff; font: 22px sans-serif; text-align: center; }
  #kart-3d-results h1 { margin: 0 0 8px; font-size: 44px; }
  #kart-3d-results ol { margin: 0 0 12px; padding: 0; list-style: none; text-align: left; }
  #kart-3d-results li { display: flex; gap: 16px; padding: 2px 0; }
  #kart-3d-results li .place { width: 2.5em; color: #9aa4bf; }
  #kart-3d-results li .name { flex: 1; font-weight: bold; }
  #kart-3d-results li.player { font-size: 26px; }
  #kart-3d-results button { font: 22px sans-serif; margin: 0 8px; padding: 12px 24px; border: none; border-radius: 8px;
    background: #2a3145; color: #ffffff; cursor: pointer; }
`;
const CPU_COLOR = '#9aa4bf';

// `onRaceAgain()` and `onBackToLobby()` run on a click. Returns { show(standings, players), hide() }.
export function createResultsPanel(container, { onRaceAgain, onBackToLobby }) {
  const style = document.createElement('style');
  style.textContent = STYLE;
  const panel = document.createElement('div');
  panel.id = 'kart-3d-results';
  panel.hidden = true;
  panel.innerHTML = `
    <h1>Results</h1>
    <ol id="kart-3d-results-rows"></ol>
    <button type="button" id="kart-3d-race-again-button">Race again</button>
    <button type="button" id="kart-3d-lobby-button">Back to lobby</button>`;
  container.append(style, panel);
  const rows = panel.querySelector('#kart-3d-results-rows');
  panel.querySelector('#kart-3d-race-again-button').addEventListener('click', onRaceAgain);
  panel.querySelector('#kart-3d-lobby-button').addEventListener('click', onBackToLobby);
  // What the rows show, as text, so they are only rebuilt when something changed (this runs every frame).
  let shownRows = null;

  // `standings` is race-views.js standingRows: { place, playerId, finishTime } in place order. `players` is the
  // shell's roster, for names and colours.
  function show(standings, players) {
    panel.hidden = false;
    const entries = standings.map((standing) => describeRow(standing, players.get(standing.playerId)));
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

// A player who left mid-race has no kart, so every player here is in the roster; `player` is undefined for a
// CPU kart.
function describeRow(standing, player) {
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
  row.className = entry.isPlayer ? 'player' : 'cpu';
  for (const [className, text] of [['place', entry.place], ['name', entry.name], ['time', entry.time]]) {
    const cell = document.createElement('span');
    cell.className = className;
    cell.textContent = text;
    row.append(cell);
  }
  row.querySelector('.name').style.color = entry.color;
  return row;
}
