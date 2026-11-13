// Browser tests for M6b, the 3D race's driving (since M7b the race itself): it starts from the lobby, phones get
// the shared kart setup screen (with the laps and engine class) and controls, the host draws two split-screen views with the players' names, auto-accelerate
// drives a kart by itself and a held Go drives another (read from the host's readout, with the physics step
// time), a reloaded phone gets its controls back, Back to setup keeps the control styles, and End game frees
// the WebGL canvas. Ana is an Android phone (Chromium, real touches) on the stick and Go; Bo an iPhone (WebKit)
// on auto-accelerate. Headless Chromium draws WebGL in software, so the host page is
// half the usual size and starts at Medium quality (test/helpers/kart-3d-host.js). Since M10 it also checks that
// the setup shows the course's picture and draws nothing, that the loading bar shows while Start race builds the
// course, and that two more phones join on the setup screen (a fifth is refused, and so is one during the race).

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader, findColor } from '../helpers/screenshot-pixels.js';
import { openTouchscreen } from '../helpers/touch.js';
import { startGame, clickNow, GAME_END_BUTTON } from '../helpers/host-buttons.js';
import {
  presetQuality,
  presetPlainCourse,
  clickStartRace,
  watchDrawCalls,
  drawCallCount,
  watchLoadingScreen,
  loadingLog,
  GAME_START_TIMEOUT,
  STARTING_TIMEOUT,
} from '../helpers/kart-3d-host.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const HOST_SIZE = { width: 960, height: 540 };
// From host/games/kart-3d/view-layout.js at 960x540: two views stacked, with a 4 px gap (rows 268-271).
const VIEW_GAP = { left: 0, top: 268, right: 960, bottom: 272 };
const DRIVE_TIMEOUT = { timeoutMs: 30000 };

