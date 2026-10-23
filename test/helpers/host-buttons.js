// Clicks on the host's canvas buttons, for the browser tests. Positions are copied from
// host/scenes/lobby-scene.js, host/lobby-player-list.js, host/player-card.js and host/scenes/input-lab-scene.js
// at 1:1 scale (1920x1080 viewport); update them when that layout changes on purpose.

import { waitUntil } from './browser.js';

export const START_BUTTON = { x: 1160, y: 100 };
export const CLOSE_ROOM_BUTTON = { x: 1190, y: 990 };
export const GAME_CLOSE_ROOM_BUTTON = { x: 1650, y: 970 };

// The Remove button on the lobby's row `index` (0-8).
export function lobbyRemoveButton(index) {
  return { x: 1190, y: 230 + index * 72 };
}

// The Remove button on the input lab card for color slot `slotIndex` (0-8): cards are 440x340 with 15 px gaps,
// 3 per row, and the button sits 80 px in from the card's right edge, 36 px down.
export function cardRemoveButton(slotIndex) {
  return { x: 15 + (slotIndex % 3) * 455 + 360, y: 15 + Math.floor(slotIndex / 3) * 355 + 36 };
}

// Clicks Start until `controllerPage` shows the input lab. The button only works once the host has seen
// everyone ready, which can take a frame or two after the last ready tap.
export async function startGame(hostPage, controllerPage) {
  await waitUntil(
    async () => {
      await hostPage.mouse.click(START_BUTTON.x, START_BUTTON.y);
      await controllerPage.waitForTimeout(200);
      return controllerPage.isVisible('#pad-screen');
    },
    { message: 'the host\'s Start button to start the game' },
  );
}

// Clicks a confirm button twice ("Remove", then "Sure?"), with a pause so Phaser sees two separate clicks.
export async function confirmClick(hostPage, { x, y }) {
  await hostPage.mouse.click(x, y);
  await hostPage.waitForTimeout(300);
  await hostPage.mouse.click(x, y);
}
