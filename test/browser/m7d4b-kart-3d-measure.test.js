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
import { launchBrowser, watchServerMessages, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { startGame, clickNow, NEXT_GAME_BUTTON } from '../helpers/host-buttons.js';
import { presetQuality, GAME_START_TIMEOUT } from '../helpers/kart-3d-host.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const HOST_SIZE = { width: 960, height: 540 };
// The lobby is drawn at 1920x1080 and scaled to fit the half-size page.
const HOST_SCALE = 0.5;

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
    await hostPage.goto(`${server.baseUrl}/host`);
    const { roomCode } = await hostMessages.nextOfType(MESSAGE_TYPES.ROOM_CREATED, 10000);
    const context = await chromium.newContext(devices['Pixel 7 landscape']);
    const ana = await context.newPage();
    ana.on('pageerror', (error) => pageErrors.push(error));
    await ana.goto(`${server.baseUrl}/?room=${roomCode}`);
    await ana.fill('#player-name', 'Ana');
    await ana.click('#join-button');
    await ana.click('#ready-button');
    await ana.waitForSelector('#ready-button[aria-pressed="true"]');
    // Input lab, Kart race 2D, then Kart race 3D.
    for (let i = 0; i < 2; i += 1) {
      await hostPage.mouse.click(NEXT_GAME_BUTTON.x * HOST_SCALE, NEXT_GAME_BUTTON.y * HOST_SCALE);
      await hostPage.waitForTimeout(300);
    }
    await startGame(hostPage, ana, '#kart-setup', HOST_SCALE, GAME_START_TIMEOUT);
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
  });

  after(async () => {
    await chromium?.close();
    await server?.stop();
  });

  // Each case draws 11 software frames (about half a second each), so the first look takes about a minute.
  test('Measure runs from the setup screen with a progress line, and Stop gives a report', { timeout: 180000 }, async () => {
    await clickNow(hostPage, '#kart-3d-measure-button');
    await hostPage.waitForSelector('#kart-3d-measure:not([hidden])');
    await waitUntil(async () => (await hostPage.textContent('#kart-3d-measure-progress')).startsWith('Measuring'), { message: 'the progress line' });
    assert.equal(await hostPage.isVisible('#kart-3d-setup'), false, 'the setup panel is out of the way');
    assert.equal(await hostPage.isVisible('#kart-3d-measure-copy'), false);
    await saveScreenshot(hostPage, 'm7d4b-1-host-measuring');
    // Every case of the first look (High), 1 and 4 views, then Stop.
    await waitUntil(async () => (await hostPage.textContent('#kart-3d-measure-progress')).includes(': Medium,'), {
      timeoutMs: 150000,
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
