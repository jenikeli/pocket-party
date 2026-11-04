// Browser test for M8a, the 3D race's items on real pages: with Items on and only Big allowed, a one-lap race
// where Ana (an Android phone, auto-accelerate, so no touch is needed to drive) goes through the first row of
// item boxes; her phone's views show the roulette, then the held item; a press of the Item button gives a running
// effect on the phone's view and the host's HUD frame and ring; the race keeps running. With Items off the
// view's item is null. Headless Chromium draws WebGL in software, so the host page is half the usual size and
// starts at Medium quality on the plain course (test/helpers/kart-3d-host.js).

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { startGame, clickNow, NEXT_GAME_BUTTON } from '../helpers/host-buttons.js';
import { presetQuality, presetPlainCourse, GAME_START_TIMEOUT } from '../helpers/kart-3d-host.js';
import { MESSAGE_TYPES, KART_ITEMS } from '../../shared/protocol.js';

const HOST_SIZE = { width: 960, height: 540 };
// The lobby is drawn at 1920x1080 and scaled to fit the half-size page.
const HOST_SCALE = 0.5;
const RACE_TIMEOUT = { timeoutMs: 90000 };
const ALLOWED_ITEM = KART_ITEMS.BIG;
// How long the Item button is held: the host reads the controls once per step and a frame can take seconds.
const ITEM_PRESS_MS = 400;

