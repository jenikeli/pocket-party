// Clicks on the host's buttons, for the browser tests. The shell (lobby, join window, game bar) and the 2D race's
// panels are HTML, so they are found by id. Only the input lab's cards are still drawn on a canvas: their point is
// copied from host/games/input-lab/player-card.js at 1:1 scale (1920x1080 viewport); update it when that layout
// changes on purpose.

import { waitUntil } from './browser.js';

export const GAME_END_BUTTON = '#end-game-button';
export const GAME_CLOSE_ROOM_BUTTON = '#close-room-button';
export const LOBBY_CLOSE_ROOM_BUTTON = '#lobby-close-room-button';
export const RACE_AGAIN_BUTTON = '#kart-2d-race-again-button';
export const BACK_TO_LOBBY_BUTTON = '#kart-2d-lobby-button';
export const LAPS_MINUS_BUTTON = '#kart-2d-laps-minus';
export const LAPS_PLUS_BUTTON = '#kart-2d-laps-plus';
export const START_RACE_BUTTON = '#kart-2d-start-button';

// The chip of one player in the lobby's list (a button: two clicks remove the player).
export function lobbyChip(playerId) {
  return `#lobby-players [data-player-id="${playerId}"]`;
}

// The Remove button on the input lab card for color slot `slotIndex` (0-8): cards are 440x340 with 15 px gaps,
// 3 per row, and the button sits 80 px in from the card's right edge, 36 px down.
export function cardRemoveButton(slotIndex) {
  return { x: 15 + (slotIndex % 3) * 455 + 360, y: 15 + Math.floor(slotIndex / 3) * 355 + 36 };
}

// Clicks an HTML button on the host `times` times in a row through the page itself. Playwright's own click
// first waits for the button to stay still over two animation frames, and software-drawn WebGL (the 3D race)
// gives a frame every few seconds, which pushes End game's second click past its 3 s confirm window.
export function clickNow(hostPage, selector, times = 1) {
  return hostPage.$eval(selector, (button, count) => {
    for (let i = 0; i < count; i += 1) {
      button.click();
    }
  }, times);
}

// Clicks "Done" if the join window is open: it opens by itself with the lobby and covers it, so every click on
// the lobby would wait behind it.
export async function closeJoinWindow(hostPage) {
  if (await hostPage.isVisible('#join-window')) {
    await clickNow(hostPage, '#join-done-button');
    await hostPage.waitForSelector('#join-window', { state: 'hidden' });
  }
}

// Picks a game in the lobby by its thumbnail (`gameId` is an id from host/games/index.js) and waits until it
// shows pressed.
export async function chooseGame(hostPage, gameId) {
  await closeJoinWindow(hostPage);
  const tile = `[data-game-id="${gameId}"]`;
  await clickNow(hostPage, tile);
  await hostPage.waitForSelector(`${tile}[aria-pressed="true"]`);
}

// From the lobby: picks `gameId`, clicks Play once it is enabled (the player count fits) and waits until
// `controllerPage` shows the game's controls (`controlsSelector`, the input lab's by default). `timeoutMs` is how
// long the game may take to start: the 3D race builds its world and draws a first frame in software WebGL,
// which takes several seconds.
export async function startGame(hostPage, controllerPage, { gameId = 'input-lab', controlsSelector = '#pad-screen', timeoutMs = 5000 } = {}) {
  await chooseGame(hostPage, gameId);
  await hostPage.waitForSelector('#play-button:not([disabled])');
  await clickNow(hostPage, '#play-button');
  await controllerPage.waitForSelector(controlsSelector, { state: 'visible', timeout: timeoutMs });
}

// Clicks a confirm button twice ("Remove", then "Sure?"), with a pause between so the two are separate clicks.
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
