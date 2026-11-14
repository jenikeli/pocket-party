// Browser tests for M5b, the 2D kart race: picking it on the picker (Play makes its room, the phones join it),
// starting from the setup screen (M5c) with the default controls, the landscape controls (the portrait phone's
// turned layout is in m10-turned-controls.test.js), real touches driving a kart, a dropped player's kart stopping
// and driving on after the rejoin, whole races to the results, Race again and Back to games. Two Android
// (Chromium) phones held sideways; fingers come from test/helpers/touch.js, because a kart needs the stick and a
// pedal held at once.
//
// The phones cannot see the track, so to finish a race they hold accelerate with the stick a fifth of the way
// left (STEADY_LEFT in test/helpers/kart-drivers.js): the walls guide them round. A 3-lap race takes about 35 s,
// so the second race, which only has to show that Race again and Back to games work, is set to 1 lap.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader, findColor } from '../helpers/screenshot-pixels.js';
import { openTouchscreen } from '../helpers/touch.js';
import { startGame, startRace, clickNow, goBackToPicker, removeRowButton, RACE_AGAIN_BUTTON, LAPS_MINUS_BUTTON } from '../helpers/host-buttons.js';
import { STEADY_LEFT } from '../helpers/kart-drivers.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

// Roster colours of the first two slots (host/roster.js).
const ANA_COLOR = 0xe74c3c;
const BO_COLOR = 0x3498db;
// The bottom straight, where the grid is (host/games/kart-2d/track.js: centre y 540, radii 250 to 470).
const BOTTOM_STRAIGHT = { left: 0, top: 790, right: 1920, bottom: 1010 };
// The lower half of the screen: the bottom straight and the lower halves of the bends, below the infield's
// standings (which show each name in the player's colour).
const LOWER_HALF = { left: 0, top: 540, right: 1920, bottom: 1080 };
const RACE_TIMEOUT = { timeout: 120000 };
// drag.js counts 80 px as a full push.
const STICK_LEFT_PX = Math.round(-STEADY_LEFT.steer * 80);

