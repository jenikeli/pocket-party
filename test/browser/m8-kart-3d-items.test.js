// Browser test for M8, the 3D race's items on real pages: with Items on and one item allowed per race (all six
// items, one race each), a one-lap race where Ana (an Android phone, auto-accelerate, so no touch is needed to
// drive) goes through the first row of item boxes; her phone's views show the roulette, then the held item; a
// press of the Item button shows what the item does (a running effect on the phone's view and a ring in the
// host's HUD; nothing for the blocker, which goes on the road, and the jump, which throws the kart up; the
// "Teleport!" banner); the race keeps running. With Items off the view's item is null. Headless Chromium draws
// WebGL in software, so the host page is half the usual size and starts at Medium quality on the plain course
// (test/helpers/kart-3d-host.js).

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { startGame, clickNow, readyOnStick } from '../helpers/host-buttons.js';
import { presetQuality, presetPlainCourse, clickStartRace, GAME_START_TIMEOUT, STARTING_TIMEOUT } from '../helpers/kart-3d-host.js';
import { MESSAGE_TYPES, KART_ITEMS } from '../../shared/protocol.js';

const HOST_SIZE = { width: 960, height: 540 };
const RACE_TIMEOUT = { timeoutMs: 90000 };

describe('M8 items', () => {
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
    await readyOnStick(ana.page);
    await clickStartRace(hostPage);
    await ana.page.waitForSelector('#kart-controls:not([hidden])');
  }

  // Holds the Item button down until `released()` says the host used the item, then lets go. The host reads the
  // controls once per step, and in software a frame (and its steps) can be delayed by seconds, so a press of a
  // fixed short time can fall between two reads and never be seen; a held button always is (a phone's real
  // tap is read at 60 steps a second).
  async function holdItemButtonUntil(released) {
    const box = await ana.page.locator('#kart-item-slot').boundingBox();
    await ana.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await ana.page.mouse.down();
    try {
      return await released();
    } finally {
      await ana.page.mouse.up();
    }
  }

  before(async () => {
    server = await startServer();
    chromium = await launchBrowser('chromium');
    hostPage = await chromium.newPage({ viewport: HOST_SIZE });
    hostPage.on('pageerror', (error) => pageErrors.push(error));
    hostMessages = watchServerMessages(hostPage);
    await presetQuality(hostPage, 'medium');
    await presetPlainCourse(hostPage);
    await openHost(hostPage, server.baseUrl);
    roomCode = await startGame(hostPage, { gameId: 'kart-3d', timeoutMs: GAME_START_TIMEOUT });
    const context = await chromium.newContext(devices['Pixel 7 landscape']);
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(error));
    ana = { page, messages: watchServerMessages(page) };
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.fill('#player-name', 'Ana');
    await page.click('#join-button');
    await page.waitForSelector('#kart-setup:not([hidden])');
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    await page.click('[data-choice="autoAccelerate"]');
    await page.waitForSelector('[data-choice="autoAccelerate"][aria-pressed="true"]');
  });

  after(async () => {
    await chromium?.close();
    await server?.stop();
  });

  test('the setup screen\'s Items row has a button for each of the six items; one lap is set', async () => {
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    const ids = await hostPage.locator('[data-item-id]').evaluateAll((buttons) => buttons.map((button) => button.dataset.itemId));
    assert.deepEqual([...ids].sort(), Object.values(KART_ITEMS).sort());
    // Each item is an icon alone, named by its aria-label and title; there is no separate On switch any more.
    const named = await hostPage.locator('[data-item-id]').evaluateAll((buttons) =>
      buttons.every((button) => button.textContent.trim() === '' && button.getAttribute('aria-label') && button.title));
    assert.equal(named, true, 'the item buttons hold no text and have a name');
    assert.equal(await hostPage.locator('#kart-3d-items-button').count(), 0);
    // The row has its word, like the card's other rows.
    assert.equal(await hostPage.textContent('.k3d-rule:has([data-item-id]) > span'), 'Items');
    await clickNow(hostPage, '#kart-3d-laps-minus', 5);
    await waitUntil(async () => (await hostPage.textContent('#kart-3d-laps')) === '1', { message: 'one lap' });
    await saveScreenshot(hostPage, 'm8-0-host-setup-items');
  });

  // Allows only `id` on the setup screen, or none at all for null: every item off is items off. The buttons keep
  // their state from race to race. The row redraws on the host's next frame, which software drawing makes slow, so each click waits for its button to change.
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
      await clickNow(hostPage, '#kart-3d-setup-button', 2);
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
    return holdItemButtonUntil(() => nextView((view) => view.item && view.item.held === null && !view.item.rolling));
  }

  // The six items, each used once in a race of its own. `shows` is what the item must show after the press.
  const TIMED_EFFECT = 'effect on the phone\'s view and a ring in the host\'s HUD';
  const ITEM_CHECKS = [
    { id: KART_ITEMS.MAGNET, shows: TIMED_EFFECT },
    { id: KART_ITEMS.PUSH, shows: TIMED_EFFECT },
    { id: KART_ITEMS.STICKY, shows: TIMED_EFFECT },
    { id: KART_ITEMS.BLOCKER, shows: 'no effect (a blocker stands on the road)' },
    { id: KART_ITEMS.JUMP, shows: 'no effect (the kart is thrown up)' },
    { id: KART_ITEMS.TELEPORT, shows: 'the "Teleport!" banner over the host\'s view' },
  ];

  ITEM_CHECKS.forEach(({ id, shows }, index) => {
    test(`${id}: picked up, used once, shows ${shows}; the game keeps running`, { timeout: STARTING_TIMEOUT }, async () => {
      const viewAfterPress = await useItem(id, index === 0);
      const effects = viewAfterPress.item.effects;
      if (shows === TIMED_EFFECT) {
        assert.ok(effects.some((effect) => effect.item === id), `${id} running: ${JSON.stringify(effects)}`);
        await hostPage.waitForSelector(`.kart-3d-view-hud:not([hidden]) .kart-3d-effect-ring[data-item="${id}"]`, { timeout: 30000 });
      } else if (id === KART_ITEMS.TELEPORT) {
        await hostPage.waitForFunction(() => [...document.querySelectorAll('.kart-3d-view-banner')].some((banner) => banner.textContent === 'Teleport!'),
          null, { timeout: 30000, polling: 'raf' });
      } else {
        assert.deepEqual(effects, []);
        // The host has drawn the used item (its box empty) before the rings are counted, so none is left over.
        await hostPage.waitForSelector('.kart-3d-view-hud:not([hidden]) .kart-3d-item-box:not(:has(svg))', { timeout: 30000 });
        assert.equal(await hostPage.locator('.kart-3d-view-hud:not([hidden]) .kart-3d-effect-ring').count(), 0);
      }
      await saveScreenshot(hostPage, `m8-1-host-${id}`);
      if (index === 0) {
        await saveScreenshot(ana.page, 'm8-2-phone-effect');
      }
      // The item was used mid-race (not at the results), and the page threw nothing. (A phone's view is sent only
      // when it changes, so no later view can be waited for: after a jump nothing changes until the results.)
      assert.equal(viewAfterPress.phase, 'racing');
      assert.deepEqual(pageErrors, []);
      assert.equal(await hostPage.isVisible('#kart-3d-setup'), false, 'the game keeps running');
      assert.equal(await ana.page.isVisible('#kart-controls'), true);
    });
  });

  test('with every item off (items off) the view\'s item is null and the phone has no Item button', async () => {
    await clickNow(hostPage, '#kart-3d-setup-button', 2);
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    await ana.page.waitForSelector('#kart-setup:not([hidden])');
    await allowOnly(null);
    await startRace();
    // Views of the earlier race may still be queued; the first racing view with no item is this race's.
    const view = await nextView((each) => each.phase === 'racing' && each.item === null);
    assert.equal(view.item, null);
    assert.equal(await ana.page.isVisible('#kart-item-slot'), false);
    assert.equal(await hostPage.locator('.kart-3d-view-hud:not([hidden]) .kart-3d-item-frame:not([hidden])').count(), 0);
    assert.deepEqual(pageErrors, []);
  });
});
