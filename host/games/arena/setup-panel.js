// Spirefall's setup screen on the host: the mode (1v1 or 2v2), a column per team with who holds each seat (a person
// with a ready mark, or a CPU), the line that says what is being waited for, Start match (on once everyone is ready)
// and Watch (two CPUs play). HTML in the game's stage. Used by host/games/arena/index.js.

import { displayName, colorText } from '/host/roster.js';
import { setText, setPressed } from '/host/kart/panel-parts.js';
import { MODES, everyoneReady } from './seats.js';

const TEAM_NAMES = ['Dawn', 'Dusk'];

// Adds the screen to `stage` (a .pp-stage). `onMode(mode)`, `onStart()` and `onWatch()` are the buttons. Returns
// { show(model) } where model is { visible, mode, seats, players, ready, overflow }.
export function createSetupPanel(stage, { onMode, onStart, onWatch }) {
  const screen = document.createElement('section');
  screen.id = 'arena-setup';
  screen.className = 'ar-screen';
  const modeButtons = Object.keys(MODES).map((mode) => `<button type="button" class="pp-button" data-mode="${mode}">${mode}</button>`);
  screen.innerHTML = `
    <div class="pp-panel ar-panel">
      <div class="ar-head">
        <h1 class="pp-title">Spirefall</h1>
        <div class="pp-segment" role="group" aria-label="Mode">${modeButtons.join('')}</div>
      </div>
      <div id="arena-teams" class="ar-teams"></div>
      <p id="arena-status" class="pp-muted ar-status"></p>
      <div class="ar-actions">
        <button type="button" id="arena-start" class="pp-button pp-primary pp-big">Start match</button>
        <button type="button" id="arena-watch" class="pp-button">Watch CPUs play</button>
      </div>
    </div>`;
  stage.append(screen);
  const buttons = [...screen.querySelectorAll('[data-mode]')];
  const teams = screen.querySelector('#arena-teams');
  const status = screen.querySelector('#arena-status');
  const startButton = screen.querySelector('#arena-start');
  buttons.forEach((button) => button.addEventListener('click', () => onMode(button.dataset.mode)));
  startButton.addEventListener('click', onStart);
  screen.querySelector('#arena-watch').addEventListener('click', onWatch);
  let shownKey = '';

  function seatRow(seat, players, ready) {
    const row = document.createElement('li');
    row.className = 'ar-seat';
    if (seat.playerId === null) {
      row.classList.add('ar-seat-cpu');
      row.textContent = `CPU, level ${seat.cpuLevel}`;
      return row;
    }
    const player = players.get(seat.playerId);
    // The seats are worked out each step; a phone that left since then is gone from the roster for a frame.
    if (!player) {
      row.classList.add('ar-seat-cpu');
      row.textContent = 'Seat freed';
      return row;
    }
    const dot = document.createElement('span');
    dot.className = 'pp-dot';
    dot.style.setProperty('--pp-dot-color', colorText(player));
    // Names come from phones, so they only ever go in as text.
    const name = document.createElement('span');
    name.textContent = player.connected ? displayName(player) : `${displayName(player)} (away)`;
    row.append(dot, name);
    if (ready.has(seat.playerId)) {
      const tick = document.createElement('span');
      tick.className = 'ar-ready';
      tick.textContent = 'Ready';
      row.append(tick);
    }
    return row;
  }

  function statusText({ seats, ready, overflow }) {
    const people = seats.filter((seat) => seat.playerId !== null);
    if (people.length === 0 && overflow.length === 0) {
      return 'Scan the code to join, or watch the CPUs play';
    }
    const readyCount = people.filter((seat) => ready.has(seat.playerId)).length;
    const waiting = readyCount === people.length ? 'Everyone is ready' : `${readyCount} of ${people.length} ready`;
    return overflow.length > 0 ? `${waiting}. ${overflow.length} without a seat: switch to 2v2 or remove them` : waiting;
  }

  function show(model) {
    screen.hidden = !model.visible;
    if (!model.visible) {
      return;
    }
    const { mode, seats, players, ready } = model;
    const key = JSON.stringify([mode, seats, [...ready], [...players.values()].map((player) => [player.playerId, player.name, player.colorIndex, player.connected]), model.overflow]);
    if (key === shownKey) {
      return;
    }
    shownKey = key;
    buttons.forEach((button) => setPressed(button, button.dataset.mode === mode));
    startButton.disabled = !everyoneReady(seats, ready);
    teams.replaceChildren(...TEAM_NAMES.map((teamName, team) => {
      const column = document.createElement('div');
      column.className = 'ar-team';
      column.dataset.team = String(team);
      const heading = document.createElement('h2');
      heading.textContent = teamName;
      const list = document.createElement('ul');
      list.className = 'ar-seats';
      list.append(...seats.filter((seat) => seat.team === team).map((seat) => seatRow(seat, players, ready)));
      column.append(heading, list);
      return column;
    }));
    setText(status, statusText(model));
  }

  return { show };
}
