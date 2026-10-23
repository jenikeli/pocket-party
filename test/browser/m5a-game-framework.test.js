// Browser tests for M5a, the game framework: the lobby starts the chosen game (the input lab) through the
// registry and host/game-session.js, phones load the game named in CONTROLLER_STATE, "End game" brings everyone
// back to the lobby and reopens the room, the game can run again, and a game that fails to load leaves the lobby
// as it was. Uses Android (Chromium) phones only; the M1 and M3 tests already run the lab on WebKit.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader, findColor } from '../helpers/screenshot-pixels.js';
import { startGame, confirmClick, lobbyRemoveButton, GAME_END_BUTTON, START_BUTTON } from '../helpers/host-buttons.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

// From host/games/input-lab/player-card.js: the first card's stick ring (see test/browser/m1-flow.test.js).
const FIRST_PLAYER_COLOR = 0xe74c3c;
const FIRST_RING_AREA = { left: 45, top: 135, right: 196, bottom: 286 };

describe('M5a game framework', () => {
  let server;
  let browser;
  let pixelReader;
  let hostPage;
  let hostMessages;
  let roomCode;
  // Two players, each with their own context (own localStorage) and the messages their page receives.
  let ana;
  let bo;

  async function joinAs(playerName) {
    const context = await browser.newContext(devices['Pixel 7']);
    const page = await context.newPage();
    const messages = watchServerMessages(page);
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.fill('#player-name', playerName);
    await page.click('#join-button');
    await page.waitForSelector('#lobby-screen:not([hidden])');
    const { playerId } = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    return { context, page, messages, playerId };
  }

  // The next CONTROLLER_STATE this player's page receives that shows `screen`.
  async function nextState(player, screen) {
    while (true) {
      const state = await player.messages.nextOfType(MESSAGE_TYPES.CONTROLLER_STATE);
      if (state.screen === screen) {
        return state;
      }
    }
  }

  async function readyBoth() {
    for (const player of [ana, bo]) {
      await player.page.click('#ready-button');
      await player.page.waitForSelector('#ready-button[aria-pressed="true"]');
    }
  }

  function countCanvases() {
    return hostPage.evaluate(() => document.querySelectorAll('canvas').length);
  }

  async function firstDotShows() {
    const dot = await findColor(pixelReader, await hostPage.screenshot(), FIRST_PLAYER_COLOR, FIRST_RING_AREA);
    return dot.count > 0;
  }

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    pixelReader = await openPixelReader(browser);
    hostPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    hostMessages = watchServerMessages(hostPage);
    await hostPage.goto(`${server.baseUrl}/host`);
    roomCode = (await hostMessages.nextOfType(MESSAGE_TYPES.ROOM_CREATED, 10000)).roomCode;
    ana = await joinAs('Ana');
    bo = await joinAs('Bo');
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('a game that fails to load leaves everyone in the lobby, and Start works again afterwards', async () => {
    await readyBoth();
    await hostPage.route('**/host/games/input-lab/index.js', (route) => route.fulfill({ status: 404 }));
    const loadError = hostPage.waitForEvent('console', (entry) => entry.text().includes('Could not load Input lab'));
    await hostPage.mouse.click(START_BUTTON.x, START_BUTTON.y);
    await loadError;
    await saveScreenshot(hostPage, 'm5a-1-host-load-failed');
    assert.equal(await ana.page.isVisible('#lobby-screen'), true);
    assert.equal(await hostPage.isVisible('#shell'), true);
    assert.equal(await countCanvases(), 1);
    await hostPage.unroute('**/host/games/input-lab/index.js');
  });

  test('Start runs the chosen game in its own container; phones get the game id and load its controls', async () => {
    await startGame(hostPage, ana.page);
    const state = await nextState(ana, 'game');
    assert.equal(state.gameId, 'input-lab');
    assert.equal(state.view, null);
    await bo.page.waitForSelector('#pad-screen:not([hidden])');

    // The shell's canvas is hidden and the game draws on its own canvas.
    assert.equal(await hostPage.isVisible('#shell'), false);
    assert.equal(await hostPage.isVisible('#game-container canvas'), true);
    assert.equal(await hostPage.isVisible('#game-bar'), true);
    await waitUntil(firstDotShows, { message: 'the first player\'s card in the running game' });
    await saveScreenshot(hostPage, 'm5a-2-host-game');
  });

  test('a phone that reloads gets the game id again and goes straight back into the game', async () => {
    await ana.page.reload();
    const state = await nextState(ana, 'game');
    assert.equal(state.gameId, 'input-lab');
    await ana.page.waitForSelector('#pad-screen:not([hidden])');
  });

  test('End game needs two clicks, then everyone is back in the lobby, unready', async () => {
    await hostPage.click(GAME_END_BUTTON);
    assert.equal(await hostPage.textContent(GAME_END_BUTTON), 'End it?');
    await hostPage.waitForTimeout(500);
    assert.equal(await ana.page.isVisible('#pad-screen'), true);
    await saveScreenshot(hostPage, 'm5a-3-host-end-armed');

    await hostPage.click(GAME_END_BUTTON);
    for (const player of [ana, bo]) {
      const state = await nextState(player, 'lobby');
      assert.equal(state.gameId, null);
      assert.equal(state.ready, false);
      await player.page.waitForSelector('#lobby-screen:not([hidden])');
    }
    assert.equal(await ana.page.getAttribute('#ready-button', 'aria-pressed'), 'false');
    // The game's canvas and container are gone, and the shell is back.
    assert.equal(await hostPage.isVisible('#shell'), true);
    assert.equal(await hostPage.isVisible('#game-bar'), false);
    assert.equal(await countCanvases(), 1);
    await saveScreenshot(hostPage, 'm5a-4-host-back-in-lobby');
  });

  test('back in the lobby the room takes new players again', async () => {
    const cy = await joinAs('Cy');
    await cy.context.close();
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_DISCONNECTED);
  });

  test('the game can be played again after it ended', async () => {
    // Cy is still held for the grace period and is not ready, so remove that slot first.
    const cyLeft = hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_LEFT);
    await confirmClick(hostPage, lobbyRemoveButton(2));
    await cyLeft;
    await readyBoth();
    await startGame(hostPage, ana.page);
    await bo.page.waitForSelector('#pad-screen:not([hidden])');
    await waitUntil(firstDotShows, { message: 'the first player\'s card in the second run' });
    assert.equal(await countCanvases(), 2);
  });
});
