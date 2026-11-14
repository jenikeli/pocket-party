// Browser tests for M5a, the game framework: the picker starts the chosen game (the input lab) through the
// registry and host/game-session.js, phones load the game named in CONTROLLER_STATE, Back to games brings the
// host back to the picker and every phone to "The game ended", the game can run again in a new room, and a game
// that fails to load leaves the picker as it was, with no room. Uses Android (Chromium) phones only; the M1 and
// M3 tests already run the lab on WebKit.
// Since M10b the picker is HTML (the only canvas is the running game's), a room exists only while a game runs,
// and a phone in a room is always on the game's screen (CONTROLLER_STATE has no `others`).

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader, findColor } from '../helpers/screenshot-pixels.js';
import { startGame, clickNow, GAME_BACK_BUTTON } from '../helpers/host-buttons.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

// From host/games/input-lab/player-card.js: the first card's stick ring (see test/browser/m1-flow.test.js).
const FIRST_PLAYER_COLOR = 0xe74c3c;
const FIRST_RING_AREA = { left: 45, top: 230, right: 196, bottom: 381 };

describe('M5a game framework', () => {
  let server;
  let browser;
  let pixelReader;
  let hostPage;
  let hostMessages;
  let roomCode;
  let hostSocketCount = 0;
  // Two players, each with their own context (own localStorage) and the messages their page receives.
  let ana;
  let bo;

  async function joinAs(playerName, code = roomCode) {
    const context = await browser.newContext(devices['Pixel 7']);
    const page = await context.newPage();
    const messages = watchServerMessages(page);
    await page.goto(`${server.baseUrl}/?room=${code}`);
    await page.fill('#player-name', playerName);
    await page.click('#join-button');
    await page.waitForSelector('#pad-screen', { state: 'visible' });
    const { playerId } = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    return { context, page, messages, playerId };
  }

  // The next CONTROLLER_STATE this player's page receives.
  function nextState(player) {
    return player.messages.nextOfType(MESSAGE_TYPES.CONTROLLER_STATE);
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
    hostPage.on('websocket', () => (hostSocketCount += 1));
    hostMessages = watchServerMessages(hostPage);
    await openHost(hostPage, server.baseUrl);
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('a game that fails to load returns to the picker with the reason, and leaves no room behind', async () => {
    await clickNow(hostPage, '[data-game-id="input-lab"]');
    await hostPage.waitForSelector('[data-game-id="input-lab"][aria-pressed="true"]');
    await hostPage.route('**/host/games/input-lab/index.js', (route) => route.fulfill({ status: 404 }));
    const loadError = hostPage.waitForEvent('console', (entry) => entry.text().includes('Could not load Input lab'));
    await clickNow(hostPage, '#play-button');
    await loadError;
    await hostPage.waitForFunction(() => document.getElementById('picker-problem').textContent !== '');
    assert.match(await hostPage.textContent('#picker-problem'), /Could not load Input lab/);
    await saveScreenshot(hostPage, 'm5a-1-host-load-failed');
    assert.equal(await hostPage.isVisible('#game-picker'), true);
    assert.equal(await hostPage.isVisible('#loading-screen'), false);
    assert.equal(await hostPage.isVisible('#join-window'), false);
    assert.equal(await hostPage.isVisible('#game-back-button'), false);
    assert.equal(await countCanvases(), 0);
    // The room is made only after a successful load, so none was made: no socket, and Play is on again.
    assert.equal(hostSocketCount, 0);
    assert.equal(await hostPage.isEnabled('#play-button'), true);
    await hostPage.unroute('**/host/games/input-lab/index.js');
  });

  test('Play runs the chosen game in its own container; phones get the game id and load its controls', async () => {
    roomCode = await startGame(hostPage, { gameId: 'input-lab' });
    ana = await joinAs('Ana');
    bo = await joinAs('Bo');
    const state = await nextState(ana);
    assert.equal(state.screen, 'game');
    assert.equal(state.gameId, 'input-lab');
    assert.equal(state.view, null);
    assert.equal('others' in state, false, 'the state no longer lists the other players');

    // The picker is hidden and the game draws on its own canvas, the only one on the page.
    assert.equal(await hostPage.isVisible('#game-picker'), false);
    assert.equal(await hostPage.isVisible('#game-container canvas'), true);
    assert.equal(await countCanvases(), 1);
    assert.equal(await hostPage.isVisible(GAME_BACK_BUTTON), true);
    assert.equal(hostSocketCount, 1);
    await waitUntil(firstDotShows, { message: 'the first player\'s card in the running game' });
    await saveScreenshot(hostPage, 'm5a-2-host-game');
  });

  test('a phone that reloads gets the game id again and goes straight back into the game', async () => {
    await ana.page.reload();
    const state = await nextState(ana);
    assert.equal(state.gameId, 'input-lab');
    await ana.page.waitForSelector('#pad-screen', { state: 'visible' });
  });

  test('Back to games needs two clicks, then the picker shows and every phone reads "The game ended"', async () => {
    await hostPage.click(GAME_BACK_BUTTON);
    assert.match(await hostPage.getAttribute(GAME_BACK_BUTTON, 'class'), /\barmed\b/);
    await hostPage.waitForTimeout(500);
    assert.equal(await ana.page.isVisible('#pad-screen'), true);
    await saveScreenshot(hostPage, 'm5a-3-host-back-armed');

    await hostPage.click(GAME_BACK_BUTTON);
    for (const player of [ana, bo]) {
      await player.page.waitForSelector('#ended-screen:not([hidden])');
      assert.equal(await player.page.textContent('#ended-text'), 'The game ended');
      assert.equal(await player.page.isVisible('#pad-screen'), false);
    }
    // The game's canvas and container are gone, and the picker is back with the room closed.
    await hostPage.waitForSelector('#game-picker:not([hidden])');
    assert.equal(await hostPage.isVisible(GAME_BACK_BUTTON), false);
    assert.equal(await hostPage.isVisible('#game-container'), false);
    assert.equal(await countCanvases(), 0);
    await saveScreenshot(hostPage, 'm5a-4-host-back-on-picker');
  });

  test('the game can be played again after it ended, in a room of its own with a new code', async () => {
    const firstCode = roomCode;
    roomCode = await startGame(hostPage, { gameId: 'input-lab' });
    assert.notEqual(roomCode, firstCode);
    assert.equal(hostSocketCount, 2);
    assert.equal(await hostPage.locator('#join-players [data-player-id]').count(), 0);

    // Ana joins the new room from "Join another"; the name is kept.
    await ana.page.click('#ended-join-button');
    await ana.page.fill('#room-code', roomCode);
    await ana.page.click('#join-button');
    await ana.page.waitForSelector('#pad-screen', { state: 'visible' });
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    await waitUntil(firstDotShows, { message: 'the first player\'s card in the second run' });
    assert.equal(await countCanvases(), 1);
    await bo.context.close();
    await ana.context.close();
  });
});
