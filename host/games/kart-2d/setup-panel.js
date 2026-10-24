// The 2D race's setup screen on the host, drawn over the track before every race: the laps with - and +, one
// row per player with their control style and whether they are ready, and the Start race button.
// Used by host/games/kart-2d/renderer.js.

import { drawButton } from '/host/buttons.js';
import { displayName, colorText, playersInSlotOrder } from '/host/roster.js';
import { MAX_PLAYERS, KART_STEERING } from '/shared/protocol.js';
import { playerSetup, playersHoldingUpStart, canStartRace } from '/host/kart/setup.js';

const TEXT_STYLE = { fontFamily: 'sans-serif', color: '#ffffff' };
const MUTED_COLOR = '#9aa4bf';
const READY_COLOR = '#2ecc71';
// Above the track, like the results panel.
const DEPTH = 2;
const LEFT_X = 540;
const RIGHT_X = 1380;
const LAPS_ROW_Y = 270;
const FIRST_ROW_Y = 370;
const ROW_HEIGHT = 46;
// Button centres at 1:1 scale; the browser tests click them.
export const LAPS_MINUS_BUTTON = { x: 1180, y: LAPS_ROW_Y };
export const LAPS_PLUS_BUTTON = { x: 1340, y: LAPS_ROW_Y };
export const START_RACE_BUTTON = { x: 960, y: 900 };

// Returns { show(setup, players) }; `setup` null hides the panel. `onLapsStep(step)` gets -1 or 1, and
// `onStartRace()` runs on a click of Start race (only enabled once everyone is ready).
export function createSetupPanel(scene, { onLapsStep, onStartRace }) {
  const text = (x, y, size, color = TEXT_STYLE.color) =>
    scene.add.text(x, y, '', { ...TEXT_STYLE, fontSize: `${size}px`, color }).setOrigin(0, 0.5);
  // Dims the track and catches clicks, so nothing behind the panel reacts.
  const shade = scene.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.6).setInteractive();
  const panel = scene.add.rectangle(960, 540, 1000, 860, 0x1c2130).setStrokeStyle(4, 0x3a4258);
  const title = scene.add.text(960, 170, 'Race setup', { ...TEXT_STYLE, fontSize: '64px', fontStyle: 'bold' }).setOrigin(0.5);
  const lapsLabel = text(LEFT_X, LAPS_ROW_Y, 40, MUTED_COLOR).setText('Laps');
  const stepSize = { width: 70, height: 70, fontSize: 48 };
  const minus = drawButton(scene, LAPS_MINUS_BUTTON.x, LAPS_MINUS_BUTTON.y, { ...stepSize, label: '-', onClick: () => onLapsStep(-1) });
  const plus = drawButton(scene, LAPS_PLUS_BUTTON.x, LAPS_PLUS_BUTTON.y, { ...stepSize, label: '+', onClick: () => onLapsStep(1) });
  const lapsValue = text((LAPS_MINUS_BUTTON.x + LAPS_PLUS_BUTTON.x) / 2, LAPS_ROW_Y, 44).setOrigin(0.5);
  // One row per possible player, filled in slot order; unused rows stay empty.
  const rows = [];
  for (let index = 0; index < MAX_PLAYERS; index += 1) {
    const y = FIRST_ROW_Y + index * ROW_HEIGHT;
    rows.push({ name: text(LEFT_X, y, 32), style: text(820, y, 28, MUTED_COLOR), state: text(RIGHT_X, y, 28).setOrigin(1, 0.5) });
  }
  const status = scene.add.text(960, 810, '', { ...TEXT_STYLE, fontSize: '30px', color: MUTED_COLOR }).setOrigin(0.5);
  const startRace = drawButton(scene, START_RACE_BUTTON.x, START_RACE_BUTTON.y, {
    width: 400,
    height: 90,
    label: 'Start race',
    onClick: onStartRace,
  });
  const allObjects = [shade, panel, title, lapsLabel, lapsValue, status, ...minus.objects, ...plus.objects, ...startRace.objects];
  allObjects.push(...rows.flatMap((row) => [row.name, row.style, row.state]));
  for (const object of allObjects) {
    object.setDepth(DEPTH);
  }
  let visible = true;
  // setEnabled repaints the button, which would wipe its hover colour every frame, so it is called on change only.
  let startEnabled = null;

  function show(setup, players) {
    if (visible !== Boolean(setup)) {
      visible = Boolean(setup);
      allObjects.forEach((object) => object.setVisible(visible));
    }
    if (!setup) {
      return;
    }
    const inOrder = playersInSlotOrder(players);
    lapsValue.setText(String(setup.laps));
    rows.forEach((row, index) => showRow(row, inOrder[index] && { player: inOrder[index], ...playerSetup(setup, inOrder[index].playerId) }));
    const waitingFor = playersHoldingUpStart(setup, inOrder).map(displayName);
    status.setText(waitingFor.length > 0 ? `Waiting for ${waitingFor.join(', ')}` : 'Everyone is ready');
    if (startEnabled !== canStartRace(setup, inOrder)) {
      startEnabled = canStartRace(setup, inOrder);
      startRace.setEnabled(startEnabled);
    }
  }

  return { show };
}

// `entry` is { player, steering, autoAccelerate, ready }, or undefined for the rows below the last player.
function showRow(row, entry) {
  if (!entry) {
    row.name.setText('');
    row.style.setText('');
    row.state.setText('');
    return;
  }
  row.name.setText(displayName(entry.player));
  setColorIfChanged(row.name, colorText(entry.player));
  const steering = entry.steering === KART_STEERING.TILT ? 'Tilt' : 'Stick';
  row.style.setText(`${steering}, ${entry.autoAccelerate ? 'auto-accelerate' : 'Go button'}`);
  if (!entry.player.connected) {
    row.state.setText('(away)');
    setColorIfChanged(row.state, MUTED_COLOR);
  } else {
    row.state.setText(entry.ready ? 'Ready' : 'Choosing...');
    setColorIfChanged(row.state, entry.ready ? READY_COLOR : MUTED_COLOR);
  }
}

// Phaser redraws a text's texture on every setColor, even to the same colour, and this runs every frame.
function setColorIfChanged(textObject, color) {
  if (textObject.style.color !== color) {
    textObject.setColor(color);
  }
}
