// Browser tests for M6c, the 3D race's techniques on real pages: the phones get the Drift button above Go with
// the Item button's place kept free (Drift takes Go's place with auto-accelerate), both screens count down, a
// Go pressed after the phone shows "2" is judged and logged in the host's readout, holding Drift with the stick
// over drifts the kart, the Drift button takes the spark colour of a view, and Restart starts another
// countdown. Ana is an Android phone (Chromium, real touches) on the stick and Go; Bo an iPhone (WebKit) on
// auto-accelerate. Headless Chromium draws WebGL in software, so the host page is half the usual size.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openTouchscreen } from '../helpers/touch.js';
import { startGame, clickNow, NEXT_GAME_BUTTON } from '../helpers/host-buttons.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const HOST_SIZE = { width: 960, height: 540 };
// The lobby is drawn at 1920x1080 and scaled to fit the half-size page.
const HOST_SCALE = 0.5;
const DRIVE_TIMEOUT = { timeoutMs: 30000 };
// The stick is all the way over 80 px from where the finger lands (controller/inputs/drag.js).
const STICK_FULL_PX = 80;
// Fingers on Ana's touchscreen.
const GO_FINGER = 1;
const STICK_FINGER = 2;
const DRIFT_FINGER = 3;

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
    const player = { page, messages: watchServerMessages(page), name: playerName };
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.fill('#player-name', playerName);
    await page.click('#join-button');
    await page.click('#ready-button');
    await page.waitForSelector('#ready-button[aria-pressed="true"]');
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
    await hostPage.goto(`${server.baseUrl}/host`);
    roomCode = (await hostMessages.nextOfType(MESSAGE_TYPES.ROOM_CREATED, 10000)).roomCode;
    ana = await joinAs(chromium, 'Pixel 7 landscape', 'Ana');
    ana.touch = await openTouchscreen(ana.page);
    bo = await joinAs(webkit, 'iPhone 13 landscape', 'Bo');
    // Input lab, Kart race 2D, then the 3D test drive.
    for (let i = 0; i < 2; i += 1) {
      await hostPage.mouse.click(NEXT_GAME_BUTTON.x * HOST_SCALE, NEXT_GAME_BUTTON.y * HOST_SCALE);
      await hostPage.waitForTimeout(300);
    }
    await startGame(hostPage, ana.page, '#kart-setup', HOST_SCALE);
    await bo.page.waitForSelector('#kart-setup:not([hidden])');
    await bo.page.click('[data-choice="autoAccelerate"][data-value="true"]');
    await bo.page.waitForSelector('[data-choice="autoAccelerate"][data-value="true"][aria-pressed="true"]');
    for (const player of [ana, bo]) {
      await player.page.click('#kart-ready-button');
      await player.page.waitForSelector('#kart-ready-button[aria-pressed="true"]');
    }
    await hostPage.waitForSelector('#kart-3d-start-button:not([disabled])');
    await clickNow(hostPage, '#kart-3d-start-button');
  });

  after(async () => {
    await chromium?.close();
    await webkit?.close();
    await server?.stop();
  });

  test('the phones show Drift above Go with the Item place free; with auto-accelerate Drift takes the whole right side', async () => {
    for (const player of [ana, bo]) {
      await player.page.waitForSelector('#kart-controls:not([hidden])');
      assert.equal(await player.page.isVisible('#kart-drift'), true);
      assert.equal(await player.page.isVisible('#kart-item-slot'), true);
    }
    const [item, drift, brake, go] = await Promise.all(['#kart-item-slot', '#kart-drift', '#kart-brake', '#kart-accelerate'].map((selector) => boxOf(ana, selector)));
    assert.ok(drift.y + drift.height <= go.y + 1 && Math.abs(drift.x - go.x) < 1, 'Drift sits right above Go');
    assert.ok(item.x + item.width <= drift.x + 1 && Math.abs(item.y - drift.y) < 1, 'the Item place is left of Drift');
    assert.ok(Math.abs(brake.x - item.x) < 1 && brake.y >= item.y + item.height - 1, 'Brake is under the Item place');
    assert.equal(await bo.page.isVisible('#kart-accelerate'), false);
    const [boDrift, boBrake] = await Promise.all(['#kart-drift', '#kart-brake'].map((selector) => boxOf(bo, selector)));
    assert.ok(boDrift.height > 1.8 * boBrake.height, 'Bo\'s Drift is two rows tall');
    await saveScreenshot(ana.page, 'm6c-1-phone-drift-button');
  });

  test('both screens count down; Go pressed once the phone shows "2" is judged at GO and its arrival logged', async () => {
    assert.match(await hostPage.textContent('#kart-3d-countdown'), /^[321]$/);
    await ana.page.waitForFunction(() => document.getElementById('kart-big').textContent === '2', null, { timeout: 30000 });
    const go = await centerOf(ana, '#kart-accelerate');
    await ana.touch.press(GO_FINGER, go.x, go.y);
    // The press left the phone after the host had shown "2", so it cannot arrive too early.
    const view = await nextView(ana, (each) => each.phase === 'driving' && each.start !== null);
    assert.ok(['rocket', 'normal'].includes(view.start), `start ${view.start}`);
    const match = (await readout()).match(/Ana: [^\n]*\n\s+Go after "2": \+(\d+\.\d\d) (\w+)/);
    assert.ok(match, 'the readout lists Ana\'s start');
    assert.equal(match[2], view.start);
    assert.match(await readout(), /round trip \d+ ms/);
  });

  test('holding Drift with the stick right hops Ana\'s kart into a right drift', async () => {
    await waitUntil(async () => Number((await readout()).match(/Ana: ([\d.]+) units\/s/)?.[1]) > 10, {
      ...DRIVE_TIMEOUT,
      message: 'Ana\'s kart up to speed',
    });
    const stick = await centerOf(ana, '#kart-stick-zone');
    await ana.touch.press(STICK_FINGER, stick.x, stick.y);
    await ana.touch.move(STICK_FINGER, stick.x + STICK_FULL_PX / 2, stick.y);
    await ana.touch.move(STICK_FINGER, stick.x + STICK_FULL_PX, stick.y);
    const drift = await centerOf(ana, '#kart-drift');
    await ana.touch.press(DRIFT_FINGER, drift.x, drift.y);
    assert.equal(await ana.page.getAttribute('#kart-drift', 'class'), 'kart-pedal held');
    await waitUntil(async () => /Ana: [^\n]*drifting right/.test(await readout()), { ...DRIVE_TIMEOUT, message: 'Ana drifting right' });
    await saveScreenshot(hostPage, 'm6c-2-host-drifting');
    for (const finger of [DRIFT_FINGER, STICK_FINGER, GO_FINGER]) {
      await ana.touch.release(finger);
    }
  });

  test('the Drift button takes the colour of the spark level in the view', async () => {
    // Called on the page's own controls module, the one the game screen uses, with a view as the host makes it.
    const colors = await ana.page.evaluate(async () => {
      const controls = await import('/controller/kart/controls.js');
      const backgrounds = [];
      for (const spark of [null, 'blue', 'orange', 'purple']) {
        controls.showView({ phase: 'driving', steering: 'stick', autoAccelerate: false, countdown: null, spark, start: null });
        backgrounds.push(getComputedStyle(document.getElementById('kart-drift')).backgroundColor);
      }
      return backgrounds;
    });
    assert.deepEqual(colors, ['rgb(74, 84, 112)', 'rgb(47, 128, 237)', 'rgb(230, 126, 34)', 'rgb(155, 81, 224)']);
  });

  test('Restart puts everyone back on the grid for another countdown', async () => {
    // Both phones' big text was empty since GO; a number there again is the new countdown.
    for (const player of [ana, bo]) {
      assert.equal(await player.page.textContent('#kart-big'), '');
    }
    await clickNow(hostPage, '#kart-3d-restart-button');
    for (const player of [ana, bo]) {
      await player.page.waitForFunction(() => /^[321]$/.test(document.getElementById('kart-big').textContent), null, { timeout: 30000 });
    }
    await hostPage.waitForSelector('#kart-3d-countdown:not([hidden])');
    await saveScreenshot(hostPage, 'm6c-3-host-countdown');
    assert.deepEqual(pageErrors, []);
  });
});
