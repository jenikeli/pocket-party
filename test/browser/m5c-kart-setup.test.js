// Browser tests for M5c, the 2D race's setup screen and control styles: laps on the host, each phone's steering
// (stick or tilt) and auto-accelerate, Ready and Start race, tilt steering in landscape, a rejoining phone
// keeping its style, tilt falling back to the stick when refused, and Race again keeping the settings.
// Ana is an Android phone (Chromium, real touches from test/helpers/touch.js) on the stick with auto-accelerate;
// Bo is an iPhone (WebKit) steering by tilt. Since M10b the room is made by Play on the picker, so Ana joins the
// 2D race's setup screen alone first (it needs two players), then Bo. Headless browsers have no motion sensor, so Bo's page gets the iOS
// permission API stubbed and deviceorientation events fired by hand, as in the M3 tests.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader, findColor } from '../helpers/screenshot-pixels.js';
import { openTouchscreen } from '../helpers/touch.js';
import { startGame, startRace, clickNow, LAPS_MINUS_BUTTON, START_RACE_BUTTON, RACE_AGAIN_BUTTON } from '../helpers/host-buttons.js';
import { STEADY_LEFT } from '../helpers/kart-drivers.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const ANA_COLOR = 0xe74c3c;
const LOWER_HALF = { left: 0, top: 540, right: 1920, bottom: 1080 };
const RACE_TIMEOUT = { timeout: 120000 };
// drag.js counts 80 px as a full push; tilt.js counts 25 degrees as a full turn.
const STICK_LEFT_PX = Math.round(-STEADY_LEFT.steer * 80);
const TILT_LEFT_DEGREES = STEADY_LEFT.steer * 25;

// A setup view without its colour fields (colorIndex and the nine colors), which m11-colour-controls checks.
function withoutColors({ colors, colorIndex, ...rest }) {
  assert.equal(colors.length, 9);
  assert.equal(colors[colorIndex].takenBy, null, 'your own colour is not taken');
  return rest;
}

// Runs in Bo's pages before their scripts: the permission prompt iOS Safari has, answered with `answer`.
function stubTiltPermission(answer) {
  DeviceOrientationEvent.requestPermission = async () => answer;
}

