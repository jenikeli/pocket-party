// Browser tests for M6a, the 3D performance spike: it starts from the lobby with no phones, draws with Three.js
// (loaded through the host page's import map), splits into 4 views, takes every switch without an error, frees
// its WebGL context at End game, shows phones a note, and a lost WebGL context ends it cleanly.
// Headless Chromium draws WebGL in software (about 1 fps with the full look at this size), so the host page is
// half the usual size and most checks run with the look's costs switched off. The real numbers come from the
// device run, not from here.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader, findColor } from '../helpers/screenshot-pixels.js';
import { confirmClick, START_BUTTON, NEXT_GAME_BUTTON, GAME_END_BUTTON } from '../helpers/host-buttons.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

// The lobby is drawn at 1920x1080 and scaled to fit, so on a 960x540 page every button is at half its position.
const HOST_SIZE = { width: 960, height: 540 };
const half = (point) => ({ x: point.x / 2, y: point.y / 2 });
const LOOK_SWITCHES = ['shadows', 'glossy', 'bloom', 'particles', 'detailedKarts'];
// From host/games/spike-3d/view-layout.js at 960x540: the 4 px gaps between the 4 views (columns 478-481, rows
// 268-271). findColor's right and bottom edges are exclusive.
const VERTICAL_GAP = { left: 478, top: 380, right: 482, bottom: 470 };
const HORIZONTAL_GAP = { left: 500, top: 268, right: 900, bottom: 272 };

describe('M6a 3D spike', () => {
  let server;
  let browser;
  let pixelReader;
  let hostPage;
  let hostMessages;
  let roomCode;
  const pageErrors = [];

  function switchButton(key, value) {
    return value === undefined ? `#spike-panel button[data-key="${key}"]` : `#spike-panel button[data-key="${key}"][data-value="${value}"]`;
  }

  async function setSwitch(key, on) {
    const button = switchButton(key);
    if ((await hostPage.getAttribute(button, 'aria-pressed')) !== String(on)) {
      await hostPage.click(button);
    }
    assert.equal(await hostPage.getAttribute(button, 'aria-pressed'), String(on));
  }

  function countCanvases() {
    return hostPage.evaluate(() => document.querySelectorAll('canvas').length);
  }

  async function startSpike() {
    await hostPage.mouse.click(half(START_BUTTON).x, half(START_BUTTON).y);
    // The load line is written after the first frame, which compiles every shader.
    await hostPage.waitForFunction(() => document.querySelector('#spike-load')?.textContent.includes('first frame'), null, {
      timeout: 40000,
    });
  }

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    pixelReader = await openPixelReader(browser);
    hostPage = await browser.newPage({ viewport: HOST_SIZE });
    hostPage.on('pageerror', (error) => pageErrors.push(error));
    hostMessages = watchServerMessages(hostPage);
    await hostPage.goto(`${server.baseUrl}/host`);
    roomCode = (await hostMessages.nextOfType(MESSAGE_TYPES.ROOM_CREATED, 10000)).roomCode;
    // Input lab, Kart race 2D, then the spike.
    for (let i = 0; i < 2; i += 1) {
      await hostPage.mouse.click(half(NEXT_GAME_BUTTON).x, half(NEXT_GAME_BUTTON).y);
      await hostPage.waitForTimeout(300);
    }
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('the spike starts with no phones, loads Three.js and reports the load and frame times', async () => {
    await startSpike();
    const load = await hostPage.textContent('#spike-load');
    assert.match(load, /Load: \d+ files, [\d.]+ MB over the network/);
    assert.equal(await hostPage.isVisible('#shell'), false);
    assert.equal(await hostPage.isVisible('#game-container canvas'), true);
    await waitUntil(async () => (await hostPage.textContent('#spike-stats')).includes('draw calls'), {
      timeoutMs: 15000,
      message: 'the frame readout',
    });
    await saveScreenshot(hostPage, 'm6a-1-host-plain');
  });

  test('4 views split the canvas into quarters with dark gaps between them', async () => {
    for (const key of LOOK_SWITCHES) {
      await setSwitch(key, false);
    }
    await hostPage.click(switchButton('views', 4));
    assert.equal(await hostPage.getAttribute(switchButton('views', 4), 'aria-pressed'), 'true');
    await waitUntil(
      async () => {
        const png = await hostPage.screenshot();
        const vertical = await findColor(pixelReader, png, 0x000000, VERTICAL_GAP);
        const horizontal = await findColor(pixelReader, png, 0x000000, HORIZONTAL_GAP);
        // Every pixel of each gap.
        return vertical.count === 4 * 90 && horizontal.count === 400 * 4;
      },
      { timeoutMs: 15000, message: 'black gaps between the 4 views' },
    );
    await saveScreenshot(hostPage, 'm6a-2-host-4-views-plain');
  });

  // One cost at a time: with all of them on, software rendering takes about a second a frame.
  test('every switch and choice works without an error', async () => {
    await hostPage.click(switchButton('views', 1));
    await hostPage.click(switchButton('karts', 4));
    assert.equal(await hostPage.getAttribute(switchButton('karts', 4), 'aria-pressed'), 'true');
    for (const key of [...LOOK_SWITCHES, 'fullResolution', 'cap30']) {
      await setSwitch(key, true);
      if (key === 'detailedKarts') {
        await waitUntil(async () => (await hostPage.textContent('#spike-stats')).includes('10912 triangles per kart'), {
          timeoutMs: 10000,
          message: 'the readout with detailed karts',
        });
      }
      await setSwitch(key, false);
    }
    assert.deepEqual(pageErrors, []);
  });

  test('End game frees the spike\'s canvas and returns to the lobby', async () => {
    await confirmClick(hostPage, GAME_END_BUTTON);
    await hostPage.waitForSelector('#shell:not([hidden])', { timeout: 20000 });
    assert.equal(await hostPage.isVisible('#game-container'), false);
    assert.equal(await countCanvases(), 1);
  });

  test('a phone in the room is told the spike runs on the host; a lost WebGL context ends the spike', async () => {
    const context = await browser.newContext(devices['Pixel 7']);
    const phone = await context.newPage();
    await phone.goto(`${server.baseUrl}/?room=${roomCode}`);
    await phone.fill('#player-name', 'Ana');
    await phone.click('#join-button');
    await phone.click('#ready-button');
    await phone.waitForSelector('#ready-button[aria-pressed="true"]');
    await startSpike();
    await phone.waitForSelector('#spike-note');

    // What happens when the browser takes the graphics memory back (it can, on an iPad under pressure).
    const stopped = hostPage.waitForEvent('console', (entry) => entry.text().includes('3D spike (dev) stopped with an error'));
    await hostPage.evaluate(() => {
      document.querySelector('#game-container canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();
    });
    await stopped;
    await hostPage.waitForSelector('#shell:not([hidden])');
    await phone.waitForSelector('#lobby-screen:not([hidden])');
    await saveScreenshot(hostPage, 'm6a-4-host-context-lost');
  });
});
