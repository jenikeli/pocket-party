// Clicks on the host's buttons, for the browser tests. Canvas positions are copied from
// host/scenes/lobby-scene.js, host/lobby-player-list.js, host/settings-panel.js,
// host/games/input-lab/player-card.js, host/games/kart-2d/results-panel.js and host/games/kart-2d/setup-panel.js
// at 1:1 scale (1920x1080 viewport); update them when that layout changes on purpose. The buttons over a running game (host/game-bar.js) are HTML, so they are clicked by id.

import { waitUntil } from './browser.js';

export const START_BUTTON = { x: 1160, y: 100 };
export const CLOSE_ROOM_BUTTON = { x: 1190, y: 990 };
export const NEXT_GAME_BUTTON = { x: 810, y: 60 };
export const GAME_END_BUTTON = '#end-game-button';
export const GAME_CLOSE_ROOM_BUTTON = '#close-room-button';
export const RACE_AGAIN_BUTTON = { x: 760, y: 880 };
export const BACK_TO_LOBBY_BUTTON = { x: 1160, y: 880 };
export const LAPS_MINUS_BUTTON = { x: 1180, y: 270 };
export const LAPS_PLUS_BUTTON = { x: 1340, y: 270 };
export const START_RACE_BUTTON = { x: 960, y: 900 };

// The Remove button on the lobby's row `index` (0-8).
export function lobbyRemoveButton(index) {
  return { x: 1190, y: 230 + index * 72 };
}

// The Remove button on the input lab card for color slot `slotIndex` (0-8): cards are 440x340 with 15 px gaps,
// 3 per row, and the button sits 80 px in from the card's right edge, 36 px down.
export function cardRemoveButton(slotIndex) {
  return { x: 15 + (slotIndex % 3) * 455 + 360, y: 15 + Math.floor(slotIndex / 3) * 355 + 36 };
}

// Clicks Start until `controllerPage` shows the game's controls (`controlsSelector`, the input lab's by
// default). The button only works once the host has seen everyone ready, which can take a frame or two after
// the last ready tap. `scale` is the host page's size over 1920x1080 (the lobby is scaled to fit).
export async function startGame(hostPage, controllerPage, controlsSelector = '#pad-screen', scale = 1) {
  await waitUntil(
    async () => {
      await hostPage.mouse.click(START_BUTTON.x * scale, START_BUTTON.y * scale);
      await controllerPage.waitForTimeout(200);
      return controllerPage.isVisible(controlsSelector);
    },
    { message: 'the host\'s Start button to start the game' },
  );
}

// Clicks a confirm button twice ("Remove", then "Sure?"), with a pause so Phaser sees two separate clicks.
// `button` is a canvas point { x, y }, or the selector of an HTML button over a running game.
export async function confirmClick(hostPage, button) {
  const click = () => (typeof button === 'string' ? hostPage.click(button) : hostPage.mouse.click(button.x, button.y));
  await click();
  await hostPage.waitForTimeout(300);
  await click();
}

// From the 2D race's setup screen: every phone in `controllerPages` taps Ready, then the host clicks Start race
// until the first phone shows the countdown. The button only works once the host has seen everyone ready.
export async function startRace(hostPage, controllerPages) {
  for (const page of controllerPages) {
    await page.click('#kart-ready-button');
    await page.waitForSelector('#kart-ready-button[aria-pressed="true"]');
  }
  await waitUntil(
    async () => {
      await hostPage.mouse.click(START_RACE_BUTTON.x, START_RACE_BUTTON.y);
      await controllerPages[0].waitForTimeout(200);
      return controllerPages[0].isVisible('#kart-controls');
    },
    { message: 'the host\'s Start race button to start the race' },
  );
}
