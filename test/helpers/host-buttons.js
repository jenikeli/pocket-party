// Clicks on the host's buttons, for the browser tests. The shell (picker, top bar, join window) and the races'
// panels are HTML, so they are found by id. Only the input lab's cards are still drawn on a canvas: their point is
// copied from host/games/input-lab/player-card.js at 1:1 scale (1920x1080 viewport); update it when that layout
// changes on purpose.

import { waitUntil } from './browser.js';

export const GAME_BACK_BUTTON = '#game-back-button';
export const RACE_AGAIN_BUTTON = '#kart-2d-race-again-button';
export const LAPS_MINUS_BUTTON = '#kart-2d-laps-minus';
export const START_RACE_BUTTON = '#kart-2d-start-button';

// The cross on one player's row in a race's setup screen (two clicks remove the player).
export function removeRowButton(playerId) {
  return `[data-remove-player="${playerId}"]`;
}

// The Remove button on the input lab card for color slot `slotIndex` (0-8): cards are 440x310 with 15 px gaps,
// 3 per row from (15, 110); the close mark sits 36 px in from the card's right edge and 36 px down.
export function cardRemoveButton(slotIndex) {
  return { x: 15 + (slotIndex % 3) * 455 + 404, y: 110 + Math.floor(slotIndex / 3) * 325 + 36 };
}

// Clicks an HTML button on the host `times` times in a row through the page itself. Playwright's own click
// first waits for the button to stay still over two animation frames, and software-drawn WebGL (the 3D race)
// gives a frame every few seconds, which pushes the back arrow's second click past its 3 s confirm window.
export function clickNow(hostPage, selector, times = 1) {
  return hostPage.$eval(selector, (button, count) => {
    for (let i = 0; i < count; i += 1) {
      button.click();
    }
  }, times);
}

// Closes the join window if it is open: it opens by itself when a game's room opens and covers the game, so
// every click on the game would wait behind it.
export async function closeJoinWindow(hostPage) {
  if (await hostPage.isVisible('#join-window')) {
    await clickNow(hostPage, '#join-done-button');
    await hostPage.waitForSelector('#join-window', { state: 'hidden' });
  }
}

// From the game picker: picks `gameId` (an id from host/games/index.js), clicks Play, waits for the game's room
// and resolves with its room code, read from the join window that opens by itself. The window is closed again
// unless `keepJoinWindow` is set (for the tests that look at it). `timeoutMs` is how long the game may take to
// load and open its room: the 3D race loads its code and sounds before the room is made.
export async function startGame(hostPage, { gameId = 'input-lab', timeoutMs = 30000, keepJoinWindow = false } = {}) {
  const tile = `[data-game-id="${gameId}"]`;
  await clickNow(hostPage, tile);
  await hostPage.waitForSelector(`${tile}[aria-pressed="true"]`);
  await clickNow(hostPage, '#play-button');
  await hostPage.waitForSelector('#join-window:not([hidden])', { timeout: timeoutMs });
  const roomCode = await hostPage.textContent('#join-code');
  if (!keepJoinWindow) {
    await closeJoinWindow(hostPage);
  }
  return roomCode;
}

// Goes back to the picker the way the host does: two clicks on the back arrow (the first arms it), then waits
// for the picker.
export async function goBackToPicker(hostPage) {
  await clickNow(hostPage, GAME_BACK_BUTTON, 2);
  await hostPage.waitForSelector('#game-picker:not([hidden])');
}

// Clicks a confirm button twice (a pause between, so the two are separate clicks; the first arms it).
// `button` is the selector of an HTML button, or a canvas point { x, y } (the input lab's cards).
export async function confirmClick(hostPage, button) {
  const click = () => (typeof button === 'string' ? hostPage.click(button) : hostPage.mouse.click(button.x, button.y));
  await click();
  await hostPage.waitForTimeout(300);
  await click();
}

// From the 2D race's setup screen: every phone in `controllerPages` taps Ready, then the host clicks Start race
// (enabled once the host has seen everyone ready) and the first phone shows the countdown.
export async function startRace(hostPage, controllerPages) {
  for (const page of controllerPages) {
    await page.click('#kart-ready-button');
    await page.waitForSelector('#kart-ready-button[aria-pressed="true"]');
  }
  await hostPage.waitForSelector(`${START_RACE_BUTTON}:not([disabled])`);
  await clickNow(hostPage, START_RACE_BUTTON);
  await waitUntil(() => controllerPages[0].isVisible('#kart-controls'), {
    message: 'the race to start on the first phone',
  });
}
