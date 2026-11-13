// Browser tests for M9, Palm Bay Airport on real pages: the setup screen offers it first and pressed; a race on
// it (plain course, for speed) shows karts gliding across the bay and landing, a spin post giving a spin boost,
// and a lap finishing; and one look shot on the full course shows the airport drawn. No phone can steer blind
// round this course, so the karts are Watch's stand-ins (the setup screen's Watch buttons), which drive
// themselves with the CPU driver and are listed with their state in the Tuning readout. The readout is polled
// while the race runs and what it showed is checked: "gliding" at the glide's share of the lap, "spin boost",
// the results panel. Headless Chromium draws WebGL in software, so the host page is half the usual size and
// starts at Medium quality (test/helpers/kart-3d-host.js).

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader } from '../helpers/screenshot-pixels.js';
import { startGame, clickNow } from '../helpers/host-buttons.js';
import { presetQuality, presetPlainCourse, pickCourse, clickWatch, GAME_START_TIMEOUT, STARTING_TIMEOUT } from '../helpers/kart-3d-host.js';
import { PALM_BAY_AIRPORT } from '../../host/games/kart-3d/palm-bay-airport.js';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const HOST_SIZE = { width: 960, height: 540 };
// The glide runs from its lip (s 1116) to its landing (1206); the readout shows a kart's place in whole percent
// of the lap. The jump before the ring (614 to 630) is at 40 to 41 percent, well clear.
const track = buildTrack(PALM_BAY_AIRPORT);
const GLIDE_PERCENT = { from: Math.floor((1116 / track.length) * 100), to: Math.ceil((1206 / track.length) * 100) };
const RACE_SECONDS = 300;

// Opens a host page on the 3D race's setup screen with Ana joined; `prepare(hostPage)` runs before the page
// loads (the quality and course presets).
async function startAtSetup(server, chromium, prepare) {
  const hostPage = await chromium.newPage({ viewport: HOST_SIZE });
  const hostMessages = watchServerMessages(hostPage);
  await prepare(hostPage);
  const roomCode = await openHost(hostPage, server.baseUrl, hostMessages);
  const context = await chromium.newContext(devices['Pixel 7 landscape']);
  const anaPage = await context.newPage();
  await anaPage.goto(`${server.baseUrl}/?room=${roomCode}`);
  await anaPage.fill('#player-name', 'Ana');
  await anaPage.click('#join-button');
  await anaPage.waitForSelector('#lobby-screen:not([hidden])');
  await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
  await startGame(hostPage, anaPage, { gameId: 'kart-3d', controlsSelector: '#kart-setup', timeoutMs: GAME_START_TIMEOUT });
  await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
  return hostPage;
}

