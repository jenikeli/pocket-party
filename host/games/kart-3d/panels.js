// The 3D test drive's HTML panels over the canvas: the setup screen (each player's control style and ready,
// and Start driving), and while driving a small readout at the top (physics step time, frame rate, each
// player's speed) with a Back to setup button. Used by host/games/kart-3d/index.js, which owns the state; the
// panels only show it and report clicks. The bottom right stays clear for the shell's game bar.

import { displayName, colorText, playersInSlotOrder } from '/host/roster.js';
import { KART_STEERING } from '/shared/protocol.js';
import { playerSetup, playersHoldingUpStart, canStartRace } from '/host/kart/setup.js';

const STYLE = `
  #kart-3d-setup { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(720px, 90vw);
    padding: 24px 32px; border-radius: 16px; background: rgba(28, 33, 48, 0.92); color: #ffffff;
    font: 24px sans-serif; text-align: center; }
  #kart-3d-setup h1 { margin: 0 0 8px; font-size: 48px; }
  #kart-3d-setup p { margin: 8px 0; color: #9aa4bf; }
  #kart-3d-setup ul { margin: 16px 0; padding: 0; list-style: none; text-align: left; }
  #kart-3d-setup li { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; }
  #kart-3d-setup li .name { font-weight: bold; flex: 1; }
  #kart-3d-setup li .style { color: #9aa4bf; }
  #kart-3d-setup li .ready { color: #2ecc71; }
  #kart-3d-drive { position: fixed; left: 50%; top: 8px; transform: translateX(-50%); display: flex; gap: 12px;
    align-items: flex-start; padding: 8px 12px; border-radius: 10px; background: rgba(16, 19, 28, 0.75);
    color: #ffffff; font: 14px sans-serif; }
  #kart-3d-drive p { margin: 0; white-space: pre-line; }
  #kart-3d-setup button, #kart-3d-drive button { font: 22px sans-serif; padding: 12px 24px; border: none;
    border-radius: 8px; background: #2a3145; color: #ffffff; cursor: pointer; }
  #kart-3d-drive button { font-size: 16px; padding: 8px 12px; }
  #kart-3d-setup button:disabled { opacity: 0.4; cursor: default; }
`;

// `onStartDriving()` and `onBackToSetup()` run on a click of those buttons.
// Returns { showSetup(setup, players), showDriving(readoutText) }: one panel shows at a time.
export function createPanels(container, { onStartDriving, onBackToSetup }) {
  const style = document.createElement('style');
  style.textContent = STYLE;
  const setupPanel = document.createElement('div');
  setupPanel.id = 'kart-3d-setup';
  setupPanel.innerHTML = `
    <h1>Test drive</h1>
    <p>Pick your steering and accelerate on your phone, then tap Ready.</p>
    <ul id="kart-3d-rows"></ul>
    <p id="kart-3d-status"></p>
    <button type="button" id="kart-3d-start-button" disabled>Start driving</button>`;
  const drivePanel = document.createElement('div');
  drivePanel.id = 'kart-3d-drive';
  drivePanel.hidden = true;
  drivePanel.innerHTML = '<button type="button" id="kart-3d-setup-button">Back to setup</button><p id="kart-3d-readout"></p>';
  container.append(style, setupPanel, drivePanel);
  const rows = setupPanel.querySelector('#kart-3d-rows');
  const status = setupPanel.querySelector('#kart-3d-status');
  const startButton = setupPanel.querySelector('#kart-3d-start-button');
  const readout = drivePanel.querySelector('#kart-3d-readout');
  startButton.addEventListener('click', onStartDriving);
  drivePanel.querySelector('#kart-3d-setup-button').addEventListener('click', onBackToSetup);
  // What the rows show, as text, so they are only rebuilt when something changed (this runs every frame).
  let shownRows = null;

  function showSetup(setup, players) {
    setupPanel.hidden = false;
    drivePanel.hidden = true;
    const inOrder = playersInSlotOrder(players);
    const entries = inOrder.map((player) => describeRow(player, playerSetup(setup, player.playerId)));
    const rowsText = JSON.stringify(entries);
    if (rowsText !== shownRows) {
      shownRows = rowsText;
      rows.replaceChildren(...entries.map(createRow));
    }
    const waitingFor = playersHoldingUpStart(setup, inOrder).map(displayName);
    status.textContent = waitingFor.length > 0 ? `Waiting for ${waitingFor.join(', ')}` : 'Everyone is ready';
    startButton.disabled = !canStartRace(setup, inOrder);
  }

  function showDriving(readoutText) {
    setupPanel.hidden = true;
    drivePanel.hidden = false;
    if (readout.textContent !== readoutText) {
      readout.textContent = readoutText;
    }
  }

  return { showSetup, showDriving };
}

function describeRow(player, { steering, autoAccelerate, ready }) {
  return {
    name: displayName(player),
    color: colorText(player),
    style: `${steering === KART_STEERING.TILT ? 'Tilt' : 'Stick'}, ${autoAccelerate ? 'auto-accelerate' : 'Go button'}`,
    state: !player.connected ? '(away)' : ready ? 'Ready' : 'Choosing...',
  };
}

// Built from text nodes, never innerHTML: names come from the players' phones.
function createRow(entry) {
  const row = document.createElement('li');
  const name = document.createElement('span');
  name.className = 'name';
  name.style.color = entry.color;
  name.textContent = entry.name;
  const styleText = document.createElement('span');
  styleText.className = 'style';
  styleText.textContent = entry.style;
  const state = document.createElement('span');
  state.className = entry.state === 'Ready' ? 'ready' : 'style';
  state.textContent = entry.state;
  row.append(name, styleText, state);
  return row;
}
