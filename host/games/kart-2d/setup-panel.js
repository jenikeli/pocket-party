// The 2D race's setup screen on the host, shown over the dimmed track before every race: the laps with - and +,
// one row per player with their control style and whether they are ready, and the Start race button. HTML in the
// race's stage. Used by host/games/kart-2d/renderer.js.

import { canStartRace, playersHoldingUpStart } from '/host/kart/setup.js';
import { displayName, playersInSlotOrder } from '/host/roster.js';
import { setupRows } from './race-views.js';
import { setText, createPlayerChip, fillPlayerChip } from './panel-parts.js';

// Adds the screen to `stage` (a .pp-stage). Returns { show(setup, players) }; `setup` null hides it.
// `onLapsStep(step)` gets -1 or 1, and `onStartRace()` runs on a click of Start race (enabled once everyone is
// ready).
export function createSetupPanel(stage, { onLapsStep, onStartRace }) {
  const screen = document.createElement('section');
  screen.id = 'kart-2d-setup';
  screen.className = 'k2d-screen';
  screen.hidden = true;
  screen.innerHTML = `
    <div class="pp-panel k2d-panel">
      <h1 class="pp-title k2d-heading">Race setup</h1>
      <div class="k2d-laps">
        <span class="pp-muted">Laps</span>
        <button type="button" id="kart-2d-laps-minus" class="pp-button">-</button>
        <span id="kart-2d-laps-value" class="k2d-laps-value"></span>
        <button type="button" id="kart-2d-laps-plus" class="pp-button">+</button>
      </div>
      <ul id="kart-2d-players" class="k2d-list"></ul>
      <p id="kart-2d-setup-status" class="pp-muted k2d-status"></p>
      <button type="button" id="kart-2d-start-button" class="pp-button pp-primary pp-big">Start race</button>
    </div>`;
  stage.append(screen);
  const lapsValue = screen.querySelector('#kart-2d-laps-value');
  const list = screen.querySelector('#kart-2d-players');
  const status = screen.querySelector('#kart-2d-setup-status');
  const startButton = screen.querySelector('#kart-2d-start-button');
  screen.querySelector('#kart-2d-laps-minus').addEventListener('click', () => onLapsStep(-1));
  screen.querySelector('#kart-2d-laps-plus').addEventListener('click', () => onLapsStep(1));
  startButton.addEventListener('click', onStartRace);
  // playerId -> { row, chip, controls, state }. Rows are kept and updated in place, so the page is not rebuilt
  // every frame.
  const rows = new Map();

  function makeRow() {
    const row = document.createElement('li');
    row.className = 'k2d-player';
    const chip = createPlayerChip();
    const controls = document.createElement('span');
    controls.className = 'pp-muted';
    const state = document.createElement('span');
    row.append(chip, controls, state);
    return { row, chip, controls, state };
  }

  function showRows(setup, players) {
    for (const [playerId, entry] of rows) {
      if (!players.has(playerId)) {
        entry.row.remove();
        rows.delete(playerId);
      }
    }
    setupRows(setup, players).forEach((rowInfo, index) => {
      const { playerId } = rowInfo.player;
      if (!rows.has(playerId)) {
        rows.set(playerId, makeRow());
      }
      const entry = rows.get(playerId);
      fillPlayerChip(entry.chip, rowInfo.player);
      setText(entry.controls, rowInfo.controlsText);
      setText(entry.state, rowInfo.stateText);
      entry.state.className = rowInfo.ready ? 'k2d-ready' : 'pp-muted';
      if (list.children[index] !== entry.row) {
        list.insertBefore(entry.row, list.children[index] ?? null);
      }
    });
  }

  function show(setup, players) {
    screen.hidden = !setup;
    if (!setup) {
      return;
    }
    setText(lapsValue, String(setup.laps));
    showRows(setup, players);
    const inOrder = playersInSlotOrder(players);
    const waitingFor = playersHoldingUpStart(setup, inOrder).map(displayName);
    setText(status, waitingFor.length > 0 ? `Waiting for ${waitingFor.join(', ')}` : 'Everyone is ready');
    startButton.disabled = !canStartRace(setup, inOrder);
  }

  return { show };
}
