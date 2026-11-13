// Browser tests for M7d4b, the 3D race's Measure tool: from the setup screen, Measure hides the setup panel and
// draws its cases with a progress line (no phone needs to do anything); Stop ends it early with a report of what
// it drew (the host, a row per look measured, "Stopped early"), which Copy puts on the clipboard; Close hides it
// and the setup screen is back, at the host's own quality; and no WebGL or shader error appears. (M7d4b2's drawing
// switches were removed in M7d4c1, and with them the test that flipped them.) Ana is an Android phone (Chromium). Headless Chromium draws WebGL in software, so the
// host page is half the usual size and starts at Medium (test/helpers/kart-3d-host.js); a whole run would take a
// quarter of an hour here, so the test stops it after the first look. The numbers themselves are for the iPad's
// device run.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { startGame, clickNow } from '../helpers/host-buttons.js';
import { presetQuality, pickCourse, GAME_START_TIMEOUT, STARTING_TIMEOUT } from '../helpers/kart-3d-host.js';

const HOST_SIZE = { width: 960, height: 540 };

describe('M7d4b 3D Measure tool', () => {
  let server;
  let chromium;
  let hostPage;
  let hostMessages;
  const pageErrors = [];
  // Three.js reports shader compile and WebGL errors on the console.
  const consoleErrors = [];

  before(async () => {
    server = await startServer();
    chromium = await launchBrowser('chromium');
    const hostContext = await chromium.newContext({ viewport: HOST_SIZE });
    // Copy writes to the clipboard, which the test reads back.
    await hostContext.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: server.baseUrl });
    hostPage = await hostContext.newPage();
    hostPage.on('pageerror', (error) => pageErrors.push(error));
    hostPage.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    hostMessages = watchServerMessages(hostPage);
    await presetQuality(hostPage, 'medium');
    const roomCode = await openHost(hostPage, server.baseUrl, hostMessages);
    const context = await chromium.newContext(devices['Pixel 7 landscape']);
    const ana = await context.newPage();
    ana.on('pageerror', (error) => pageErrors.push(error));
    await ana.goto(`${server.baseUrl}/?room=${roomCode}`);
    await ana.fill('#player-name', 'Ana');
    await ana.click('#join-button');
    await ana.waitForSelector('#lobby-screen:not([hidden])');
    // The host lists the player before Play, so the game starts with them in the room.
    await hostPage.waitForSelector('#lobby-players [data-player-id]');
    await startGame(hostPage, ana, { gameId: 'kart-3d', controlsSelector: '#kart-setup', timeoutMs: GAME_START_TIMEOUT });
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    // Seaside Skyway, which this file measures, is not the first course; it is built when Measure is clicked.
    await pickCourse(hostPage, 'seaside-skyway');
  }, { timeout: STARTING_TIMEOUT });

  after(async () => {
    await chromium?.close();
    await server?.stop();
  });

  // Each case draws 11 software frames (about half a second each), so the first look takes about a minute. The whole
  // test took 176 s before M9, at the edge of its old 180 s, and just over it since (M9): 240 s leaves a margin.
  test('Measure runs from the setup screen with a progress line, and Stop gives a report', { timeout: 240000 + GAME_START_TIMEOUT }, async () => {
    await clickNow(hostPage, '#kart-3d-measure-button');
    // The click first builds the course behind the loading screen, then Measure draws.
    await hostPage.waitForSelector('#kart-3d-measure:not([hidden])', { timeout: GAME_START_TIMEOUT });
    await waitUntil(async () => (await hostPage.textContent('#kart-3d-measure-progress')).startsWith('Measuring'), { timeoutMs: GAME_START_TIMEOUT, message: 'the progress line' });
    assert.equal(await hostPage.isVisible('#kart-3d-setup'), false, 'the setup panel is out of the way');
    assert.equal(await hostPage.isVisible('#kart-3d-measure-copy'), false);
    await saveScreenshot(hostPage, 'm7d4b-1-host-measuring');
    // Every case of the first look (High), 1 and 4 views, then Stop.
    await waitUntil(async () => (await hostPage.textContent('#kart-3d-measure-progress')).includes(': Medium,'), {
      timeoutMs: 210000,
      message: 'the second look to start',
    });
    await clickNow(hostPage, '#kart-3d-measure-stop');
    await hostPage.waitForSelector('#kart-3d-measure-report:not([hidden])', { timeout: 30000 });
    const report = await hostPage.textContent('#kart-3d-measure-report');
    assert.match(report, /^Measure, 3D race/);
    assert.match(report, /Course: Seaside Skyway; canvas 960x540 CSS px/);
    assert.doesNotMatch(report, /Drawing set/);
    assert.match(report, /\nHigh +\d+\.\d +\d+\.\d +\d+\.\d +\d+ +\d+ +\d+\.\d/, 'a row for High with both view counts');
    // Stop lands in the first Medium case, or just after it if that case finished first.
    assert.match(report, /Stopped early: (8|9) of \d+ cases drawn\./);
    assert.equal(await hostPage.isVisible('#kart-3d-measure-stop'), false);
    await saveScreenshot(hostPage, 'm7d4b-2-host-report');
  });

  test('Copy puts the report on the clipboard, and Close brings the setup screen back at the host\'s quality', async () => {
    await clickNow(hostPage, '#kart-3d-measure-copy');
    await waitUntil(async () => (await hostPage.textContent('#kart-3d-measure-status')) === 'Copied', { message: 'the report to be copied' });
    const copied = await hostPage.evaluate(() => navigator.clipboard.readText());
    assert.equal(copied, await hostPage.textContent('#kart-3d-measure-report'));
    await clickNow(hostPage, '#kart-3d-measure-close');
    await hostPage.waitForSelector('#kart-3d-measure', { state: 'hidden' });
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    assert.equal(await hostPage.getAttribute('[data-quality="medium"]', 'aria-pressed'), 'true');
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleErrors, []);
  });
});
