// Browser tests for M5c, the 2D race's setup screen and control styles: laps on the host, each phone's steering
// (stick or tilt) and auto-accelerate, Ready and Start race, tilt steering in landscape, a rejoining phone
// keeping its style, tilt falling back to the stick when refused, and Race again keeping the settings.
// Ana is an Android phone (Chromium, real touches from test/helpers/touch.js) on the stick with auto-accelerate;
// Bo is an iPhone (WebKit) steering by tilt. Headless browsers have no motion sensor, so Bo's page gets the iOS
// permission API stubbed and deviceorientation events fired by hand, as in the M3 tests.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader, findColor } from '../helpers/screenshot-pixels.js';
import { openTouchscreen } from '../helpers/touch.js';
import { startGame, startRace, NEXT_GAME_BUTTON, LAPS_MINUS_BUTTON, START_RACE_BUTTON, RACE_AGAIN_BUTTON } from '../helpers/host-buttons.js';
import { STEADY_LEFT } from '../helpers/kart-drivers.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

// The setup and results panels' colour (host/games/kart-2d/setup-panel.js), and the middle of the screen it covers.
const PANEL_COLOR = 0x1c2130;
const MIDDLE = { left: 500, top: 300, right: 1420, bottom: 780 };
const ANA_COLOR = 0xe74c3c;
const LOWER_HALF = { left: 0, top: 540, right: 1920, bottom: 1080 };
const RACE_TIMEOUT = { timeout: 120000 };
// drag.js counts 80 px as a full push; tilt.js counts 25 degrees as a full turn.
const STICK_LEFT_PX = Math.round(-STEADY_LEFT.steer * 80);
const TILT_LEFT_DEGREES = STEADY_LEFT.steer * 25;

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
    await player.page.waitForSelector('#lobby-screen:not([hidden])');
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
    return (await findColor(pixelReader, await hostPage.screenshot(), PANEL_COLOR, MIDDLE)).count > 100000;
  }

  before(async () => {
    server = await startServer();
    chromium = await launchBrowser('chromium');
    webkit = await launchBrowser('webkit');
    pixelReader = await openPixelReader(chromium);
    hostPage = await chromium.newPage({ viewport: { width: 1920, height: 1080 } });
    hostMessages = watchServerMessages(hostPage);
    await hostPage.goto(`${server.baseUrl}/host`);
    roomCode = (await hostMessages.nextOfType(MESSAGE_TYPES.ROOM_CREATED, 10000)).roomCode;
    ana = await joinAs(chromium, 'Pixel 7 landscape', 'Ana');
    ana.touch = await openTouchscreen(ana.page);
    bo = await joinAs(webkit, 'iPhone 13 landscape', 'Bo', 'granted');
  });

  after(async () => {
    await chromium?.close();
    await webkit?.close();
    await server?.stop();
  });

  test('Start game opens the setup screen: phones show the defaults, the host shows the setup panel', async () => {
    await hostPage.mouse.click(NEXT_GAME_BUTTON.x, NEXT_GAME_BUTTON.y);
    for (const player of [ana, bo]) {
      await player.page.click('#ready-button');
      await player.page.waitForSelector('#ready-button[aria-pressed="true"]');
    }
    await startGame(hostPage, ana.page, '#kart-setup');
    const view = await nextView(bo, (each) => each.phase === 'setup');
    assert.deepEqual(view, { phase: 'setup', laps: 3, steering: 'stick', autoAccelerate: false, ready: false });
    await bo.page.waitForSelector('#kart-setup:not([hidden])');
    assert.equal(await bo.page.isVisible('#kart-controls'), false);
    assert.equal(await bo.page.getAttribute('[data-value="stick"]', 'aria-pressed'), 'true');
    assert.equal(await bo.page.getAttribute('[data-choice="autoAccelerate"][data-value="false"]', 'aria-pressed'), 'true');
    await waitUntil(panelOnHost, { message: 'the setup panel on the host' });
  });

  test('the host sets the laps; the phones show them', async () => {
    await hostPage.mouse.click(LAPS_MINUS_BUTTON.x, LAPS_MINUS_BUTTON.y);
    await hostPage.waitForTimeout(150);
    await hostPage.mouse.click(LAPS_MINUS_BUTTON.x, LAPS_MINUS_BUTTON.y);
    await nextView(ana, (view) => view.laps === 1);
    await waitUntil(async () => (await ana.page.textContent('#kart-setup-laps')) === '1 lap', { message: '"1 lap" on the phone' });
  });

  test('each phone picks its control style: Ana auto-accelerate, Bo tilt', async () => {
    await ana.page.click('[data-choice="autoAccelerate"][data-value="true"]');
    assert.deepEqual(await nextHostInput(ana, (input) => input.kind === 'choice'), {
      kind: 'choice',
      choice: 'autoAccelerate',
      value: true,
    });
    await ana.page.waitForSelector('[data-choice="autoAccelerate"][data-value="true"][aria-pressed="true"]');

    await turnTiltOn(bo, '[data-value="tilt"]');
    assert.deepEqual(await nextHostInput(bo, (input) => input.kind === 'choice'), { kind: 'choice', choice: 'steering', value: 'tilt' });
    await bo.page.waitForSelector('[data-value="tilt"][aria-pressed="true"]');
    assert.equal(await bo.page.isVisible('#kart-steering-note'), false);
    await saveScreenshot(bo.page, 'm5c-1-iphone-setup');
    await saveScreenshot(hostPage, 'm5c-2-host-setup');
  });

  test('Start race does nothing until everyone is ready, then starts the countdown with their styles', async () => {
    await hostPage.mouse.click(START_RACE_BUTTON.x, START_RACE_BUTTON.y);
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
    await hostPage.mouse.click(RACE_AGAIN_BUTTON.x, RACE_AGAIN_BUTTON.y);
    const anaView = await nextView(ana, (view) => view.phase === 'setup');
    assert.deepEqual(anaView, { phase: 'setup', laps: 1, steering: 'stick', autoAccelerate: true, ready: false });
    const boView = await nextView(bo, (view) => view.phase === 'setup');
    assert.deepEqual(boView, { phase: 'setup', laps: 1, steering: 'tilt', autoAccelerate: false, ready: false });
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
