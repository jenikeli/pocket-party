// Browser tests for M6c, the 3D race's techniques on real pages: the phones get the Drift button above Go with
// the Item button's place kept free (Drift takes Go's place with auto-accelerate), both screens count down, a
// Go pressed after the phone shows "2" is judged and logged in the host's readout, holding Drift with the stick
// over drifts the kart, the Drift button takes the spark colour of a view, and Restart starts another
// countdown. Ana is an Android phone (Chromium, real touches) on the stick and Go; Bo an iPhone (WebKit) on
// auto-accelerate. Headless Chromium draws WebGL in software, so the host page is
// half the usual size and starts at Medium quality (test/helpers/kart-3d-host.js).

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openTouchscreen } from '../helpers/touch.js';
import { startGame, clickNow } from '../helpers/host-buttons.js';
import { presetQuality, presetPlainCourse, pickCourse, waitForCourseBuilt, GAME_START_TIMEOUT, STARTING_TIMEOUT } from '../helpers/kart-3d-host.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const HOST_SIZE = { width: 960, height: 540 };
const DRIVE_TIMEOUT = { timeoutMs: 30000 };
// The stick is all the way over 80 px from where the finger lands (controller/inputs/drag.js).
const STICK_FULL_PX = 80;
// Fingers on Ana's touchscreen.
const GO_FINGER = 1;
const STICK_FINGER = 2;

