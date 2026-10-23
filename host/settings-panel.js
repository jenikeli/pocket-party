// The lobby's room settings on the host: the player limit and how long a dropped player's slot is held, each
// with - and + buttons, and the game picker at the top. Used by host/scenes/lobby-scene.js, which owns the
// values and the rules.

import { formatMinutes } from '/host/roster.js';
import { drawButton } from '/host/buttons.js';

// The rows' vertical centers and the buttons' horizontal centers, at 1:1 scale.
export const MAX_PLAYERS_ROW_Y = 900;
export const GRACE_ROW_Y = 990;
export const MINUS_BUTTON_X = 700;
export const PLUS_BUTTON_X = 900;
const LABEL_X = 80;
const VALUE_X = 800;
const BUTTON_SIZE = 70;
// The game picker's row, between the "Lobby" title and the Start button.
export const GAME_ROW_Y = 60;
export const PREVIOUS_GAME_X = 470;
export const NEXT_GAME_X = 810;

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

// Draws "Game  [<] title [>]". `onStep(step)` gets -1 or 1. Returns { show(title) }.
export function drawGamePicker(scene, onStep) {
  scene.add.text(330, GAME_ROW_Y, 'Game', { ...TEXT_STYLE, fontSize: '36px', color: '#9aa4bf' }).setOrigin(0, 0.5);
  const size = { width: 60, height: 60, fontSize: 40 };
  drawButton(scene, PREVIOUS_GAME_X, GAME_ROW_Y, { ...size, label: '<', onClick: () => onStep(-1) });
  drawButton(scene, NEXT_GAME_X, GAME_ROW_Y, { ...size, label: '>', onClick: () => onStep(1) });
  const titleX = (PREVIOUS_GAME_X + NEXT_GAME_X) / 2;
  const title = scene.add.text(titleX, GAME_ROW_Y, '', { ...TEXT_STYLE, fontSize: '40px' }).setOrigin(0.5);
  return { show: (gameTitle) => title.setText(gameTitle) };
}

// Draws one "label  [-] value [+]" row and returns its value text.
function drawSettingRow(scene, y, label, onStep) {
  scene.add.text(LABEL_X, y, label, { ...TEXT_STYLE, fontSize: '36px', color: '#9aa4bf' }).setOrigin(0, 0.5);
  const size = { width: BUTTON_SIZE, height: BUTTON_SIZE, fontSize: 48 };
  drawButton(scene, MINUS_BUTTON_X, y, { ...size, label: '-', onClick: () => onStep(-1) });
  drawButton(scene, PLUS_BUTTON_X, y, { ...size, label: '+', onClick: () => onStep(1) });
  return scene.add.text(VALUE_X, y, '', { ...TEXT_STYLE, fontSize: '40px' }).setOrigin(0.5);
}
