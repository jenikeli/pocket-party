// Browser tests for M11 on the 3D race: each phone's top line shows its colour dot and name, a colour picked on
// the setup screen reaches the host's row and the phone while a taken one is refused (and nothing changes it
// during a race), Left-handed mirrors the driving layout, Go's double tap drifts, and Leave takes two taps.
// Ana is an Android phone (Chromium, real touches) on the stick; Bo an unnamed iPhone (WebKit) who is
// left-handed; Cy a portrait Android phone, left-handed, to check the turned layout. Headless Chromium draws
// WebGL in software, so the host page is half the usual size and starts at Medium quality on the plain course.
// The tests run in order on one game and one race: each builds on the ones before it.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openTouchscreen } from '../helpers/touch.js';
import { startGame, clickNow } from '../helpers/host-buttons.js';
import { presetQuality, presetPlainCourse, pickCourse, waitForCourseBuilt, GAME_START_TIMEOUT, STARTING_TIMEOUT } from '../helpers/kart-3d-host.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';
import { PLAYER_COLORS } from '../../host/roster.js';

const HOST_SIZE = { width: 960, height: 540 };
const GO_FINGER = 1;
// Colour slots (host/roster.js).
const RED = 0;
const YELLOW = 3;
const ORANGE = 5;

function cssColor(slot) {
  return `#${PLAYER_COLORS[slot].toString(16)}`;
}

// The computed colour of a dot drawn from that slot, as the browser reports it.
function rgbColor(slot) {
  const value = PLAYER_COLORS[slot];
  return `rgb(${value >> 16}, ${(value >> 8) & 255}, ${value & 255})`;
}