describe('M5c 2D race setup screen and control styles', () => {
  let server;
  let chromium;
  let webkit;
  let pixelReader;
  let hostPage;
  let hostMessages;
  let roomCode;
  let ana;
  let bo;
  // Where Ana's kart was during the countdown.
  let anaOnGrid;

  // `tiltPermission`, if given, is how the stubbed iOS permission prompt answers.
  async function joinAs(browser, device, playerName, tiltPermission) {
    const context = await browser.newContext(devices[device]);
    if (tiltPermission) {
      await context.addInitScript(stubTiltPermission, tiltPermission);
    }
    const player = { context, name: playerName };
    await openPlayerPage(player);
    await player.page.fill('#player-name', playerName);
    await player.page.click('#join-button');
    await player.page.waitForSelector('#kart-setup', { state: 'visible' });
    player.playerId = (await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED)).playerId;
    return player;
  }

  // A new page in the player's context rejoins as the same player (same localStorage).
  async function openPlayerPage(player) {
    player.page = await player.context.newPage();
    player.messages = watchServerMessages(player.page);
    await player.page.goto(`${server.baseUrl}/?room=${roomCode}`);
  }

  async function nextView(player, check) {
    while (true) {
      const state = await player.messages.nextOfType(MESSAGE_TYPES.CONTROLLER_STATE, 60000);
      if (state.view && check(state.view)) {
        return state.view;
      }
    }
  }

  // The next INPUT the host receives from `player` that passes `check`.
  async function nextHostInput(player, check) {
    while (true) {
      const message = await hostMessages.nextOfType(MESSAGE_TYPES.INPUT, 10000);
      if (message.playerId === player.playerId && check(message.input)) {
        return message.input;
      }
    }
  }

  function tilt(player, beta, times = 1) {
    return player.page.evaluate(
      ({ beta, times }) => {
        for (let index = 0; index < times; index += 1) {
          window.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta, gamma: 80 }));
        }
      },
      { beta, times },
    );
  }

  // Taps `button` (the setup screen's Tilt, or Enable tilt) and fires readings until the phone has tilt running
  // (its Recenter button is no longer hidden, even while the setup screen covers it).
  async function turnTiltOn(player, button) {
    await player.page.click(button);
    await waitUntil(
      async () => {
        await tilt(player, 0);
        return (await player.page.$('#kart-recenter:not([hidden])')) !== null;
      },
      { message: 'tilt to start' },
    );
  }

  async function panelOnHost() {
    return hostPage.isVisible('#kart-2d-setup');
  }

  before(async () => {
    server = await startServer();
    chromium = await launchBrowser('chromium');
    webkit = await launchBrowser('webkit');
    pixelReader = await openPixelReader(chromium);
    hostPage = await chromium.newPage({ viewport: { width: 1920, height: 1080 } });
    hostMessages = watchServerMessages(hostPage);
    await openHost(hostPage, server.baseUrl);
    roomCode = await startGame(hostPage, { gameId: 'kart-2d' });
    ana = await joinAs(chromium, 'Pixel 7 landscape', 'Ana');
    ana.touch = await openTouchscreen(ana.page);
  });

  after(async () => {
    await chromium?.close();
    await webkit?.close();
    await server?.stop();
  });

  test('the race refuses to start with one player: the line says it needs 2, Start race is off, and a forced click starts nothing', async () => {
    await waitUntil(panelOnHost, { message: 'the setup panel on the host' });
    assert.equal(await hostPage.textContent('#kart-2d-setup-status'), 'Needs 2 players');
    assert.equal(await hostPage.isDisabled(START_RACE_BUTTON), true);
    // The setup lists the players under a heading; the "Scan the code to join" line is only for an empty room.
    assert.equal(await hostPage.textContent('.k2d-subheading'), 'Players');
    assert.equal(await hostPage.isVisible('#kart-2d-join-line'), false);
    assert.equal(await hostPage.textContent('.kart-laps-label'), 'Laps');
    // The phone says to turn it sideways, and (headless browsers refuse the wake lock) that its screen may sleep.
    assert.equal(await ana.page.textContent('#kart-turn-note'), 'Turn your phone sideways when the race starts');
    // Shown once the wake lock's refusal comes back, which is asynchronous.
    await ana.page.waitForSelector('#wake-note:not([hidden])');
    // Ready turns green with a tick, and still says "Ready".
    assert.equal(await ana.page.textContent('#kart-ready-button'), 'Ready');
    await ana.page.click('#kart-ready-button');
    await ana.page.waitForSelector('#kart-ready-button[aria-pressed="true"]');
    assert.equal(await ana.page.textContent('#kart-ready-button'), 'Ready');
    assert.equal(await ana.page.locator('#kart-ready-button svg').count(), 1, 'a tick once ready');
    await saveScreenshot(ana.page, 'm5c-0-android-ready');
    // On the host her row shows a tick and "Ready" (hidden while the player is not ready).
    await hostPage.waitForSelector('.kart-player-row.ready .kart-player-tick');
    assert.equal(await hostPage.isVisible('.kart-player-row.ready .kart-player-tick'), true);
    assert.equal(await hostPage.textContent('.kart-player-row.ready .kart-player-tick'), 'Ready');
    // Everyone present is ready, yet it still needs a second player.
    await hostPage.waitForTimeout(500);
    assert.equal(await hostPage.textContent('#kart-2d-setup-status'), 'Needs 2 players');
    assert.equal(await hostPage.isDisabled(START_RACE_BUTTON), true);
    await hostPage.evaluate((selector) => {
      const button = document.querySelector(selector);
      button.disabled = false;
      button.click();
    }, START_RACE_BUTTON);
    await hostPage.waitForTimeout(500);
    assert.equal(await ana.page.isVisible('#kart-setup'), true, 'still on the setup screen');
    assert.equal(await panelOnHost(), true);
    await ana.page.click('#kart-ready-button');
    await ana.page.waitForSelector('#kart-ready-button[aria-pressed="false"]');
    bo = await joinAs(webkit, 'iPhone 13 landscape', 'Bo', 'granted');
    await waitUntil(async () => (await hostPage.textContent('#kart-2d-setup-status')) === 'Waiting for Ana, Bo', {
      message: 'the line to wait for both players',
    });
  });

  test('the setup screen shows the defaults on the phones and the setup panel on the host', async () => {
    const view = await nextView(bo, (each) => each.phase === 'setup');
    assert.deepEqual(withoutColors(view), { phase: 'setup', laps: 3, steering: 'stick', autoAccelerate: false, ready: false, leftHanded: false });
    await bo.page.waitForSelector('#kart-setup:not([hidden])');
    assert.equal(await bo.page.isVisible('#kart-controls'), false);
    assert.equal(await bo.page.getAttribute('[data-value="stick"]', 'aria-pressed'), 'true');
    assert.equal(await bo.page.getAttribute('[data-choice="autoAccelerate"]', 'aria-pressed'), 'false');
    await waitUntil(panelOnHost, { message: 'the setup panel on the host' });
  });

  test('the host sets the laps; the phones show them', async () => {
    await clickNow(hostPage, LAPS_MINUS_BUTTON, 2);
    await nextView(ana, (view) => view.laps === 1);
    await waitUntil(async () => (await ana.page.textContent('#kart-setup-laps')) === '1 lap', { message: '"1 lap" on the phone' });
  });

  test('each phone picks its control style: Ana auto-accelerate, Bo tilt', async () => {
    await ana.page.click('[data-choice="autoAccelerate"]');
    assert.deepEqual(await nextHostInput(ana, (input) => input.kind === 'choice'), {
      kind: 'choice',
      choice: 'autoAccelerate',
      value: true,
    });
    await ana.page.waitForSelector('[data-choice="autoAccelerate"][aria-pressed="true"]');

    await turnTiltOn(bo, '[data-value="tilt"]');
    assert.deepEqual(await nextHostInput(bo, (input) => input.kind === 'choice'), { kind: 'choice', choice: 'steering', value: 'tilt' });
    await bo.page.waitForSelector('[data-value="tilt"][aria-pressed="true"]');
    assert.equal(await bo.page.isVisible('#kart-steering-note'), false);
    // A row says in words how each player drives.
    await waitUntil(async () => (await hostPage.locator('.kart-player-style').allTextContents()).join('|') === 'Stick · Auto|Tilt · Go button', {
      message: 'the rows to name each player\'s controls',
    });
    await saveScreenshot(bo.page, 'm5c-1-iphone-setup');
    await saveScreenshot(hostPage, 'm5c-2-host-setup');
  });

  test('Start race does nothing until everyone is ready, then starts the countdown with their styles', async () => {
    assert.equal(await hostPage.isDisabled(START_RACE_BUTTON), true, 'Start race is off until everyone is ready');
    // A disabled button swallows clicks, so to prove the game itself refuses to start (not only the button), the
    // button is enabled by hand and clicked in the same breath, before the panel's next refresh turns it off again.
    await hostPage.evaluate((selector) => {
      const button = document.querySelector(selector);
      button.disabled = false;
      button.click();
    }, START_RACE_BUTTON);
    await hostPage.waitForTimeout(500);
    assert.equal(await ana.page.isVisible('#kart-setup'), true, 'still on the setup screen');

    await startRace(hostPage, [ana.page, bo.page]);
    const anaView = await nextView(ana, (view) => view.phase === 'countdown');
    assert.deepEqual({ ...anaView, countdown: 0, place: 0 }, {
      phase: 'countdown',
      countdown: 0,
      lap: 1,
      laps: 1,
      place: 0,
      finished: false,
      steering: 'stick',
      autoAccelerate: true,
      leftHanded: false,
    });
    assert.equal((await nextView(bo, (view) => view.phase === 'countdown')).steering, 'tilt');
    await waitUntil(async () => !(await panelOnHost()), { message: 'the setup panel to close' });
    anaOnGrid = await findColor(pixelReader, await hostPage.screenshot(), ANA_COLOR, LOWER_HALF);
  });

  test('on the controls, Ana has no Go button and Bo has the tilt panel; tilting steers', async () => {
    // Ana holds the stick before the race starts: with auto-accelerate her kart drives off at "GO!".
    const stick = await ana.page.locator('#kart-stick-zone').boundingBox();
    const stickX = stick.x + stick.width / 2;
    const stickY = stick.y + stick.height / 2;
    await ana.touch.press(0, stickX, stickY);
    await ana.touch.move(0, stickX - STICK_LEFT_PX / 2, stickY);
    await ana.touch.move(0, stickX - STICK_LEFT_PX, stickY);
    assert.equal(await ana.page.isVisible('#kart-accelerate'), false);
    assert.equal(await ana.page.isVisible('#kart-brake'), true);
    assert.equal(await ana.page.isVisible('#kart-stick-zone'), true);
    // Drift and the Item button's place belong to the 3D race only.
    assert.equal(await ana.page.isVisible('#kart-drift'), false);
    assert.equal(await ana.page.isVisible('#kart-item-slot'), false);
    await bo.page.waitForSelector('#kart-tilt-zone:not([hidden])');
    assert.equal(await bo.page.isVisible('#kart-stick-zone'), false);
    assert.equal(await bo.page.isVisible('#kart-recenter'), true);
    assert.equal(await bo.page.isVisible('#kart-enable-tilt'), false);
    // The iPhone is in landscape with its top on the left: raising the top end turns the wheel right.
    await tilt(bo, 10, 20);
    const input = await nextHostInput(bo, (each) => each.kind === 'tilt' && each.x > 0.3);
    assert.equal(input.y, 0);
    await saveScreenshot(ana.page, 'm5c-3-android-auto-accelerate');
    await saveScreenshot(bo.page, 'm5c-4-iphone-tilt');
  });

  test('with auto-accelerate, Ana\'s kart drives without Go held', async () => {
    await nextView(ana, (view) => view.phase === 'racing');
    await ana.page.waitForTimeout(1000);
    const moved = await findColor(pixelReader, await hostPage.screenshot(), ANA_COLOR, LOWER_HALF);
    const distance = Math.hypot(moved.centerX - anaOnGrid.centerX, moved.centerY - anaOnGrid.centerY);
    assert.ok(anaOnGrid.count > 0 && distance > 100, `Ana's kart moved ${Math.round(distance)} px`);
  });

  test('a reloaded phone keeps its style: Bo gets tilt back with one tap on Enable tilt', async () => {
    await bo.page.close();
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_DISCONNECTED);
    await openPlayerPage(bo);
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_RECONNECTED);
    assert.equal((await nextView(bo, () => true)).steering, 'tilt');
    await bo.page.waitForSelector('#kart-enable-tilt:not([hidden])');
    assert.equal(await bo.page.isVisible('#kart-stick-zone'), false);
    await turnTiltOn(bo, '#kart-enable-tilt');
    await bo.page.waitForSelector('#kart-recenter:not([hidden])');
  });

  test('Ana on the stick and Bo by tilt (with Go held) both finish the one lap', RACE_TIMEOUT, async () => {
    // Recenter at the level pose, then turn the wheel a fifth of the way left (STEADY_LEFT) and hold Go.
    await tilt(bo, 0, 30);
    await bo.page.click('#kart-recenter');
    await tilt(bo, TILT_LEFT_DEGREES, 30);
    const go = await bo.page.locator('#kart-accelerate').boundingBox();
    await bo.page.mouse.move(go.x + go.width / 2, go.y + go.height / 2);
    await bo.page.mouse.down();
    const views = await Promise.all([ana, bo].map((player) => nextView(player, (view) => view.phase === 'results')));
    await ana.touch.release(0);
    await bo.page.mouse.up();
    assert.ok(views.every((view) => view.finished), `both finished: ${JSON.stringify(views)}`);
  });

  test('Race again returns to the setup screen with the laps and styles kept and nobody ready', async () => {
    await clickNow(hostPage, RACE_AGAIN_BUTTON);
    const anaView = await nextView(ana, (view) => view.phase === 'setup');
    assert.deepEqual(withoutColors(anaView), { phase: 'setup', laps: 1, steering: 'stick', autoAccelerate: true, ready: false, leftHanded: false });
    const boView = await nextView(bo, (view) => view.phase === 'setup');
    assert.deepEqual(withoutColors(boView), { phase: 'setup', laps: 1, steering: 'tilt', autoAccelerate: false, ready: false, leftHanded: false });
    await bo.page.waitForSelector('#kart-setup:not([hidden])');
    assert.equal(await bo.page.getAttribute('#kart-ready-button', 'aria-pressed'), 'false');
  });

  test('a phone whose tilt permission is refused falls back to the stick and tells the host', async () => {
    // A new page has no sensor running, so the setup screen asks for a tap on Tilt.
    await bo.page.close();
    await openPlayerPage(bo);
    await bo.page.waitForSelector('#kart-setup:not([hidden])');
    await waitUntil(async () => (await bo.page.textContent('#kart-steering-note')) === 'Tap Tilt to turn tilt on.', {
      message: 'the note asking for a tap',
    });
    await bo.page.evaluate(() => {
      DeviceOrientationEvent.requestPermission = async () => 'denied';
    });
    await bo.page.click('[data-value="tilt"]');
    // The queue still holds Bo's earlier choices, so wait for this one.
    await nextHostInput(bo, (input) => input.kind === 'choice' && input.choice === 'steering' && input.value === 'stick');
    await bo.page.waitForSelector('[data-value="stick"][aria-pressed="true"]');
    assert.equal(await bo.page.textContent('#kart-steering-note'), 'Tilt is not available: permission denied. Using the stick.');
    await saveScreenshot(bo.page, 'm5c-5-iphone-tilt-denied');
  });
});
