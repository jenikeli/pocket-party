// The lobby's game settings on the host: the player limit and how long a dropped player's slot is held,
// each with - and + buttons. Used by host/scenes/lobby-scene.js, which owns the values and the rules.

import { formatMinutes } from '/host/roster.js';

// The rows' vertical centers and the buttons' horizontal centers, at 1:1 scale.
export const MAX_PLAYERS_ROW_Y = 900;
export const GRACE_ROW_Y = 990;
export const MINUS_BUTTON_X = 700;
export const PLUS_BUTTON_X = 900;
const LABEL_X = 80;
const VALUE_X = 800;
const BUTTON_SIZE = 70;

const TEXT_STYLE = { fontFamily: 'sans-serif', color: '#ffffff' };

// `onMaxPlayersStep(step)` and `onGraceStep(step)` get -1 or 1. Returns { show(settings) }.
export function drawSettingsPanel(scene, { onMaxPlayersStep, onGraceStep }) {
  const maxPlayersValue = drawSettingRow(scene, MAX_PLAYERS_ROW_Y, 'Max players', onMaxPlayersStep);
  const graceValue = drawSettingRow(scene, GRACE_ROW_Y, 'Hold a dropped player for', onGraceStep);

  function show(settings) {
    maxPlayersValue.setText(String(settings.maxPlayers));
    graceValue.setText(formatMinutes(settings.graceSeconds));
  }

  return { show };
}

// Draws one "label  [-] value [+]" row and returns its value text.
function drawSettingRow(scene, y, label, onStep) {
  scene.add.text(LABEL_X, y, label, { ...TEXT_STYLE, fontSize: '36px', color: '#9aa4bf' }).setOrigin(0, 0.5);
  drawButton(scene, MINUS_BUTTON_X, y, '-', () => onStep(-1));
  drawButton(scene, PLUS_BUTTON_X, y, '+', () => onStep(1));
  return scene.add.text(VALUE_X, y, '', { ...TEXT_STYLE, fontSize: '40px' }).setOrigin(0.5);
}

function drawButton(scene, x, y, label, onClick) {
  const background = scene.add.rectangle(x, y, BUTTON_SIZE, BUTTON_SIZE, 0x2a3145).setInteractive({ useHandCursor: true });
  scene.add.text(x, y, label, { ...TEXT_STYLE, fontSize: '48px' }).setOrigin(0.5);
  // pointerup, not pointerdown, so a touch that slides off the button does not count, as with normal buttons.
  background.on('pointerup', onClick);
  background.on('pointerover', () => background.setFillColor(0x3a4258));
  background.on('pointerout', () => background.setFillColor(0x2a3145));
}
