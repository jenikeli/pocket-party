// Browser tests for M7d2, the 3D race's kit of building blocks shown on the Test track: the course builds and
// draws with every piece (the textured road, the panels, the barriers, the gate, the decks and their props)
// without a WebGL or shader error, on the setup screen's overview and in a race; and the start lights over the
// grid follow the countdown, lighting red one by one and then green at GO. Ana is an Android phone (Chromium).
// Headless Chromium draws WebGL in software, so the host page is half the usual size and starts at Medium
// quality (test/helpers/kart-3d-host.js). Whether the pieces look right is for a person to see: the screenshots
// in test-results/screenshots/ and the device run.

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
// Where the start lights show from the back of the grid with one player (one view over the whole page): the
// middle of the page's upper half, above the karts and clear of the grandstand's crowd on the left.
const LIGHTS_AREA = { left: 330, top: 60, right: 630, bottom: 250 };
// A lit lamp, red or green, after tone mapping; the red boards on the gate and walls match too, but they do not
// change during the countdown.
const RED = [[190, 0, 0], [255, 110, 110]];
const GREEN = [[0, 190, 0], [130, 255, 170]];
// Each lamp covers about 30 pixels at this size.
const LAMP_PIXELS = 20;

describe('M7d2 3D kit on the Test track', () => {
  let server;
  let chromium;
  let hostPage;
  let hostMessages;
  let ana;
  const pageErrors = [];
  // Three.js reports shader compile and WebGL errors on the console.
  const consoleErrors = [];

  before(async () => {
    server = await startServer();
    chromium = await launchBrowser('chromium');
    hostPage = await chromium.newPage({ viewport: HOST_SIZE });
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
    ana = await context.newPage();
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

  // The countdown's number and how many pixels of LIGHTS_AREA look like a lit red or a lit green lamp, read in
  // one animation frame, right after the game drew it, so the two always match: a screenshot takes several
  // software-drawn frames here, longer than a number shows.
  function sampleFrame() {
    return hostPage.evaluate(
      ({ area, ranges }) =>
        new Promise((resolve) => {
          // Asked for now, this runs after the game's own callback in the next frame, before the frame is shown,
          // while the canvas still holds what the game drew.
          requestAnimationFrame(() => {
            const width = area.right - area.left;
            const height = area.bottom - area.top;
            const copy = new OffscreenCanvas(width, height).getContext('2d');
            copy.drawImage(document.querySelector('#game-container canvas'), area.left, area.top, width, height, 0, 0, width, height);
            const { data } = copy.getImageData(0, 0, width, height);
            const counts = ranges.map(([low, high]) => {
              let count = 0;
              for (let offset = 0; offset < data.length; offset += 4) {
                if ([0, 1, 2].every((channel) => data[offset + channel] >= low[channel] && data[offset + channel] <= high[channel])) {
                  count += 1;
                }
              }
              return count;
            });
            resolve({ number: document.querySelector('#kart-3d-countdown').textContent.trim(), red: counts[0], green: counts[1] });
          });
        }),
      { area: LIGHTS_AREA, ranges: [RED, GREEN] },
    );
  }

  after(async () => {
    await chromium?.close();
    await server?.stop();
  });

  test('the Test track is dressed with the kit and shows on the setup screen', async () => {
    await clickNow(hostPage, '[data-course-id="test-track"]');
    await hostPage.waitForSelector('[data-course-id="test-track"][aria-pressed="true"]');
    // A few frames of the overview, so the new course is drawn.
    await hostPage.waitForTimeout(2000);
    await saveScreenshot(hostPage, 'm7d2-1-host-setup-test-track');
  });

  // Every screenshot waits for a CPU-drawn frame, so this test gets longer than the usual 60 s.
  test('the start lights light red one by one with the countdown, then green at GO', { timeout: 120000 }, async () => {
    await ana.click('#kart-ready-button');
    await hostPage.waitForSelector('#kart-3d-start-button:not([disabled])');
    await clickNow(hostPage, '#kart-3d-start-button');
    const samples = new Map();
    await waitUntil(
      async () => {
        const { number, red, green } = await sampleFrame();
        // Nothing shows until the race's first frame. No screenshots in this loop: one takes longer than GO
        // shows.
        if (number !== '' && !samples.has(number)) {
          samples.set(number, { red, green });
        }
        return samples.has('GO!');
      },
      { timeoutMs: 90000, message: 'the countdown to reach GO' },
    );
    const at = (number) => samples.get(number) ?? assert.fail(`no frame showed "${number}" (saw ${[...samples.keys()].join(', ')})`);
    assert.ok(at('1').red >= at('3').red + 2 * LAMP_PIXELS, `three lamps lit at "1" (${at('1').red} red pixels) against one at "3" (${at('3').red})`);
    assert.ok(at('GO!').green >= at('3').green + 3 * LAMP_PIXELS, `all green at GO (${at('GO!').green} green pixels, ${at('3').green} before)`);
    assert.ok(at('GO!').red <= at('3').red, 'and no red lamp left');
  });

  test('the race draws on through the course with no page or WebGL errors', async () => {
    await waitUntil(async () => (await hostPage.textContent('#kart-3d-countdown')).trim() === '', { timeoutMs: 30000, message: 'the countdown to go' });
    // The lights are still green here, for a person to look at.
    await saveScreenshot(hostPage, 'm7d2-2-host-race');
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleErrors, []);
  });
});