describe('M11 colour and controls on the 3D race', () => {
  let server;
  let chromium;
  let webkit;
  let hostPage;
  let hostMessages;
  let roomCode;
  let ana;
  let bo;
  let cy;
  const pageErrors = [];

  async function joinAs(browser, device, playerName) {
    const context = await browser.newContext(devices[device]);
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(error));
    const player = { page, messages: watchServerMessages(page), sentButtons: [], name: playerName || 'the unnamed phone' };
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
    player.playerId = (await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED)).playerId;
    return player;
  }

  const phoneDotColor = (player) => player.page.$eval('#game-player-dot', (dot) => getComputedStyle(dot).backgroundColor);
  const hostRow = (player) => `#kart-3d-rows .kart-player-row[data-player-id="${player.playerId}"]`;
  const hostDotColor = (player) => hostPage.$eval(`${hostRow(player)} .pp-dot`, (dot) => dot.style.getPropertyValue('--pp-dot-color'));
  const swatch = (slot) => `[data-color="${slot}"]`;

  // The element's box on the page; it must be drawn, so a hidden or empty one cannot pass a comparison.
  async function boxOf(player, selector) {
    const box = await player.page.locator(selector).boundingBox();
    assert.ok(box && box.width > 0 && box.height > 0, `${player.name}'s ${selector} is drawn`);
    return box;
  }

  // Waits until the host has received `player`'s COLOR choice for `slot`.
  async function waitForColorInput(player, slot) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const { playerId, input } = await hostMessages.nextOfType(MESSAGE_TYPES.INPUT, deadline - Date.now());
      if (playerId === player.playerId && input.choice === 'color' && input.value === slot) {
        return;
      }
    }
    throw new Error(`no COLOR choice for slot ${slot} from ${player.name} within 10 s`);
  }

  // Sends a COLOR choice for `slot` the way its swatch would, even when the button is disabled (a taken colour) or
  // hidden (the setup screen during a race): a modified phone could do the same.
  function forceColor(player, slot) {
    return player.page.$eval(swatch(slot), (button) => {
      button.disabled = false;
      button.click();
    });
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
    bo = await joinAs(webkit, 'iPhone 13 landscape', '');
    cy = await joinAs(chromium, 'Pixel 7', 'Cy');
  }, { timeout: STARTING_TIMEOUT });

  after(async () => {
    await chromium?.close();
    await webkit?.close();
    await server?.stop();
  });

  test('every phone\'s top line shows its colour dot and name; a phone with no name is called by its colour', async () => {
    for (const [player, name, slot] of [[ana, 'Ana', 0], [bo, 'Blue', 1], [cy, 'Cy', 2]]) {
      assert.equal(await player.page.textContent('#game-player-name'), name);
      assert.equal(await phoneDotColor(player), rgbColor(slot));
    }
    await saveScreenshot(ana.page, 'm11-1-phone-setup');
  });

  test('a free colour tapped on the setup screen moves the host row and both dots; a taken one is refused', async () => {
    await ana.page.click(swatch(YELLOW));
    await waitUntil(async () => (await hostDotColor(ana)) === cssColor(YELLOW), { message: 'Ana\'s row turning yellow' });
    await waitUntil(async () => (await phoneDotColor(ana)) === rgbColor(YELLOW), { message: 'Ana\'s dot turning yellow' });
    assert.equal(await ana.page.textContent('#game-player-name'), 'Ana');
    assert.equal(await ana.page.textContent('#kart-driver'), 'Yellow: you drive Bolt');
    await bo.page.waitForSelector(`${swatch(YELLOW)}:disabled`);
    assert.equal(await bo.page.getAttribute(swatch(YELLOW), 'aria-label'), 'Yellow, taken by Ana');
    assert.equal(await bo.page.isDisabled(swatch(RED)), false, 'Red, which Ana left, is free');

    // Bo forces the taken colour: the host gets it, and Bo keeps blue and Ana yellow. Then Bo picks a free one.
    await forceColor(bo, YELLOW);
    await waitForColorInput(bo, YELLOW);
    // The host handles it within a few frames (about 0.3 s each here); 1.5 s leaves room for a wrong change to show.
    await hostPage.waitForTimeout(1500);
    assert.equal(await hostDotColor(bo), cssColor(1), 'Bo is still blue');
    assert.equal(await phoneDotColor(bo), rgbColor(1), 'Bo\'s phone still shows blue');
    assert.equal(await hostDotColor(ana), cssColor(YELLOW), 'Ana still holds yellow');
    await bo.page.click(swatch(RED));
    await waitUntil(async () => (await hostDotColor(bo)) === cssColor(RED), { message: 'Bo\'s row turning red' });
    await waitUntil(async () => (await bo.page.textContent('#game-player-name')) === 'Red', { message: 'Bo, with no name, called by the new colour' });
  });

  test('Left-handed shows in the player\'s row on the host', async () => {
    for (const player of [bo, cy]) {
      await player.page.click('[data-choice="leftHanded"]');
      await player.page.waitForSelector('[data-choice="leftHanded"][aria-pressed="true"]');
      await waitUntil(async () => /Left-handed/.test(await hostPage.textContent(`${hostRow(player)} .kart-player-style`)), { message: 'Left-handed in the host row' });
    }
    assert.doesNotMatch(await hostPage.textContent(`${hostRow(ana)} .kart-player-style`), /Left-handed/);
  });

  test('the race starts', async () => {
    for (const player of [ana, bo, cy]) {
      await player.page.click('#kart-ready-button');
      await player.page.waitForSelector('#kart-ready-button[aria-pressed="true"]');
    }
    await pickCourse(hostPage, 'seaside-skyway');
    await hostPage.waitForSelector('#kart-3d-start-button:not([disabled])');
    await clickNow(hostPage, '#kart-3d-start-button');
    await waitForCourseBuilt(hostPage);
    for (const player of [ana, bo, cy]) {
      await player.page.waitForSelector('#kart-controls:not([hidden])');
    }
  }, { timeout: STARTING_TIMEOUT });

  test('Left-handed swaps Go and the steer area, also on a phone held upright (turned)', async () => {
    const [anaStick, anaGo] = await Promise.all([boxOf(ana, '#kart-stick-zone'), boxOf(ana, '#kart-accelerate')]);
    assert.ok(anaStick.x + anaStick.width <= anaGo.x + 1, 'right-handed: the steer area is left of Go');
    const [boStick, boGo] = await Promise.all([boxOf(bo, '#kart-stick-zone'), boxOf(bo, '#kart-accelerate')]);
    assert.ok(boGo.x + boGo.width <= boStick.x + 1, 'left-handed: Go is left of the steer area');
    // Turned a quarter, right-handed has the steer area at the top and Go at the bottom (m10).
    const [cyStick, cyGo] = await Promise.all([boxOf(cy, '#kart-stick-zone'), boxOf(cy, '#kart-accelerate')]);
    assert.ok(cyGo.y + cyGo.height <= cyStick.y + 1, 'turned and left-handed: Go is above the steer area');
    await saveScreenshot(bo.page, 'm11-2-phone-left-handed');
  });

  test('a plain hold on Go sends accelerate; a tap then a held press sends drift pressed, then released', async () => {
    const box = await boxOf(ana, '#kart-accelerate');
    const go = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await ana.touch.press(GO_FINGER, go.x, go.y);
    await ana.page.waitForTimeout(400);
    await ana.touch.release(GO_FINGER);
    await waitUntil(() => ana.sentButtons.length >= 2, { message: 'the plain hold\'s press and release' });
    assert.deepEqual(ana.sentButtons, ['accelerate down', 'accelerate up']);
    // The tap and the press are sent without waiting between them: one awaited call can outlast the window here.
    await Promise.all([ana.touch.press(GO_FINGER, go.x, go.y), ana.touch.release(GO_FINGER), ana.touch.press(GO_FINGER, go.x, go.y)]);
    await waitUntil(() => ana.sentButtons.at(-1) === 'drift down', { message: 'the drift press' });
    await ana.page.waitForTimeout(400);
    await ana.touch.release(GO_FINGER);
    await waitUntil(() => ana.sentButtons.at(-1) === 'drift up', { message: 'the drift release' });
    assert.deepEqual(ana.sentButtons.slice(2), ['accelerate down', 'accelerate up', 'drift down', 'drift up']);
  });

  test('a COLOR choice sent during the race changes nothing', async () => {
    // Empties Ana's queue of received messages, so only those after the choice are looked at.
    await ana.messages.collectFor(0);
    await forceColor(ana, ORANGE);
    await waitForColorInput(ana, ORANGE);
    // The host would answer a pick within a few frames (about 0.3 s each here), so 2.5 s is ample.
    const states = (await ana.messages.collectFor(2500)).filter((message) => message.type === MESSAGE_TYPES.CONTROLLER_STATE);
    assert.deepEqual(states.filter((state) => state.color !== cssColor(YELLOW)), []);
    assert.equal(await phoneDotColor(ana), rgbColor(YELLOW));
  });

  test('Leave takes two taps: the first arms it (red), the second leaves, and the host drops the player and its kart', async () => {
    const readout = () => hostPage.textContent('#kart-3d-readout');
    assert.match(await readout(), /Red: [\d.]+ units\/s/);
    await bo.page.click('#kart-leave');
    assert.match(await bo.page.getAttribute('#kart-leave', 'class'), /\barmed\b/);
    assert.equal(await bo.page.isVisible('#kart-controls'), true, 'one tap does not leave');
    await bo.page.click('#kart-leave');
    const left = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_LEFT, 10000);
    assert.equal(left.playerId, bo.playerId);
    await bo.page.waitForSelector('#join-screen:not([hidden])');
    await waitUntil(async () => !/Red: /.test(await readout()), { timeoutMs: 30000, message: 'Bo\'s kart gone from the readout' });
    assert.match(await readout(), /Ana: [\d.]+ units\/s/, 'Ana still races');
  });

  test('no page threw an error', () => {
    assert.deepEqual(pageErrors, []);
  });
});
