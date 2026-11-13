// Browser test for the kart controls' turned layout (M10): on a portrait page the driving controls are drawn a
// quarter turn round, so a player with rotation lock on turns the phone with its top end in the left hand. It takes
// the place of M5b's old "phone held upright shows Turn your phone sideways" test. Two portrait Android phones
// (Chromium, real touches from test/helpers/touch.js) in the 2D race, which uses the same controls as the 3D one.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openTouchscreen } from '../helpers/touch.js';
import { startGame, startRace } from '../helpers/host-buttons.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

// controller/inputs/drag.js counts 80 px as a full push of the stick.
const FULL_PUSH_PX = 80;

describe('M10 kart controls on a portrait phone', () => {
  let server;
  let browser;
  let hostMessages;
  let roomCode;
  let ana;
  let bo;

  async function joinAs(playerName) {
    const context = await browser.newContext(devices['Pixel 7']);
    const page = await context.newPage();
    const touch = await openTouchscreen(page);
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.fill('#player-name', playerName);
    await page.click('#join-button');
    await page.waitForSelector('#kart-setup', { state: 'visible' });
    const { playerId } = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    return { page, touch, playerId };
  }

  async function centerOf(selector) {
    const box = await ana.page.locator(selector).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  // The next INPUT from Ana that `matches` (the setup screen's choices and other input come first).
  async function nextAnaInput(matches) {
    while (true) {
      const message = await hostMessages.nextOfType(MESSAGE_TYPES.INPUT, 5000);
      if (message.playerId === ana.playerId && matches(message.input)) {
        return message.input;
      }
    }
  }

  // Puts a finger on the stick's middle and drags it (dx, dy) page pixels; returns the first stick value that
  // reaches `reached`.
  async function dragStick(dx, dy, reached) {
    const stick = await centerOf('#kart-stick-zone');
    await ana.touch.press(0, stick.x, stick.y);
    await ana.touch.move(0, stick.x + dx / 2, stick.y + dy / 2);
    await ana.touch.move(0, stick.x + dx, stick.y + dy);
    const input = await nextAnaInput((each) => each.kind === 'drag' && reached(each));
    await ana.touch.release(0);
    return input;
  }

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    const hostPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    hostMessages = watchServerMessages(hostPage);
    await openHost(hostPage, server.baseUrl);
    roomCode = await startGame(hostPage, { gameId: 'kart-2d' });
    ana = await joinAs('Ana');
    bo = await joinAs('Bo');
    await startRace(hostPage, [ana.page, bo.page]);
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('the controls are drawn turned: no "turn your phone" block, the stick at the top end, the buttons at the bottom end', async () => {
    assert.equal(await ana.page.isVisible('#kart-controls'), true);
    const viewport = ana.page.viewportSize();
    assert.ok(viewport.height > viewport.width, 'the phone is in portrait');

    const stick = await centerOf('#kart-stick-zone');
    const status = await centerOf('#kart-status');
    const go = await centerOf('#kart-accelerate');
    assert.ok(stick.y < status.y && status.y < go.y, `top to bottom: stick ${stick.y}, status ${status.y}, Go ${go.y}`);
    for (const point of [stick, status, go]) {
      assert.ok(point.x > 0 && point.x < viewport.width && point.y > 0 && point.y < viewport.height, 'on the page');
    }
    await saveScreenshot(ana.page, 'm10-7-phone-portrait-controls');
  });

  test('a touch on Go where it is drawn presses it, and lifting the finger lets go', async () => {
    const go = await centerOf('#kart-accelerate');
    await ana.touch.press(1, go.x, go.y);
    assert.deepEqual(await nextAnaInput((input) => input.kind === 'button'), { kind: 'button', button: 'accelerate', pressed: true });
    await ana.touch.release(1);
    assert.deepEqual(await nextAnaInput((input) => input.kind === 'button'), { kind: 'button', button: 'accelerate', pressed: false });
  });

  test('dragging the stick down the page steers right, up the page steers left, and the knob follows', async () => {
    const right = await dragStick(0, FULL_PUSH_PX * 0.75, (input) => input.x > 0.5);
    assert.ok(right.x > 0.5 && Math.abs(right.y) < 0.1, `down the page: ${JSON.stringify(right)}`);

    const left = await dragStick(0, -FULL_PUSH_PX * 0.75, (input) => input.x < -0.5);
    assert.ok(left.x < -0.5 && Math.abs(left.y) < 0.1, `up the page: ${JSON.stringify(left)}`);

    // Along the page's width is the player's up and down, which the race does not use.
    const rightOfPage = await dragStick(FULL_PUSH_PX * 0.75, 0, (input) => input.y < -0.5);
    assert.ok(Math.abs(rightOfPage.x) < 0.1, `across the page: ${JSON.stringify(rightOfPage)}`);

    // The knob moves in the turned box, so a push to the player's right is a positive translateX there.
    const stick = await centerOf('#kart-stick-zone');
    await ana.touch.press(0, stick.x, stick.y);
    await ana.touch.move(0, stick.x, stick.y + FULL_PUSH_PX / 2);
    await ana.touch.move(0, stick.x, stick.y + FULL_PUSH_PX);
    await waitUntil(
      async () => /translateX\(([1-9]|[1-9]\d)/.test(await ana.page.getAttribute('#kart-stick-knob', 'style')),
      { message: 'the knob to move to the right of the stick' },
    );
    await saveScreenshot(ana.page, 'm10-8-phone-portrait-stick-right');
    await ana.touch.release(0);
  });
});