describe('M6b 3D driving', () => {
  let server;
  let chromium;
  let webkit;
  let pixelReader;
  let hostPage;
  let hostMessages;
  let roomCode;
  let ana;
  let bo;
  let cy;
  let dee;
  let drawCallsAtSetup;
  const pageErrors = [];

  async function joinAs(browser, device, playerName) {
    const context = await browser.newContext(devices[device]);
    const player = { context, name: playerName };
    await openPlayerPage(player);
    await player.page.fill('#player-name', playerName);
    await player.page.click('#join-button');
    await player.page.waitForSelector('#lobby-screen:not([hidden])');
    player.playerId = (await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED)).playerId;
    return player;
  }

  // Joins while the game's setup screen has the room open: the phone goes straight to the game's screen, not the
  // lobby.
  async function joinLate(playerName) {
    const context = await chromium.newContext(devices['Pixel 7 landscape']);
    const player = { context, name: playerName };
    await openPlayerPage(player);
    await player.page.fill('#player-name', playerName);
    await player.page.click('#join-button');
    await player.page.waitForSelector('#kart-setup:not([hidden])');
    player.playerId = (await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED)).playerId;
    return player;
  }

  // Tries to join as one more phone and returns what its join screen says once the server has answered.
  async function tryToJoin() {
    const context = await chromium.newContext(devices['Pixel 7 landscape']);
    const page = await context.newPage();
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.click('#join-button');
    await page.waitForFunction(() => document.getElementById('join-status').textContent !== 'Joining...');
    const status = await page.textContent('#join-status');
    await context.close();
    return status;
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

  // The speed the host's readout gives for `name`, in units per second.
  async function readoutSpeed(name) {
    const text = await hostPage.textContent('#kart-3d-readout');
    const match = text.match(new RegExp(`${name}: (-?[\\d.]+) units/s`));
    return match ? Number(match[1]) : null;
  }

  async function centerOf(selector, player) {
    const box = await player.page.locator(selector).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  before(async () => {
    server = await startServer();
    chromium = await launchBrowser('chromium');
    webkit = await launchBrowser('webkit');
    pixelReader = await openPixelReader(chromium);
    hostPage = await chromium.newPage({ viewport: HOST_SIZE });
    hostPage.on('pageerror', (error) => pageErrors.push(error));
    hostMessages = watchServerMessages(hostPage);
    await presetQuality(hostPage, 'medium');
    await presetPlainCourse(hostPage);
    await watchDrawCalls(hostPage);
    await watchLoadingScreen(hostPage);
    roomCode = await openHost(hostPage, server.baseUrl, hostMessages);
    ana = await joinAs(chromium, 'Pixel 7 landscape', 'Ana');
    ana.touch = await openTouchscreen(ana.page);
    bo = await joinAs(webkit, 'iPhone 13 landscape', 'Bo');
  });

  after(async () => {
    await chromium?.close();
    await webkit?.close();
    await server?.stop();
  });

  test('Start game opens the setup screen: the phones get the kart setup with laps and class, the host lists the players', async () => {
    await startGame(hostPage, ana.page, { gameId: 'kart-3d', controlsSelector: '#kart-setup', timeoutMs: GAME_START_TIMEOUT });
    const view = await nextView(bo, (each) => each.phase === 'setup');
    assert.deepEqual(view, { phase: 'setup', laps: 3, engineClass: 150, courseName: 'Palm Bay Airport', steering: 'stick', autoAccelerate: false, ready: false });
    await bo.page.waitForSelector('#kart-setup:not([hidden])');
    await waitUntil(async () => (await bo.page.textContent('#kart-setup-laps')) === '3 laps, 150cc', { message: 'Bo\'s laps line' });
    // The game's style.css only imports the shared kart styles; the setup screen's grid shows they arrived.
    assert.equal(await bo.page.evaluate(() => getComputedStyle(document.getElementById('kart-setup')).display), 'grid');
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    const rows = await hostPage.locator('#kart-3d-rows li').allTextContents();
    assert.deepEqual(rows, ['AnaStick, Go buttonChoosing...', 'BoStick, Go buttonChoosing...']);
    assert.equal(await hostPage.isDisabled('#kart-3d-start-button'), true);
    await saveScreenshot(hostPage, 'm6b-1-host-setup');
  });

  test('the setup shows the chosen course\'s saved picture and builds nothing: no drawing and no loading screen of its own', async () => {
    assert.equal(await hostPage.textContent('#kart-3d-course-name'), 'Palm Bay Airport');
    drawCallsAtSetup = await drawCallCount(hostPage);
    const picture = hostPage.locator('.k3d-setup-picture');
    assert.equal(await picture.isVisible(), true);
    assert.match(await picture.getAttribute('src'), /palm-bay-airport\.jpg$/);
    assert.equal(await picture.evaluate((image) => image.complete && image.naturalWidth > 0), true, 'the picture loaded');
    // Picking another course changes the picture and the name, still without building it.
    await clickNow(hostPage, '[data-course-id="seaside-skyway"]');
    await hostPage.waitForSelector('[data-course-id="seaside-skyway"][aria-pressed="true"]');
    assert.equal(await hostPage.textContent('#kart-3d-course-name'), 'Seaside Skyway');
    assert.match(await picture.getAttribute('src'), /seaside-skyway\.jpg$/);
    await hostPage.waitForTimeout(1500);
    // Only the sky reflection map, drawn when the renderer starts, was drawn before the first count.
    assert.equal(await drawCallCount(hostPage), drawCallsAtSetup, 'nothing is drawn in 3D on the setup screen');
    // The one loading screen so far was the shell's, for the game's own files.
    const loading = await loadingLog(hostPage);
    assert.deepEqual(loading.events, ['shown', 'hidden']);
    assert.deepEqual(loading.titles, ['Kart race 3D']);
  });

  test('Bo picks auto-accelerate, both are ready, Start race gives the phones their controls and the host two views', { timeout: STARTING_TIMEOUT }, async () => {
    await bo.page.click('[data-choice="autoAccelerate"][data-value="true"]');
    await bo.page.waitForSelector('[data-choice="autoAccelerate"][data-value="true"][aria-pressed="true"]');
    for (const player of [ana, bo]) {
      await player.page.click('#kart-ready-button');
      await player.page.waitForSelector('#kart-ready-button[aria-pressed="true"]');
    }
    const beforeStart = await loadingLog(hostPage);
    await clickStartRace(hostPage);
    // The loading screen came up with the course's name, its bar moved on and it went again.
    const loading = await loadingLog(hostPage);
    assert.deepEqual(loading.events.slice(beforeStart.events.length), ['shown', 'hidden']);
    assert.deepEqual(loading.titles.slice(beforeStart.titles.length), ['Seaside Skyway']);
    const barWidths = loading.barWidths.slice(beforeStart.barWidths.length);
    assert.ok(Math.max(...barWidths) > 50 && new Set(barWidths).size > 2, `the bar moved: ${barWidths}`);
    assert.ok((await drawCallCount(hostPage)) > drawCallsAtSetup, 'the race draws once the course is built');
    for (const player of [ana, bo]) {
      await player.page.waitForSelector('#kart-controls:not([hidden])');
      assert.match(await player.page.textContent('#kart-line'), /^(Get ready!|Lap 1\/3)$/);
    }
    assert.equal(await bo.page.isVisible('#kart-accelerate'), false, 'auto-accelerate hides Go');
    assert.equal(await ana.page.isVisible('#kart-accelerate'), true);
    await hostPage.waitForSelector('#kart-3d-race-bar:not([hidden])');
    const labels = hostPage.locator('.kart-3d-view-hud:not([hidden]) .kart-3d-view-label');
    await waitUntil(async () => (await labels.count()) === 2, { message: 'a label on each view' });
    assert.deepEqual(await labels.allTextContents(), ['Ana', 'Bo']);
    await waitUntil(async () => (await findColor(pixelReader, await hostPage.screenshot(), 0x000000, VIEW_GAP)).count === 960 * 4, {
      ...DRIVE_TIMEOUT,
      message: 'a black gap between the two views',
    });
    await saveScreenshot(ana.page, 'm6b-2-phone-driving');
  });

  test('auto-accelerate drives Bo\'s kart, a held Go drives Ana\'s, and the readout shows the physics step time', async () => {
    await waitUntil(async () => (await readoutSpeed('Bo')) > 3, { ...DRIVE_TIMEOUT, message: 'Bo\'s kart driving by itself' });
    assert.equal(await readoutSpeed('Ana'), 0, 'Ana has not pressed Go');
    const go = await centerOf('#kart-accelerate', ana);
    await ana.touch.press(1, go.x, go.y);
    await waitUntil(async () => (await readoutSpeed('Ana')) > 3, { ...DRIVE_TIMEOUT, message: 'Ana\'s kart driving' });
    await ana.touch.release(1);
    assert.match(await hostPage.textContent('#kart-3d-readout'), /Physics step: [\d.]+ ms average, [\d.]+ ms worst \(12 karts\)/);
    await saveScreenshot(hostPage, 'm6b-3-host-driving');
    assert.deepEqual(pageErrors, []);
  });

  test('a reloaded phone rejoins straight into its driving controls, still on auto-accelerate', async () => {
    await bo.page.close();
    await openPlayerPage(bo);
    // The host page is busy drawing CPU-drawn WebGL frames, which delays its frames' events: a margin kept from
    // when frames took over a second.
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_RECONNECTED, 10000);
    // Just after GO the view says how the start went for a moment; the view after that is the plain one.
    const view = await nextView(bo, (each) => each.phase === 'racing' && each.start === null);
    // Items are on (M8): what Bo holds depends on the boxes Bo's kart has met by now, so only its presence is checked.
    const { item, ...rest } = view;
    assert.deepEqual({ ...rest, place: 1 }, { phase: 'racing', steering: 'stick', autoAccelerate: true, countdown: null, spark: null, start: null, lap: 1, laps: 3, place: 1, finalLap: false, finished: false });
    assert.notEqual(item, null, 'items are on');
    await bo.page.waitForSelector('#kart-controls:not([hidden])');
    assert.equal(await bo.page.isVisible('#kart-accelerate'), false);
  });

  test('Back to setup returns the phones to the setup screen with their control styles kept and ready cleared', async () => {
    await clickNow(hostPage, '#kart-3d-setup-button');
    for (const player of [ana, bo]) {
      await player.page.waitForSelector('#kart-setup:not([hidden])');
      await player.page.waitForSelector('#kart-ready-button[aria-pressed="false"]');
    }
    assert.equal(await bo.page.getAttribute('[data-choice="autoAccelerate"][data-value="true"]', 'aria-pressed'), 'true');
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    assert.equal(await hostPage.locator('.kart-3d-view-hud:not([hidden])').count(), 0);
  });

  test('on the setup screen two more phones join and get rows; a fifth is refused, the race takes 4', async () => {
    cy = await joinLate('Cy');
    dee = await joinLate('Dee');
    await waitUntil(async () => (await hostPage.locator('#kart-3d-rows li').count()) === 4, { message: 'a row for each of the four players' });
    assert.equal(await hostPage.textContent('#kart-3d-status'), 'Waiting for Ana, Bo, Cy, Dee');
    assert.equal(await cy.page.isVisible('#kart-setup'), true);
    assert.equal(await tryToJoin(), 'That room is full.');
    await saveScreenshot(hostPage, 'm6b-4-host-setup-four-players');
  });

  test('the late joiners get karts in the next race, the built course is not built again, and a phone that tries during it is refused', { timeout: STARTING_TIMEOUT }, async () => {
    const buildsBefore = (await loadingLog(hostPage)).events.length;
    for (const player of [ana, bo, cy, dee]) {
      await player.page.click('#kart-ready-button');
      await player.page.waitForSelector('#kart-ready-button[aria-pressed="true"]');
    }
    await clickStartRace(hostPage);
    assert.equal((await loadingLog(hostPage)).events.length, buildsBefore, 'the course was kept: no second loading screen');
    for (const player of [cy, dee]) {
      await player.page.waitForSelector('#kart-controls:not([hidden])');
    }
    const labels = hostPage.locator('.kart-3d-view-hud:not([hidden]) .kart-3d-view-label');
    await waitUntil(async () => (await labels.count()) === 4, { message: 'a label on each of the four views' });
    assert.deepEqual(await labels.allTextContents(), ['Ana', 'Bo', 'Cy', 'Dee']);
    await waitUntil(async () => (await readoutSpeed('Cy')) !== null, { message: 'Cy\'s kart in the readout' });
    assert.equal(await tryToJoin(), 'That game has already started.');
    assert.deepEqual(pageErrors, []);
  });

  test('End game frees the WebGL canvas and returns everyone to the lobby', async () => {
    // Twice in a row: the first click arms the button, the second ends the game.
    await clickNow(hostPage, GAME_END_BUTTON, 2);
    await hostPage.waitForSelector('#lobby:not([hidden])', { timeout: 20000 });
    assert.equal(await hostPage.evaluate(() => document.querySelectorAll('canvas').length), 0);
    for (const player of [ana, bo]) {
      await player.page.waitForSelector('#lobby-screen:not([hidden])');
    }
    assert.deepEqual(pageErrors, []);
  });
});
