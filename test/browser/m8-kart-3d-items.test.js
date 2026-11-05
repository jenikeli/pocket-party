// Browser test for M8, the 3D race's items on real pages: with Items on and one item allowed per race (all nine
// items, one race each), a one-lap race where Ana (an Android phone, auto-accelerate, so no touch is needed to
// drive) goes through the first row of item boxes; her phone's views show the roulette, then the held item; a
// press of the Item button shows what the item does (a running effect on the phone's view and a ring in the
// host's HUD; nothing for the blocker and ramp, which go on the road; the "Teleport!" banner); the race keeps
// running. With Items off the view's item is null. Headless Chromium draws WebGL in software, so the host page is
// half the usual size and starts at Medium quality on the plain course (test/helpers/kart-3d-host.js).

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

  test('the setup screen\'s Items row has a button for each of the nine items; one lap is set', async () => {
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    assert.equal(await hostPage.getAttribute('#kart-3d-items-button', 'aria-pressed'), 'true');
    const ids = await hostPage.locator('[data-item-id]').evaluateAll((buttons) => buttons.map((button) => button.dataset.itemId));
    assert.deepEqual([...ids].sort(), Object.values(KART_ITEMS).sort());
    await clickNow(hostPage, '#kart-3d-laps-minus', 5);
    await waitUntil(async () => (await hostPage.textContent('#kart-3d-laps')) === '1', { message: 'one lap' });
    await saveScreenshot(hostPage, 'm8-0-host-setup-items');
  });

  // Allows only `id` on the setup screen (the buttons keep their state from race to race). The row redraws on
  // the host's next frame, which software drawing makes slow, so each click waits for its button to change.
  async function allowOnly(id) {
    for (const each of Object.values(KART_ITEMS)) {
      const selector = `[data-item-id="${each}"]`;
      const wanted = String(each === id);
      if ((await hostPage.getAttribute(selector, 'aria-pressed')) !== wanted) {
        await clickNow(hostPage, selector);
        await waitUntil(async () => (await hostPage.getAttribute(selector, 'aria-pressed')) === wanted, { ...RACE_TIMEOUT, message: `${each} set to ${wanted}` });
      }
    }
  }

  // One race for `id`: leave the running race for the setup screen (not the first time), allow only `id`, start,
  // drive through the first row, press the Item button once. Returns the first view after the press that shows
  // what the item did (an effect, or the item gone for items that put something on the road).
  async function useItem(id, firstRace) {
    if (!firstRace) {
      await clickNow(hostPage, '#kart-3d-setup-button');
      await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
      await ana.page.waitForSelector('#kart-setup:not([hidden])');
    }
    await allowOnly(id);
    await startRace();
    const rolling = await nextView((view) => view.phase === 'racing' && view.item?.rolling === true);
    assert.equal(rolling.item.held, null);
    const held = await nextView((view) => view.item?.held === id);
    assert.equal(held.item.rolling, false);
    assert.equal(await ana.page.isVisible('#kart-item-slot'), true);
    await waitUntil(async () => hostPage.isVisible('.kart-3d-view-hud:not([hidden]) .kart-3d-item-frame'), { ...RACE_TIMEOUT, message: 'the item frame' });
    await pressItemButton();
    return nextView((view) => view.item && view.item.held === null && !view.item.rolling);
  }

  // The nine items, each used once in a race of its own. `shows` is what the item must show after the press.
  const TIMED_EFFECT = 'effect on the phone\'s view and a ring in the host\'s HUD';
  const ITEM_CHECKS = [
    { id: KART_ITEMS.BIG, shows: TIMED_EFFECT },
    { id: KART_ITEMS.SMALL, shows: TIMED_EFFECT },
    { id: KART_ITEMS.BOUNCY, shows: TIMED_EFFECT },
    { id: KART_ITEMS.MAGNET, shows: TIMED_EFFECT },
    { id: KART_ITEMS.PUSH, shows: TIMED_EFFECT },
    { id: KART_ITEMS.STICKY, shows: TIMED_EFFECT },
    { id: KART_ITEMS.BLOCKER, shows: 'no effect (a blocker stands on the road)' },
    { id: KART_ITEMS.RAMP, shows: 'no effect (a ramp lies on the road)' },
    { id: KART_ITEMS.TELEPORT, shows: 'the "Teleport!" banner over the host\'s view' },
  ];

  ITEM_CHECKS.forEach(({ id, shows }, index) => {
    test(`${id}: picked up, used once, shows ${shows}; the game keeps running`, async () => {
      const after = await useItem(id, index === 0);
      if (shows === TIMED_EFFECT) {
        assert.ok(after.item.effects.some((effect) => effect.item === id), `${id} running: ${JSON.stringify(after.item.effects)}`);
        await hostPage.waitForSelector('.kart-3d-view-hud:not([hidden]) .kart-3d-effect-ring', { timeout: 30000 });
      } else if (id === KART_ITEMS.TELEPORT) {
        await hostPage.waitForFunction(() => [...document.querySelectorAll('.kart-3d-view-banner')].some((banner) => banner.textContent === 'Teleport!'),
          null, { timeout: 30000, polling: 'raf' });
      } else {
        assert.deepEqual(after.item.effects, []);
        assert.equal(await hostPage.locator('.kart-3d-effect-ring').count(), 0);
      }
      await saveScreenshot(hostPage, `m8-1-host-${id}`);
      if (index === 0) {
        await saveScreenshot(ana.page, 'm8-2-phone-effect');
      }
      assert.equal(await hostPage.isVisible('#kart-3d-setup'), false, 'the game keeps running');
      assert.equal(await ana.page.isVisible('#kart-controls'), true);
    });
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
