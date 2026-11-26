// Breakwater's setup and result screens on the host: the mode, bot skill, teams, readiness, and match results.
// HTML in the game's stage. Used by host/games/fps/index.js.

import { displayName, colorText } from '/host/roster.js';
import { setText, setPressed } from '/host/kart/panel-parts.js';
import { TUNING, WEAPONS } from './tuning.js';
import { DEFAULT_MAP, MAPS } from './maps/index.js';

const MODE_IDS = Object.keys(TUNING.modes);
const TEAM_NAMES = ['Vanguard', 'Syndicate'];

// Adds both screens to `stage` (a .pp-stage). `handlers` is { onMode(id), onBotLevel(level), onStart(), onWatch(),
// onBack() }. Returns { show(model), showResult(result) } where model is { visible, modeId, botLevel, people, ready }
// and people is [{ player, team }] in seat order.
export function createSetupPanel(stage, handlers) {
  const screen = document.createElement('section');
  screen.id = 'fps-setup';
  screen.className = 'fp-screen';
  const modes = MODE_IDS.map((id) => `<button type="button" class="pp-button" data-mode="${id}">${TUNING.modes[id].name}</button>`).join('');
  const levels = [1, 2, 3].map((level) => `<button type="button" class="pp-button" data-level="${level}">${level}</button>`).join('');
  screen.innerHTML = `
    <div class="pp-panel fp-panel">
      <h1 class="pp-title">Breakwater</h1>
      <div class="fp-row"><span class="pp-muted">Mode</span><div class="pp-segment" role="group" aria-label="Mode">${modes}</div></div>
      <div class="fp-row"><span class="pp-muted">Bot skill</span><div class="pp-segment" role="group" aria-label="Bot skill">${levels}</div></div>
      <div class="fp-row"><span class="pp-muted">Map / starting weapon</span><strong id="fps-assets">${MAPS[DEFAULT_MAP].name} · ${WEAPONS.rifle.name}</strong></div>
      <div id="fps-teams" class="fp-teams"></div>
      <p class="pp-muted fp-instructions" id="fps-instructions"></p>
      <p id="fps-status" class="pp-muted fp-status"></p>
      <div class="fp-actions">
        <button type="button" id="fps-start" class="pp-button pp-primary pp-big">Start match</button>
        <button type="button" id="fps-watch" class="pp-button">Watch bots play</button>
      </div>
    </div>`;
  const card = document.createElement('section');
  card.id = 'fps-result';
  card.className = 'fp-result';
  card.hidden = true;
  card.innerHTML = '<div class="pp-panel fp-result-panel"><h1 class="pp-title fp-result-title"></h1><p class="fp-result-score"></p><button type="button" class="pp-button pp-primary pp-big">Back to setup</button></div>';
  stage.append(screen, card);
  const modeButtons = [...screen.querySelectorAll('[data-mode]')];
  const levelButtons = [...screen.querySelectorAll('[data-level]')];
  const teams = screen.querySelector('#fps-teams');
  const instructions = screen.querySelector('#fps-instructions');
  const status = screen.querySelector('#fps-status');
  const startButton = screen.querySelector('#fps-start');
  const watchButton = screen.querySelector('#fps-watch');
  modeButtons.forEach((button) => button.addEventListener('click', () => handlers.onMode(button.dataset.mode)));
  levelButtons.forEach((button) => button.addEventListener('click', () => handlers.onBotLevel(Number(button.dataset.level))));
  startButton.addEventListener('click', handlers.onStart);
  screen.querySelector('#fps-watch').addEventListener('click', handlers.onWatch);
  card.querySelector('button').addEventListener('click', handlers.onBack);
  let shownKey = '';

  function personRow(entry, ready) {
    const row = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'pp-dot';
    dot.style.setProperty('--pp-dot-color', colorText(entry.player));
    const name = document.createElement('span');
    name.textContent = entry.player.connected ? displayName(entry.player) : `${displayName(entry.player)} (away)`;
    row.append(dot, name);
    if (ready.has(entry.player.playerId)) {
      const tick = document.createElement('span');
      tick.className = 'fp-ready';
      tick.textContent = 'Ready';
      row.append(tick);
    }
    return row;
  }

  function show(model) {
    screen.hidden = !model.visible;
    if (!model.visible) {
      return;
    }
    const key = JSON.stringify([model.modeId, model.botLevel, [...model.ready], model.people.map((entry) => [entry.player.playerId, entry.player.name, entry.player.colorIndex, entry.player.connected, entry.team])]);
    if (key === shownKey) {
      return;
    }
    shownKey = key;
    modeButtons.forEach((button) => setPressed(button, button.dataset.mode === model.modeId));
    levelButtons.forEach((button) => setPressed(button, Number(button.dataset.level) === model.botLevel));
    startButton.disabled = model.people.length === 0 || !model.people.every((entry) => model.ready.has(entry.player.playerId));
    const mode = TUNING.modes[model.modeId];
    watchButton.disabled = model.people.length > 0 || mode.cooperative;
    setText(instructions, model.people.length === 0
      ? mode.cooperative
        ? 'Relay Recovery needs a phone. Choose a PvP mode to watch CPU teams fight.'
        : 'Join with up to four phones, or watch the CPU battle.'
      : 'Choose a team on each phone and tap Ready. Up to four phones can play.');
    const columns = mode.cooperative ? [0] : mode.teams ? [0, 1] : [null];
    teams.replaceChildren(...columns.map((team) => {
      const column = document.createElement('div');
      column.className = 'fp-team';
      column.dataset.team = String(team ?? 2);
      const heading = document.createElement('h2');
      heading.textContent = mode.cooperative ? 'Crew' : team === null ? 'Players' : TEAM_NAMES[team];
      const list = document.createElement('ul');
      list.append(...model.people.filter((entry) => team === null || entry.team === team).map((entry) => personRow(entry, model.ready)));
      column.append(heading, list);
      return column;
    }));
    const readyCount = model.people.filter((entry) => model.ready.has(entry.player.playerId)).length;
    setText(status, model.people.length === 0
      ? mode.cooperative
        ? 'Relay Recovery needs at least one phone. Watch bots play is available in PvP modes.'
        : 'No phones joined. Choose Watch bots play to follow the CPU battle.'
      : readyCount === model.people.length
        ? 'Everyone is ready. Start match to play.'
        : `${readyCount} of ${model.people.length} ready. Players tap Ready on their phones.`);
  }

  function showResult(result) {
    card.hidden = !result;
    if (result) {
      setText(card.querySelector('.fp-result-title'), result.title);
      setText(card.querySelector('.fp-result-score'), result.line);
    }
  }

  return { show, showResult };
}