describe('M6c 3D techniques', () => {
  let server;
  let chromium;
  let webkit;
  let hostPage;
  let hostMessages;
  let roomCode;
  let ana;
  let bo;
  const pageErrors = [];

  async function joinAs(browser, device, playerName) {
    const context = await browser.newContext(devices[device]);
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(error));
    const player = { page, messages: watchServerMessages(page), sentButtons: [], name: playerName };
    // The button inputs the phone sends, in order, to see what Go's double tap became.
    page.on('websocket', (socket) => socket.on('framesent', ({ payload }) => {
      const message = JSON.parse(payload);
      if (message.input?.kind === 'button') {
        player.sentButtons.push(`${message.input.button} ${message.input.pressed ? 'down' : 'up'}`);
      }
    }));
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.fill('#player-name', playerName);
    await page.click('#join-button');
    await page.waitForSelector('#kart-setup:not([hidden])');
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    return player;
  }

  async function nextView(player, check) {
    while (true) {
      const state = await player.messages.nextOfType(MESSAGE_TYPES.CONTROLLER_STATE, 60000);
      if (state.view && check(state.view)) {
        return state.view;
      }
    }
  }

  function readout() {
    return hostPage.textContent('#kart-3d-readout');
  }

  async function boxOf(player, selector) {
    return player.page.locator(selector).boundingBox();
  }

  async function centerOf(player, selector) {
    const box = await boxOf(player, selector);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  before(async () => {
    server = await startServer();
    chromium = await launchBrowser('chromium');
    webkit = await launchBrowser('webkit');
    hostPage = await chromium.newPage({ viewport: HOST_SIZE });
    hostPage.on('pageerror', (error) => pageErrors.push(error));
    hostMessages = watchServerMessages(hostPage);
    await presetQuality(hostPage, 'medium');
    await presetPlainCourse(hostPage);
    await openHost(hostPage, server.baseUrl);
    roomCode = await startGame(hostPage, { gameId: 'kart-3d', timeoutMs: GAME_START_TIMEOUT });
    ana = await joinAs(chromium, 'Pixel 7 landscape', 'Ana');
    ana.touch = await openTouchscreen(ana.page);
    bo = await joinAs(webkit, 'iPhone 13 landscape', 'Bo');
    await bo.page.waitForSelector('#kart-setup:not([hidden])');
    await bo.page.click('[data-choice="autoAccelerate"]');
    await bo.page.waitForSelector('[data-choice="autoAccelerate"][aria-pressed="true"]');
    for (const player of [ana, bo]) {
      await player.page.click('#kart-ready-button');
      await player.page.waitForSelector('#kart-ready-button[aria-pressed="true"]');
    }
    await pickCourse(hostPage, 'seaside-skyway');
    await hostPage.waitForSelector('#kart-3d-start-button:not([disabled])');
    // The tuned window opens 0.3 s after "2", and a press made when the phone shows "2" can arrive sooner on this
    // slow software-drawn host. This test is about the start being judged and logged, so the window opens at "2"
    // (the host page's own tuning module, the one its rules read).
    await hostPage.evaluate(async () => {
      const { setTuning } = await import('/host/games/kart-3d/tuning.js');
      setTuning('rocketFrom', 0);
    });
    await clickNow(hostPage, '#kart-3d-start-button');
    await waitForCourseBuilt(hostPage);
  }, { timeout: STARTING_TIMEOUT });

  after(async () => {
    await chromium?.close();
    await webkit?.close();
    await server?.stop();
  });

  test('with the stick there is no Drift button: Go drifts on a double tap, Brake left of it, the Item place above both', async () => {
    for (const player of [ana, bo]) {
      await player.page.waitForSelector('#kart-controls:not([hidden])');
      assert.equal(await player.page.isVisible('#kart-drift'), false);
      assert.equal(await player.page.isVisible('#kart-item-slot'), true);
      // With auto-accelerate too (Bo), since Go is also the drift.
      assert.equal(await player.page.isVisible('#kart-accelerate'), true);
    }
    const [item, brake, go] = await Promise.all(['#kart-item-slot', '#kart-brake', '#kart-accelerate'].map((selector) => boxOf(ana, selector)));
    assert.ok(brake.x + brake.width <= go.x + 1 && Math.abs(brake.y - go.y) < 1, 'Brake sits left of Go');
    assert.ok(item.y + item.height <= go.y + 1, 'the Item place is above Go');
    assert.ok(Math.abs(item.x - brake.x) < 1 && Math.abs(item.x + item.width - (go.x + go.width)) < 1, 'the Item place spans Brake and Go');
    assert.match(await ana.page.textContent('#kart-accelerate'), /tap, then hold: drift/);
    await saveScreenshot(ana.page, 'm6c-1-phone-stick-layout');
  });

  test('both screens count down; Go pressed once the phone shows "2" is judged at GO and its arrival logged', async () => {
    assert.match(await hostPage.textContent('#kart-3d-countdown'), /^[321]$/);
    await ana.page.waitForFunction(() => document.getElementById('kart-big').textContent === '2', null, { timeout: 30000 });
    const go = await centerOf(ana, '#kart-accelerate');
    await ana.touch.press(GO_FINGER, go.x, go.y);
    // The press left the phone after the host had shown "2", so it cannot arrive too early.
    const view = await nextView(ana, (each) => each.phase === 'racing' && each.start !== null);
    assert.ok(['rocket', 'normal'].includes(view.start), `start ${view.start}`);
    const match = (await readout()).match(/Ana: [^\n]*\n\s+Go after "2": \+(\d+\.\d\d) (\w+)/);
    assert.ok(match, 'the readout lists Ana\'s start');
    assert.equal(match[2], view.start);
    assert.match(await readout(), /round trip \d+ ms/);
  });

  test('a tap then a held press on Go with the stick right hops Ana\'s kart into a right drift', async () => {
    await waitUntil(async () => Number((await readout()).match(/Ana: ([\d.]+) units\/s/)?.[1]) > 10, {
      ...DRIVE_TIMEOUT,
      message: 'Ana\'s kart up to speed',
    });
    const stick = await centerOf(ana, '#kart-stick-zone');
    await ana.touch.press(STICK_FINGER, stick.x, stick.y);
    await ana.touch.move(STICK_FINGER, stick.x + STICK_FULL_PX / 2, stick.y);
    await ana.touch.move(STICK_FINGER, stick.x + STICK_FULL_PX, stick.y);
    // Go has been held since the countdown: let go, tap, and hold again within the double tap's window. The tap
    // and the press are sent without waiting between them: one awaited call can take longer than the window here.
    const go = await centerOf(ana, '#kart-accelerate');
    await ana.touch.release(GO_FINGER);
    await Promise.all([ana.touch.press(GO_FINGER, go.x, go.y), ana.touch.release(GO_FINGER), ana.touch.press(GO_FINGER, go.x, go.y)]);
    assert.equal(await ana.page.getAttribute('#kart-accelerate', 'class'), 'kart-pedal held');
    await waitUntil(() => ana.sentButtons.at(-1) === 'drift down', { message: 'Go\'s drift press sent' }).catch((error) => {
      throw new Error(`${error.message}; Ana sent: ${ana.sentButtons.join(', ')}`);
    });
    await waitUntil(async () => /Ana: [^\n]*drifting right/.test(await readout()), { ...DRIVE_TIMEOUT, message: 'Ana drifting right' });
    await saveScreenshot(hostPage, 'm6c-2-host-drifting');
    for (const finger of [STICK_FINGER, GO_FINGER]) {
      await ana.touch.release(finger);
    }
  });

  test('with the stick Go takes the colour of the spark level in the view', async () => {
    // Called on the page's own controls module, the one the game screen uses, with a view as the host makes it.
    const colors = await ana.page.evaluate(async () => {
      const controls = await import('/controller/kart/controls.js');
      const backgrounds = [];
      for (const spark of [null, 'blue', 'orange', 'purple']) {
        const view = { phase: 'racing', steering: 'stick', autoAccelerate: false, leftHanded: false, countdown: null, spark: spark, start: null, lap: 1, laps: 3, place: 1, finalLap: false, finished: false };
        controls.showView(view, { name: 'Ana', color: '#e74c3c' });
        backgrounds.push(getComputedStyle(document.getElementById('kart-accelerate')).backgroundColor);
      }
      return backgrounds;
    });
    assert.deepEqual(colors, ['rgb(31, 143, 79)', 'rgb(47, 128, 237)', 'rgb(230, 126, 34)', 'rgb(155, 81, 224)']);
  });

  test('Restart puts everyone back on the grid for another countdown', async () => {
    // Both phones' big text has shown their place since GO; a number there again is the new countdown.
    for (const player of [ana, bo]) {
      assert.match(await player.page.textContent('#kart-big'), /^\d+(st|nd|rd|th)$/);
    }
    // Restart throws the race away, so the first click only arms it (red); the second restarts.
    await clickNow(hostPage, '#kart-3d-restart-button');
    assert.match(await hostPage.getAttribute('#kart-3d-restart-button', 'class'), /\barmed\b/);
    await clickNow(hostPage, '#kart-3d-restart-button');
    for (const player of [ana, bo]) {
      await player.page.waitForFunction(() => /^[321]$/.test(document.getElementById('kart-big').textContent), null, { timeout: 30000 });
    }
    await hostPage.waitForSelector('#kart-3d-countdown:not([hidden])');
    await saveScreenshot(hostPage, 'm6c-3-host-countdown');
    assert.deepEqual(pageErrors, []);
  });
});