describe('M9 Palm Bay Airport', () => {
  let server;
  let chromium;
  let hostPage;
  const pageErrors = [];

  before(async () => {
    server = await startServer();
    chromium = await launchBrowser('chromium');
  });

  after(async () => {
    await chromium?.close();
    await server?.stop();
  });

  test('the setup screen offers Palm Bay Airport first, pressed', async () => {
    hostPage = await startAtSetup(server, chromium, async (page) => {
      page.on('pageerror', (error) => pageErrors.push(error));
      await presetQuality(page, 'medium');
      await presetPlainCourse(page);
    });
    const names = await hostPage.locator('[data-course-id]').allTextContents();
    assert.equal(names[0], 'Palm Bay Airport');
    assert.equal(await hostPage.getAttribute('[data-course-id="palm-bay-airport"]', 'aria-pressed'), 'true');
    await saveScreenshot(hostPage, 'm9-0-host-setup');
  });

  // Hard stand-ins drive the lap with the CPU driver; a lap is enough. The readout (Tuning panel) is read every
  // 250 ms until the results show; its lines are "View n: <speed>, <surface>, <percent> round[, spin boost]".
  test('stand-ins glide across the bay and land, a spin post gives a spin boost, and the lap finishes', { timeout: (RACE_SECONDS + 60) * 1000 }, async () => {
    await clickNow(hostPage, '[data-cpu-level="hard"]');
    await clickNow(hostPage, '#kart-3d-laps-minus', 5);
    await waitUntil(async () => (await hostPage.textContent('#kart-3d-laps')) === '1', { message: 'one lap' });
    await clickWatch(hostPage, 4);
    await hostPage.waitForSelector('.kart-3d-view-hud:not([hidden])');
    await clickNow(hostPage, '#kart-3d-tuning-button');
    await hostPage.waitForSelector('#kart-3d-readout:not([hidden])');

    // Per view: seen gliding at the glide's share of the lap, then back on the road past it. Also whether
    // any view fell off in the glide's range, and whether any had a spin boost.
    const glidingViews = new Set();
    const landedViews = new Set();
    let spinBoostSeen = false;
    let fellInGlide = false;
    const deadline = Date.now() + RACE_SECONDS * 1000;
    while (Date.now() < deadline && !(await hostPage.isVisible('#kart-3d-results'))) {
      const text = await hostPage.textContent('#kart-3d-readout');
      for (const match of text.matchAll(/^(View \d): .*?, (gliding|in the air|road|off-road|fell off)(?:, anti-gravity)?, (\d+)% round(.*)$/gm)) {
        const [, view, surface, percentText, rest] = match;
        const percent = Number(percentText);
        const inGlideRange = percent >= GLIDE_PERCENT.from && percent <= GLIDE_PERCENT.to;
        if (surface === 'gliding' && inGlideRange) {
          glidingViews.add(view);
        } else if (glidingViews.has(view) && surface === 'road' && percent > GLIDE_PERCENT.to) {
          landedViews.add(view);
        }
        fellInGlide ||= surface === 'fell off' && inGlideRange;
        spinBoostSeen ||= rest.includes('spin boost');
      }
      await hostPage.waitForTimeout(250);
    }
    await saveScreenshot(hostPage, 'm9-1-host-after-lap');
    assert.ok(glidingViews.size > 0, 'a kart was gliding at the glide');
    assert.ok(landedViews.size > 0, 'a kart that glided was back on the road past the glide');
    assert.equal(fellInGlide, false, 'no glide ended in the bay');
    assert.ok(spinBoostSeen, 'a kart got a spin boost off a post');
    assert.ok(await hostPage.isVisible('#kart-3d-results'), 'the lap finished: the results show');
    assert.deepEqual(pageErrors, []);
    // Closed so its drawing does not slow the next test's page, which loads on the same CPU.
    await hostPage.close();
  });

  test('the full course at the start has the terminal side drawn', { timeout: STARTING_TIMEOUT + 120000 }, async () => {
    const pixelReader = await openPixelReader(chromium);
    const page = await startAtSetup(server, chromium, (each) => presetQuality(each, 'medium'));
    await pickCourse(page, 'palm-bay-airport');
    await clickWatch(page, 1);
    await page.waitForSelector('.kart-3d-view-hud:not([hidden])', { timeout: GAME_START_TIMEOUT });
    await page.waitForTimeout(3000);
    const png = await saveScreenshot(page, 'm9-2-host-airport-start');
    const stats = await pixelReader.evaluate(async (base64) => {
      const { data, width, height } = await window.decodePng(base64);
      // The left half of the view, where the terminal side of the start straight lies: how many distinct coarse
      // colours it holds and how much of it the most common one fills.
      const colours = new Map();
      for (let y = 0; y < height; y += 4) {
        for (let x = 0; x < width / 2; x += 4) {
          const offset = (y * width + x) * 4;
          const key = `${data[offset] >> 4},${data[offset + 1] >> 4},${data[offset + 2] >> 4}`;
          colours.set(key, (colours.get(key) ?? 0) + 1);
        }
      }
      const total = [...colours.values()].reduce((sum, count) => sum + count, 0);
      return { distinct: colours.size, commonShare: Math.max(...colours.values()) / total };
    }, png.toString('base64'));
    assert.ok(stats.distinct > 40, `the view is not blank (${stats.distinct} colours)`);
    assert.ok(stats.commonShare < 0.6, `no one colour fills the view (${stats.commonShare.toFixed(2)})`);
  });
});