describe('M5b 2D kart race', () => {
  let server;
  let browser;
  let pixelReader;
  let hostPage;
  let hostMessages;
  let roomCode;
  let ana;
  let bo;

  // Each player has their own context (own localStorage), so a new page in it rejoins as the same player.
  async function joinAs(playerName) {
    const context = await browser.newContext(devices['Pixel 7 landscape']);
    const player = { context, name: playerName };
    await openPlayerPage(player);
    await player.page.fill('#player-name', playerName);
    await player.page.click('#join-button');
    await player.page.waitForSelector('#kart-screen', { state: 'visible' });
    player.playerId = (await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED)).playerId;
    return player;
  }

  async function openPlayerPage(player) {
    player.page = await player.context.newPage();
    player.messages = watchServerMessages(player.page);
    player.touch = await openTouchscreen(player.page);
    await player.page.goto(`${server.baseUrl}/?room=${roomCode}`);
  }

  // The next CONTROLLER_STATE this player gets whose view passes `check`.
  async function nextView(player, check) {
    while (true) {
      const state = await player.messages.nextOfType(MESSAGE_TYPES.CONTROLLER_STATE, 60000);
      if (state.view && check(state.view)) {
        return state;
      }
    }
  }

  async function centerOf(element, player) {
    const box = await player.page.locator(element).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  // Finger 1 holds Go until release(1).
  async function holdAccelerate(player) {
    const go = await centerOf('#kart-accelerate', player);
    await player.touch.press(1, go.x, go.y);
  }

  // Finger 0 on the stick, pushed STEADY_LEFT's amount left, and finger 1 on Go.
  async function holdSteadyLeft(player) {
    const stick = await centerOf('#kart-stick-zone', player);
    await player.touch.press(0, stick.x, stick.y);
    await player.touch.move(0, stick.x - STICK_LEFT_PX / 2, stick.y);
    await player.touch.move(0, stick.x - STICK_LEFT_PX, stick.y);
    await holdAccelerate(player);
  }

  async function releaseAll(player) {
    await player.touch.release(0);
    await player.touch.release(1);
  }

  // The next INPUT of `kind` the host receives (the Ready choices from the setup screen come first).
  async function nextHostInput(kind) {
    while (true) {
      const message = await hostMessages.nextOfType(MESSAGE_TYPES.INPUT);
      if (message.input.kind === kind) {
        return message;
      }
    }
  }

  async function findOnHost(color, area) {
    return findColor(pixelReader, await hostPage.screenshot(), color, area);
  }

  // Both phones drive STEADY_LEFT until the race is over; resolves with their final views.
  async function driveRaceToResults() {
    await holdSteadyLeft(ana);
    await holdSteadyLeft(bo);
    const views = await Promise.all([ana, bo].map((player) => nextView(player, (view) => view.phase === 'results')));
    await releaseAll(ana);
    await releaseAll(bo);
    return views.map((state) => state.view);
  }

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    pixelReader = await openPixelReader(browser);
    hostPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    hostMessages = watchServerMessages(hostPage);
    await openHost(hostPage, server.baseUrl);
    roomCode = await startGame(hostPage, { gameId: 'kart-2d' });
    ana = await joinAs('Ana');
    bo = await joinAs('Bo');
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('picked on the picker, the race puts both phones on the kart controls with the countdown', async () => {
    await startRace(hostPage, [ana.page, bo.page]);
    const state = await nextView(bo, (view) => view.phase === 'countdown');
    assert.equal(state.gameId, 'kart-2d');
    assert.deepEqual(
      { ...state.view, countdown: 0 },
      { phase: 'countdown', countdown: 0, lap: 1, laps: 3, place: 2, finished: false, steering: 'stick', autoAccelerate: false },
    );
    assert.equal(await bo.page.textContent('#kart-line'), 'Get ready!');
    await saveScreenshot(bo.page, 'm5b-1-phone-countdown');
    await saveScreenshot(hostPage, 'm5b-2-host-countdown');
  });

  test('holding Go drives the kart forward, and the phone shows its lap and place', async () => {
    await waitUntil(async () => (await ana.page.textContent('#kart-line')) === 'Lap 1/3', {
      message: 'the race to start on the phone',
    });
    const start = await findOnHost(ANA_COLOR, BOTTOM_STRAIGHT);
    assert.ok(start.count > 0, 'Ana\'s kart is on the grid');

    await holdAccelerate(ana);
    const pressed = await nextHostInput('button');
    assert.deepEqual(pressed.input, { kind: 'button', button: 'accelerate', pressed: true });
    assert.equal(await ana.page.getAttribute('#kart-accelerate', 'class'), 'kart-pedal held');
    await ana.page.waitForTimeout(800);
    await ana.touch.release(1);
    const released = await nextHostInput('button');
    assert.deepEqual(released.input, { kind: 'button', button: 'accelerate', pressed: false });

    const moved = await findOnHost(ANA_COLOR, BOTTOM_STRAIGHT);
    assert.ok(moved.centerX > start.centerX + 100, `Ana's kart moved right: ${start.centerX} -> ${moved.centerX}`);
    assert.match(await ana.page.textContent('#kart-big'), /^(1st|2nd)$/);
    await saveScreenshot(hostPage, 'm5b-4-host-racing');
    await saveScreenshot(ana.page, 'm5b-5-phone-racing');
  });

  test('a dropped player\'s kart stops; after the rejoin it waits for them, then drives on', async () => {
    await holdAccelerate(bo);
    await bo.page.waitForTimeout(500);
    // Closing the page drops Bo while Go is still held.
    await bo.page.close();
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_DISCONNECTED);
    // Long enough for a kart at full speed to roll to a stop.
    await hostPage.waitForTimeout(3000);
    await saveScreenshot(hostPage, 'm5b-6-host-player-away');

    await openPlayerPage(bo);
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_RECONNECTED);
    await bo.page.waitForSelector('#kart-screen');
    await waitUntil(async () => (await bo.page.textContent('#kart-line')) === 'Lap 1/3', { message: 'Bo\'s view after the rejoin' });
    // Go is no longer held after the rejoin, so the kart stays where it stopped.
    const stopped = await findOnHost(BO_COLOR, LOWER_HALF);
    await hostPage.waitForTimeout(1000);
    const stillStopped = await findOnHost(BO_COLOR, LOWER_HALF);
    assert.ok(stopped.count > 0, 'Bo\'s kart is drawn in full colour again');
    assert.ok(Math.abs(stillStopped.centerX - stopped.centerX) <= 2, 'not driving by itself');

    await holdAccelerate(bo);
    await bo.page.waitForTimeout(800);
    await bo.touch.release(1);
    const drivenOn = await findOnHost(BO_COLOR, LOWER_HALF);
    assert.ok(Math.hypot(drivenOn.centerX - stopped.centerX, drivenOn.centerY - stopped.centerY) > 100, 'Bo drives on');
  });

  test('both karts finish three laps; phones show their final places and the host shows the results', RACE_TIMEOUT, async () => {
    const views = await driveRaceToResults();
    assert.deepEqual(views.map((view) => view.place).sort(), [1, 2]);
    assert.ok(views.every((view) => view.finished && view.lap === 3));
    assert.equal(await ana.page.textContent('#kart-line'), 'Race over');
    assert.equal(await ana.page.textContent('#kart-big'), views[0].place === 1 ? '1st' : '2nd');
    await hostPage.waitForSelector('#kart-2d-results:not([hidden])');
    assert.equal(await hostPage.locator('#kart-2d-results-rows li').count(), 2);
    // The results have their heading, a summary of the race, the winner's row marked and a gap on the others.
    assert.equal(await hostPage.textContent('#kart-2d-results .k2d-heading'), 'Results');
    assert.equal(await hostPage.textContent('#kart-2d-results-summary'), '3 laps');
    assert.equal(await hostPage.locator('#kart-2d-results-rows li.k2d-winner').count(), 1);
    assert.equal(await hostPage.textContent('#kart-2d-results-rows li.k2d-winner .k2d-place'), '1st');
    assert.match(await hostPage.locator('#kart-2d-results-rows li:not(.k2d-winner) .k2d-gap').textContent(), /^\+\d+\.\d+$/);
    await saveScreenshot(hostPage, 'm5b-7-host-results');
    await saveScreenshot(ana.page, 'm5b-8-phone-results');
  });

  test('the room is open again on the results screen: a late joiner gets in, and the host removes them from the setup row', async () => {
    assert.equal(await hostPage.isVisible('#game-add-players-button'), true);
    const cy = await joinAs('Cy');
    await clickNow(hostPage, RACE_AGAIN_BUTTON);
    await hostPage.waitForSelector(`#kart-2d-setup .kart-player-row[data-player-id="${cy.playerId}"]`);
    assert.equal(await hostPage.locator('#kart-2d-players .kart-player-row').count(), 3);
    assert.equal(await hostPage.textContent('#kart-2d-setup-status'), 'Waiting for Ana, Bo, Cy');

    // The cross turns red on the first click and removes on the second; a phone still on its setup is told.
    const cross = removeRowButton(cy.playerId);
    await hostPage.click(cross);
    assert.match(await hostPage.getAttribute(cross, 'class'), /\barmed\b/);
    assert.equal(await cy.page.isVisible('#kart-setup'), true);
    await hostPage.click(cross);
    await cy.page.waitForSelector('#join-screen:not([hidden])');
    assert.equal(await cy.page.textContent('#join-status'), 'The host removed you from the game.');
    await hostPage.waitForSelector(cross, { state: 'detached' });
    assert.equal(await hostPage.textContent('#kart-2d-setup-status'), 'Waiting for Ana, Bo');
    await cy.context.close();
  });

  test('Race again goes to the setup screen, then puts everyone back on the grid with a new countdown', async () => {
    await ana.page.waitForSelector('#kart-setup:not([hidden])');
    // 3 laps down to 1, so the second race is short.
    await clickNow(hostPage, LAPS_MINUS_BUTTON, 2);
    await nextView(ana, (view) => view.laps === 1);
    await startRace(hostPage, [ana.page, bo.page]);
    for (const player of [ana, bo]) {
      await nextView(player, (view) => view.phase === 'countdown');
    }
    await hostPage.waitForSelector('#kart-2d-results', { state: 'hidden' });
    const anaOnGrid = await findOnHost(ANA_COLOR, BOTTOM_STRAIGHT);
    assert.ok(anaOnGrid.count > 0 && anaOnGrid.centerX < 960, 'Ana is back behind the start line');
  });

  test('after the second race (1 lap), Back to games returns the host to the picker and ends the game on both phones', RACE_TIMEOUT, async () => {
    const views = await driveRaceToResults();
    assert.ok(views.every((view) => view.finished && view.lap === 1));
    await goBackToPicker(hostPage);
    for (const player of [ana, bo]) {
      await player.page.waitForSelector('#ended-screen:not([hidden])');
    }
    assert.equal(await hostPage.isVisible('#game-picker'), true);
    assert.equal(await hostPage.evaluate(() => document.querySelectorAll('canvas').length), 0);
  });
});
