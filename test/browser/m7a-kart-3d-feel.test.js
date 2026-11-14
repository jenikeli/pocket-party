// Browser tests for M7a, the 3D race's feel pass on real pages: the host's tuning panel (a slider per tuned
// number that changes the drive at once, and Copy values, with a text box when the clipboard refuses), the
// phones' layout for tilt (Drift on the left; Brake left of Go, the Item place above Go), with the buttons still
// working from their new places. Ana is an Android phone (Chromium, real touches) and Bo an iPhone (WebKit). Headless Chromium draws WebGL in software, so the host page is
// half the usual size and starts at Medium quality (test/helpers/kart-3d-host.js).

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openTouchscreen } from '../helpers/touch.js';
import { startGame, clickNow } from '../helpers/host-buttons.js';
import { presetQuality, presetPlainCourse, clickStartRace, GAME_START_TIMEOUT, STARTING_TIMEOUT } from '../helpers/kart-3d-host.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';
import { TUNABLES } from '../../host/games/kart-3d/tuning.js';

const HOST_SIZE = { width: 960, height: 540 };
const DRIVE_TIMEOUT = { timeoutMs: 60000 };
const GO_FINGER = 1;
const DRIFT_FINGER = 2;

describe('M7a 3D feel', () => {
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
    const player = { page, name: playerName };
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.fill('#player-name', playerName);
    await page.click('#join-button');
    await page.waitForSelector('#kart-setup:not([hidden])');
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    return player;
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

  // Moves a slider the way a finger does: its value changes and it fires input.
  async function setSlider(key, value) {
    const index = TUNABLES.findIndex((tunable) => tunable.key === key);
    await hostPage.evaluate(({ index, value }) => {
      const slider = document.querySelectorAll('#kart-3d-tuning input[type="range"]')[index];
      slider.value = String(value);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }, { index, value });
  }

  // Shows a driving view on the player's page through the page's own controls module, as the host makes one.
  // With items on (M8), so the Item button shows in its place: with items off it is hidden.
  function showView(player, steering, autoAccelerate) {
    const item = { held: null, rolling: false, effects: [] };
    return player.page.evaluate(async (view) => {
      const controls = await import('/controller/kart/controls.js');
      controls.showView(view, { name: 'Ana', color: '#e74c3c' });
    }, { phase: 'racing', steering: steering, autoAccelerate: autoAccelerate, leftHanded: false, countdown: null, spark: null, start: null, lap: 1, laps: 3, place: 1, finalLap: false, finished: false, item });
  }

  before(async () => {
    server = await startServer();
    chromium = await launchBrowser('chromium');
    webkit = await launchBrowser('webkit');
    const hostContext = await chromium.newContext({ viewport: HOST_SIZE });
    await hostContext.grantPermissions(['clipboard-read', 'clipboard-write']);
    hostPage = await hostContext.newPage();
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
    for (const player of [ana, bo]) {
      await player.page.click('#kart-ready-button');
      await player.page.waitForSelector('#kart-ready-button[aria-pressed="true"]');
    }
    await clickStartRace(hostPage);
    for (const player of [ana, bo]) {
      await player.page.waitForSelector('#kart-controls:not([hidden])');
    }
  }, { timeout: STARTING_TIMEOUT });

  after(async () => {
    await chromium?.close();
    await webkit?.close();
    await server?.stop();
  });

  test('the Tuning button opens a slider for every tuned number, each showing its value', async () => {
    assert.equal(await hostPage.isVisible('#kart-3d-tuning'), false);
    assert.equal(await hostPage.isVisible('#kart-3d-readout'), false, 'the readout is hidden with the popup');
    await clickNow(hostPage, '#kart-3d-tuning-button');
    await hostPage.waitForSelector('#kart-3d-tuning:not([hidden])');
    // The readout lives in the popup and shows exactly while it is open.
    assert.equal(await hostPage.locator('#kart-3d-tuning #kart-3d-readout').count(), 1);
    assert.equal(await hostPage.isVisible('#kart-3d-readout'), true);
    assert.equal(await hostPage.locator('#kart-3d-tuning input[type="range"]').count(), TUNABLES.length);
    const firstRow = await hostPage.locator('#kart-3d-tuning label').first().textContent();
    assert.equal(firstRow, 'Top speed32.0 units/s');
    await setSlider('topSpeed', 44);
    assert.equal(await hostPage.locator('#kart-3d-tuning .tuning-value').first().textContent(), '44.0 units/s');
    await saveScreenshot(hostPage, 'm7a-1-host-tuning-panel');
  });

  test('a slider changes the drive at once: with top speed 44 Ana\'s kart goes past the default top speed of 32', async () => {
    const go = await centerOf(ana, '#kart-accelerate');
    await ana.touch.press(GO_FINGER, go.x, go.y);
    await waitUntil(async () => Number((await readout()).match(/Ana: ([\d.]+) units\/s/)?.[1]) > 34, {
      ...DRIVE_TIMEOUT,
      message: 'Ana faster than 32 units/s',
    });
    await ana.touch.release(GO_FINGER);
  });

  test('Copy values puts every value on the clipboard, changed ones with their default', async () => {
    await clickNow(hostPage, '#kart-3d-tuning-copy');
    await hostPage.waitForFunction(() => document.getElementById('kart-3d-tuning-status').textContent === 'Copied');
    const text = await hostPage.evaluate(() => navigator.clipboard.readText());
    assert.match(text, /\ntopSpeed = 44 {3}\(default 32\)\n/);
    assert.equal(text.split('\n').length, TUNABLES.length + 1);
    // A browser that refuses the clipboard gets the text in a box to copy by hand.
    await hostPage.evaluate(() => {
      navigator.clipboard.writeText = () => Promise.reject(new Error('refused in the test'));
    });
    await clickNow(hostPage, '#kart-3d-tuning-copy');
    await hostPage.waitForSelector('#kart-3d-tuning-text:not([hidden])');
    assert.match(await hostPage.inputValue('#kart-3d-tuning-text'), /topSpeed = 44/);
  });

  test('Reset puts the defaults back, Close closes the panel, and Back to setup hides it', async () => {
    await clickNow(hostPage, '#kart-3d-tuning-reset');
    assert.equal(await hostPage.locator('#kart-3d-tuning .tuning-value').first().textContent(), '32.0 units/s');
    await clickNow(hostPage, '#kart-3d-tuning-close');
    assert.equal(await hostPage.isVisible('#kart-3d-tuning'), false);
    assert.equal(await hostPage.isVisible('#kart-3d-readout'), false);
    await clickNow(hostPage, '#kart-3d-tuning-button');
    await hostPage.waitForSelector('#kart-3d-tuning:not([hidden])');
    await clickNow(hostPage, '#kart-3d-setup-button', 2);
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    assert.equal(await hostPage.isVisible('#kart-3d-tuning'), false);
    // The phones are on the setup screen now; the next tests show driving views on them by hand.
    for (const player of [ana, bo]) {
      await player.page.waitForSelector('#kart-setup:not([hidden])');
    }
  });

  test('with tilt, Drift takes the left side; the tilt panel sits in the status; Brake left of Go, the Item place above both', async () => {
    for (const player of [ana, bo]) {
      await showView(player, 'tilt', false);
      const [tilt, status, item, drift, brake, go] = await Promise.all(
        ['#kart-tilt-zone', '#kart-status', '#kart-item-slot', '#kart-drift', '#kart-brake', '#kart-accelerate'].map((selector) => boxOf(player, selector)),
      );
      assert.ok(drift.x + drift.width <= status.x + 1, `${player.name}: Drift left of the status`);
      assert.ok(drift.height > 1.8 * brake.height, `${player.name}: Drift two rows tall`);
      assert.ok(tilt.x >= status.x - 1 && tilt.x + tilt.width <= status.x + status.width + 1, `${player.name}: the tilt panel in the status column`);
      assert.ok(brake.x + brake.width <= go.x + 1 && brake.x >= status.x + status.width - 1, `${player.name}: Brake left of Go, on the right`);
      assert.ok(Math.abs(item.x - brake.x) < 1 && item.y + item.height <= go.y + 1, `${player.name}: the Item place above Brake and Go`);
      await showView(player, 'tilt', true);
      const [autoItem, autoBrake] = await Promise.all(['#kart-item-slot', '#kart-brake'].map((selector) => boxOf(player, selector)));
      assert.ok(Math.abs(autoItem.x - autoBrake.x) < 1 && autoBrake.y >= autoItem.y + autoItem.height - 1, `${player.name}: with auto-accelerate Brake under the Item place`);
    }
    await showView(ana, 'tilt', false);
    await saveScreenshot(ana.page, 'm7a-2-phone-tilt-layout');
  });

  test('in the tilt layout Drift on the left and Brake on the right still press and release', async () => {
    const drift = await centerOf(ana, '#kart-drift');
    await ana.touch.press(DRIFT_FINGER, drift.x, drift.y);
    assert.equal(await ana.page.getAttribute('#kart-drift', 'class'), 'kart-pedal held');
    await ana.touch.release(DRIFT_FINGER);
    await waitUntil(async () => (await ana.page.getAttribute('#kart-drift', 'class')) === 'kart-pedal', { message: 'Ana\'s Drift released' });
    await bo.page.click('#kart-brake');
    await waitUntil(async () => !(await bo.page.getAttribute('#kart-brake', 'class')).includes('held'), { message: 'Bo\'s Brake released' });
    assert.deepEqual(pageErrors, []);
  });
});
