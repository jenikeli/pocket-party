// Browser tests for M7c, the 3D race's look: the setup screen offers the Look setting (High, Medium, Low; High
// on a host that never chose), each level sets the drawing buffer's resolution, the choice is saved on the host
// and comes back the next time the game starts; on High the race is drawn through bloom and the gap between
// the split-screen views stays black; and no WebGL or shader error appears on the host. Ana and Cy are Android
// phones (Chromium). Headless Chromium draws WebGL in software, so the host page is half the usual size; this
// test runs the look at High, which the other 3D tests skip for speed (test/helpers/kart-3d-host.js). Whether
// the look is right (the karts, the dressed course, how much bloom) is for a person to see: the screenshots in
// test-results/screenshots/ and the device run.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader, findColor } from '../helpers/screenshot-pixels.js';
import { startGame, clickNow, goBackToPicker } from '../helpers/host-buttons.js';
import { clickStartRace, openTools, GAME_START_TIMEOUT, STARTING_TIMEOUT, RACE_VIEW_GAP } from '../helpers/kart-3d-host.js';
import { QUALITY_STORAGE_KEY } from '../../host/games/kart-3d/quality.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const HOST_SIZE = { width: 960, height: 540 };
const RACE_TIMEOUT = { timeoutMs: 60000 };

describe('M7c 3D look', () => {
  let server;
  let chromium;
  let pixelReader;
  let hostPage;
  let hostMessages;
  let roomCode;
  let ana;
  let cy;
  const pageErrors = [];
  // Three.js reports shader compile and WebGL errors on the console.
  const consoleErrors = [];

  async function joinAs(playerName) {
    const context = await chromium.newContext(devices['Pixel 7 landscape']);
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(error));
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.fill('#player-name', playerName);
    await page.click('#join-button');
    await page.waitForSelector('#kart-setup:not([hidden])');
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    return { page, name: playerName };
  }

  // The host picks the 3D race on the picker and starts its setup screen, in a new room.
  async function startTheGame() {
    roomCode = await startGame(hostPage, { gameId: 'kart-3d', timeoutMs: GAME_START_TIMEOUT });
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
  }

  // The WebGL canvas's drawing buffer, in pixels.
  function bufferSize() {
    return hostPage.$eval('#game-container canvas', (canvas) => ({ width: canvas.width, height: canvas.height }));
  }

  // The quality buttons sit in the setup screen's "Display" drawer, so it is opened to see them press.
  async function chooseQuality(level) {
    await openTools(hostPage);
    await clickNow(hostPage, `[data-quality="${level}"]`);
    await hostPage.waitForSelector(`[data-quality="${level}"][aria-pressed="true"]`);
  }

  before(async () => {
    server = await startServer();
    chromium = await launchBrowser('chromium');
    pixelReader = await openPixelReader(chromium);
    hostPage = await chromium.newPage({ viewport: HOST_SIZE });
    hostPage.on('pageerror', (error) => pageErrors.push(error));
    hostPage.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    hostMessages = watchServerMessages(hostPage);
    await openHost(hostPage, server.baseUrl);
    await startTheGame();
    ana = await joinAs('Ana');
    cy = await joinAs('Cy');
  }, { timeout: STARTING_TIMEOUT });

  after(async () => {
    await chromium?.close();
    await server?.stop();
  });

  test('the setup screen offers High, Medium and Low; a host that never chose draws at High, at full size', async () => {
    assert.deepEqual(await hostPage.locator('[data-quality]').allTextContents(), ['High', 'Medium', 'Low']);
    assert.equal(await hostPage.getAttribute('[data-quality="high"]', 'aria-pressed'), 'true');
    assert.deepEqual(await bufferSize(), { width: 960, height: 540 });
    await saveScreenshot(hostPage, 'm7c-1-host-setup-high');
  });

  test('Low draws fewer pixels and Medium full size again; the choice is saved on the host', async () => {
    await chooseQuality('low');
    assert.deepEqual(await bufferSize(), { width: 672, height: 378 });
    assert.equal(await hostPage.evaluate((key) => localStorage.getItem(key), QUALITY_STORAGE_KEY), 'low');
    await chooseQuality('medium');
    assert.deepEqual(await bufferSize(), { width: 960, height: 540 });
    assert.equal(await hostPage.evaluate((key) => localStorage.getItem(key), QUALITY_STORAGE_KEY), 'medium');
    await chooseQuality('high');
  });

  // Every click and screenshot waits for CPU-drawn WebGL frames, which are slowest at High, so this test gets
  // longer than the usual 60 s: a margin kept from when a High frame took about 2 s.
  test('on High the race is drawn through bloom, and the gap between the two views stays black', { timeout: STARTING_TIMEOUT + 120000 }, async () => {
    for (const player of [ana, cy]) {
      await player.page.click('#kart-ready-button');
      await player.page.waitForSelector('#kart-ready-button[aria-pressed="true"]');
    }
    await clickStartRace(hostPage);
    const labels = hostPage.locator('.kart-3d-view-hud:not([hidden]) .kart-3d-view-label');
    await waitUntil(async () => (await labels.count()) === 2, { ...RACE_TIMEOUT, message: 'a label on each view' });
    await waitUntil(async () => (await findColor(pixelReader, await hostPage.screenshot(), 0x000000, RACE_VIEW_GAP)).count === 960 * 4, {
      ...RACE_TIMEOUT,
      message: 'a black gap between the two views',
    });
    await saveScreenshot(hostPage, 'm7c-2-host-race-high');
  });

  test('the saved choice comes back the next time the game starts', { timeout: STARTING_TIMEOUT }, async () => {
    await clickNow(hostPage, '#kart-3d-setup-button', 2);
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    await chooseQuality('low');
    await saveScreenshot(hostPage, 'm7c-3-host-setup-low');
    await goBackToPicker(hostPage);
    for (const player of [ana, cy]) {
      await player.page.waitForSelector('#ended-screen:not([hidden])');
    }
    await startTheGame();
    assert.equal(await hostPage.getAttribute('[data-quality="low"]', 'aria-pressed'), 'true');
    assert.deepEqual(await bufferSize(), { width: 672, height: 378 });
  });

  test('no page or WebGL errors on the way', () => {
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleErrors, []);
  });
});