describe('M8a items', () => {
  let server;
  let chromium;
  let hostPage;
  let hostMessages;
  let roomCode;
  let ana;
  const pageErrors = [];

  async function nextView(check) {
    while (true) {
      const state = await ana.messages.nextOfType(MESSAGE_TYPES.CONTROLLER_STATE, 90000);
      if (state.view && check(state.view)) {
        return state.view;
      }
    }
  }

  // Ana taps Ready on her setup screen, the host clicks Start, and the phone shows the race's controls.
  async function startRace() {
    await ana.page.click('#kart-ready-button');
    await ana.page.waitForSelector('#kart-ready-button[aria-pressed="true"]');
    await hostPage.waitForSelector('#kart-3d-start-button:not([disabled])');
    await clickNow(hostPage, '#kart-3d-start-button');
    await ana.page.waitForSelector('#kart-controls:not([hidden])');
  }

  async function pressItemButton() {
    const box = await ana.page.locator('#kart-item-slot').boundingBox();
    await ana.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await ana.page.mouse.down();
    await ana.page.waitForTimeout(ITEM_PRESS_MS);
    await ana.page.mouse.up();
  }

  before(async () => {
    server = await startServer();
    chromium = await launchBrowser('chromium');
    hostPage = await chromium.newPage({ viewport: HOST_SIZE });
    hostPage.on('pageerror', (error) => pageErrors.push(error));
    hostMessages = watchServerMessages(hostPage);
    await presetQuality(hostPage, 'medium');
    await presetPlainCourse(hostPage);
    await hostPage.goto(`${server.baseUrl}/host`);
    roomCode = (await hostMessages.nextOfType(MESSAGE_TYPES.ROOM_CREATED, 10000)).roomCode;
    const context = await chromium.newContext(devices['Pixel 7 landscape']);
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(error));
    ana = { page, messages: watchServerMessages(page) };
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.fill('#player-name', 'Ana');
    await page.click('#join-button');
    await page.click('#ready-button');
    await page.waitForSelector('#ready-button[aria-pressed="true"]');
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    // Input lab, Kart race 2D, then Kart race 3D.
    for (let i = 0; i < 2; i += 1) {
      await hostPage.mouse.click(NEXT_GAME_BUTTON.x * HOST_SCALE, NEXT_GAME_BUTTON.y * HOST_SCALE);
      await hostPage.waitForTimeout(300);
    }
    await startGame(hostPage, page, '#kart-setup', HOST_SCALE, GAME_START_TIMEOUT);
    await page.click('[data-choice="autoAccelerate"][data-value="true"]');
    await page.waitForSelector('[data-choice="autoAccelerate"][data-value="true"][aria-pressed="true"]');
  });

  after(async () => {
    await chromium?.close();
    await server?.stop();
  });

  test('the setup screen\'s Items row allows one item; one lap is set', async () => {
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    assert.equal(await hostPage.getAttribute('#kart-3d-items-button', 'aria-pressed'), 'true');
    const ids = await hostPage.locator('[data-item-id]').evaluateAll((buttons) => buttons.map((button) => button.dataset.itemId));
    assert.ok(ids.includes(ALLOWED_ITEM) && ids.length >= 3, `an item button each: ${ids}`);
    for (const id of ids.filter((each) => each !== ALLOWED_ITEM)) {
      await clickNow(hostPage, `[data-item-id="${id}"]`);
    }
    // The row redraws on the host's next frame, which software drawing makes slow.
    await waitUntil(async () => (await hostPage.locator('[data-item-id][aria-pressed="true"]').count()) === 1, { ...RACE_TIMEOUT, message: 'one item allowed' });
    assert.equal(await hostPage.getAttribute(`[data-item-id="${ALLOWED_ITEM}"]`, 'aria-pressed'), 'true');
    await clickNow(hostPage, '#kart-3d-laps-minus', 5);
    await waitUntil(async () => (await hostPage.textContent('#kart-3d-laps')) === '1', { message: 'one lap' });
    await saveScreenshot(hostPage, 'm8-0-host-setup-items');
  });

  test('through the first row of boxes the phone rolls, then holds the item', async () => {
    await startRace();
    const rolling = await nextView((view) => view.phase === 'racing' && view.item?.rolling === true);
    assert.deepEqual(rolling.item.effects, []);
    const held = await nextView((view) => view.item?.held);
    assert.equal(held.item.held, ALLOWED_ITEM);
    assert.equal(held.item.rolling, false);
    assert.equal(await ana.page.isVisible('#kart-item-slot'), true);
  });

  test('a press of the Item button starts the effect on the phone\'s view and the host\'s HUD', async () => {
    await waitUntil(async () => hostPage.isVisible('.kart-3d-view-hud:not([hidden]) .kart-3d-item-frame'), { ...RACE_TIMEOUT, message: 'the item frame' });
    await pressItemButton();
    const using = await nextView((view) => view.item?.effects.length > 0);
    assert.equal(using.item.effects[0].item, ALLOWED_ITEM);
    assert.equal(using.item.held, null);
    await hostPage.waitForSelector('.kart-3d-view-hud:not([hidden]) .kart-3d-effect-ring', { timeout: 30000 });
    assert.equal(await hostPage.locator('.kart-3d-effect-ring').count(), 1);
    await saveScreenshot(hostPage, 'm8-1-host-effect');
    await saveScreenshot(ana.page, 'm8-2-phone-effect');
    assert.equal(await hostPage.isVisible('#kart-3d-setup'), false, 'the game keeps running');
    assert.equal(await ana.page.isVisible('#kart-controls'), true);
  });

  test('with Items off the view\'s item is null and the phone has no Item button', async () => {
    await clickNow(hostPage, '#kart-3d-setup-button');
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    await ana.page.waitForSelector('#kart-setup:not([hidden])');
    await clickNow(hostPage, '#kart-3d-items-button');
    await hostPage.waitForSelector('#kart-3d-items-button[aria-pressed="false"]');
    await startRace();
    // Views of the earlier race may still be queued; the first racing view with no item is this race's.
    const view = await nextView((each) => each.phase === 'racing' && each.item === null);
    assert.equal(view.item, null);
    assert.equal(await ana.page.isVisible('#kart-item-slot'), false);
    assert.equal(await hostPage.locator('.kart-3d-view-hud:not([hidden]) .kart-3d-item-frame:not([hidden])').count(), 0);
    assert.deepEqual(pageErrors, []);
  });
});
