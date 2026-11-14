// Browser tests for M7b, the 3D race on its courses: the setup screen offers the courses, and its laps and
// engine class reach the phones; Start race counts down on both screens, then each split-screen view shows its
// player's name, lap and place, the phones show their place and lap, and the
// race clock runs; the readout shows only with the tuning panel; when every player has left mid-race the
// results list the CPU karts and the back arrow ends the game; the results panel lists players in their colours
// with their times and its Race again button works; a race on the Test track; and a lost WebGL context ends
// the game through the shell's error path. Since M7d4c1, Watch on the setup screen races four self-driving
// stand-ins with a view each while the phones wait. Ana is an
// Android phone (Chromium), Bo an iPhone (WebKit). A whole race is not driven here: software-drawn WebGL runs
// at a few frames a second and nothing can steer blind round the course, so the unit tests drive whole races.
// Headless Chromium draws WebGL in software, so the host page is
// half the usual size and starts at Medium quality (test/helpers/kart-3d-host.js).

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { startGame, clickNow, goBackToPicker } from '../helpers/host-buttons.js';
import { presetQuality, presetPlainCourse, clickStartRace, clickWatch, GAME_START_TIMEOUT, STARTING_TIMEOUT } from '../helpers/kart-3d-host.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const HOST_SIZE = { width: 960, height: 540 };
const RACE_TIMEOUT = { timeoutMs: 60000 };

describe('M7b 3D race', () => {
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
    const player = { page, messages: watchServerMessages(page), name: playerName };
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.fill('#player-name', playerName);
    await page.click('#join-button');
    await page.waitForSelector('#kart-setup:not([hidden])');
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    return player;
  }

  async function nextView(player, check) {
    while (true) {
      const state = await player.messages.nextOfType(MESSAGE_TYPES.CONTROLLER_STATE, 60000);
      if (state.view && check(state.view)) {
        return state.view;
      }
    }
  }

  // The text of each shown view's HUD line `className` (label, lap or place), top view first.
  function hudTexts(className) {
    return hostPage.locator(`.kart-3d-view-hud:not([hidden]) .kart-3d-view-${className}`).allTextContents();
  }

  // Leave takes two taps: the first turns the icon red, the second leaves.
  async function leave(player) {
    await player.page.click('#game-top .leave-button');
    await player.page.click('#game-top .leave-button');
    await player.page.waitForSelector('#join-screen:not([hidden])');
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
    bo = await joinAs(webkit, 'iPhone 13 landscape', 'Bo');
    await bo.page.waitForSelector('#kart-setup:not([hidden])');
  });

  after(async () => {
    await chromium?.close();
    await webkit?.close();
    await server?.stop();
  });

  test('the setup screen offers the courses; the host\'s laps and engine class reach the phones', async () => {
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    // Since M9 Palm Bay Airport is first, and so chosen when a game starts.
    // Each course's picture has its name under it, and the chosen course has its one-line description.
    assert.deepEqual(await hostPage.locator('.k3d-course-tile-name').allTextContents(), ['Palm Bay Airport', 'Seaside Skyway', 'Test track']);
    assert.equal(await hostPage.textContent('#kart-3d-course-name'), 'Palm Bay Airport');
    const airportBlurb = await hostPage.textContent('#kart-3d-course-blurb');
    assert.match(airportBlurb, /\S/);
    assert.equal(await hostPage.getAttribute('[data-course-id="palm-bay-airport"]', 'aria-pressed'), 'true');
    // The setup's picture and name change to the chosen course, and on.
    await clickNow(hostPage, '[data-course-id="test-track"]');
    await hostPage.waitForSelector('[data-course-id="test-track"][aria-pressed="true"]');
    assert.equal(await hostPage.getAttribute('[data-course-id="palm-bay-airport"]', 'aria-pressed'), 'false');
    assert.notEqual(await hostPage.textContent('#kart-3d-course-blurb'), airportBlurb, 'the description follows the course');
    await saveScreenshot(hostPage, 'm7b-0-host-setup-test-track');
    await clickNow(hostPage, '[data-course-id="seaside-skyway"]');
    await hostPage.waitForSelector('[data-course-id="seaside-skyway"][aria-pressed="true"]');
    assert.equal(await hostPage.getAttribute('[data-engine-class="150"]', 'aria-pressed'), 'true');
    await clickNow(hostPage, '#kart-3d-laps-plus');
    await clickNow(hostPage, '[data-engine-class="200"]');
    await hostPage.waitForSelector('[data-engine-class="200"][aria-pressed="true"]');
    assert.equal(await hostPage.textContent('#kart-3d-laps'), '4');
    const view = await nextView(bo, (each) => each.phase === 'setup' && each.engineClass === 200);
    assert.deepEqual(view, { phase: 'setup', laps: 4, engineClass: 200, courseName: 'Seaside Skyway', steering: 'stick', autoAccelerate: false, ready: false });
    for (const player of [ana, bo]) {
      await waitUntil(async () => (await player.page.textContent('#kart-setup-laps')) === '4 laps, 200cc', { message: `${player.name}'s laps line` });
    }
    await saveScreenshot(hostPage, 'm7b-1-host-setup');
  });

  // M7d4c1: Watch races stand-ins that drive themselves, a view each, with no phone needed.
  test('Watch with 4 views races four self-driving stand-ins while the phones wait; Back to setup ends it', { timeout: STARTING_TIMEOUT }, async () => {
    await clickWatch(hostPage, 4);
    await waitUntil(async () => (await hudTexts('label')).length === 4, { ...RACE_TIMEOUT, message: 'four views' });
    assert.deepEqual(await hudTexts('label'), ['View 1', 'View 2', 'View 3', 'View 4']);
    assert.deepEqual(await hudTexts('lap'), Array(4).fill('Lap 1/4'));
    for (const player of [ana, bo]) {
      await waitUntil(async () => (await player.page.textContent('#kart-line')) === 'Waiting for the next race', { message: `${player.name} waits` });
    }
    // The race's bar is docked while Watch runs, with its buttons in the strip.
    assert.match(await hostPage.getAttribute('#top-bar', 'class'), /\bdocked\b/);
    await clickNow(hostPage, '#kart-3d-tuning-button');
    await waitUntil(async () => /View 4: [\d.]+ units\/s/.test(await hostPage.textContent('#kart-3d-readout')), { ...RACE_TIMEOUT, message: 'the readout lists the stand-ins' });
    await saveScreenshot(hostPage, 'm7b-1b-host-watch-4');
    await clickNow(hostPage, '#kart-3d-tuning-button');
    await clickNow(hostPage, '#kart-3d-setup-button');
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    for (const player of [ana, bo]) {
      await player.page.waitForSelector('#kart-setup:not([hidden])');
    }
  });

  test('Start race counts down on both screens; each view shows its player\'s name, lap and place', async () => {
    for (const player of [ana, bo]) {
      await player.page.click('#kart-ready-button');
      await player.page.waitForSelector('#kart-ready-button[aria-pressed="true"]');
    }
    await clickStartRace(hostPage);
    for (const player of [ana, bo]) {
      await player.page.waitForSelector('#kart-controls:not([hidden])');
    }
    assert.match(await ana.page.textContent('#kart-big'), /^[321]$/);
    assert.equal(await ana.page.textContent('#kart-line'), 'Get ready!');
    await waitUntil(async () => (await hudTexts('label')).length === 2, { ...RACE_TIMEOUT, message: 'a HUD on each view' });
    assert.deepEqual(await hudTexts('label'), ['Ana', 'Bo']);
    assert.deepEqual(await hudTexts('lap'), ['Lap 1/4', 'Lap 1/4']);
    // The players start at the back of the grid, Bo last.
    assert.deepEqual(await hudTexts('place'), ['11th', '12th']);
    await hostPage.waitForSelector('#kart-3d-countdown:not([hidden])');
    await saveScreenshot(hostPage, 'm7b-2-host-countdown');
  });

  // Since M10c the bar is a strip under the views, so nothing makes room for a back arrow: the first view's name
  // sits in its top-left corner like every other view's, and no view's HUD reaches the strip.
  test('every view\'s name sits at the top of its view, and the strip under the views covers no view\'s HUD', async () => {
    const canvas = await hostPage.locator('#game-container canvas').boundingBox();
    const strip = await hostPage.locator('#top-bar').boundingBox();
    const huds = hostPage.locator('.kart-3d-view-hud:not([hidden])');
    const firstLabel = await huds.nth(0).locator('.kart-3d-view-label').boundingBox();
    assert.ok(firstLabel.y - canvas.y < 12 && firstLabel.x - canvas.x < 12, 'the first view\'s name is in its top-left corner');
    const secondLabel = await huds.nth(1).locator('.kart-3d-view-label').boundingBox();
    assert.ok(Math.abs(secondLabel.x - firstLabel.x) < 1, 'both names start at the left edge');
    for (const place of await huds.locator('.kart-3d-view-place').all()) {
      const box = await place.boundingBox();
      assert.ok(box.y + box.height <= strip.y + 1, 'a place number ends above the strip');
    }
  });

  test('the strip holds Back to games, the race\'s buttons and clock, and the gear, with the room shut', async () => {
    await hostPage.waitForSelector('#kart-3d-clock:not([hidden])');
    assert.equal(await hostPage.isVisible('#game-add-players-button'), false);
    assert.equal(await hostPage.isVisible('#room-code-chip'), false);
    const strip = await hostPage.locator('#top-bar').boundingBox();
    for (const selector of ['#game-back-button', '#kart-3d-setup-button', '#kart-3d-restart-button', '#kart-3d-tuning-button', '#kart-3d-clock', '#settings-button']) {
      const box = await hostPage.locator(selector).boundingBox();
      assert.ok(box.y >= strip.y - 1 && box.y + box.height <= strip.y + strip.height + 1, `${selector} is inside the strip`);
      assert.ok(box.x >= strip.x - 1 && box.x + box.width <= strip.x + strip.width + 1, `${selector} is inside the strip's width`);
    }
    // Next to each other without overlap, left to right: the buttons, then the clock, then the gear.
    const lefts = [];
    for (const selector of ['#game-back-button', '#kart-3d-setup-button', '#kart-3d-restart-button', '#kart-3d-tuning-button', '#kart-3d-clock', '#settings-button']) {
      lefts.push(await hostPage.locator(selector).boundingBox());
    }
    lefts.slice(1).forEach((box, index) => assert.ok(box.x >= lefts[index].x + lefts[index].width - 1, 'the strip\'s controls do not overlap'));

    // With the bar docked, the settings open upward from the gear, above the strip, and the gear closes them.
    await clickNow(hostPage, '#settings-button');
    await hostPage.waitForSelector('#settings:not([hidden])');
    const settings = await hostPage.locator('#settings').boundingBox();
    assert.ok(settings.y + settings.height <= strip.y + 1, 'the settings panel opens above the strip');
    assert.ok(settings.y >= 0, 'and fits on the page');
    await saveScreenshot(hostPage, 'm7b-3b-host-racing-settings');
    await clickNow(hostPage, '#settings-button');
    await hostPage.waitForSelector('#settings', { state: 'hidden' });
  });

  test('after GO the phones show their place and lap, and the race clock runs', async () => {
    const view = await nextView(ana, (each) => each.phase === 'racing' && each.countdown === null);
    assert.deepEqual(
      { lap: view.lap, laps: view.laps, place: view.place, finalLap: view.finalLap, finished: view.finished },
      { lap: 1, laps: 4, place: 11, finalLap: false, finished: false },
    );
    await waitUntil(async () => (await ana.page.textContent('#kart-big')) === '11th', { ...RACE_TIMEOUT, message: 'Ana\'s place on her phone' });
    assert.equal(await ana.page.textContent('#kart-line'), 'Lap 1/4');
    await hostPage.waitForSelector('#kart-3d-clock:not([hidden])');
    assert.match(await hostPage.textContent('#kart-3d-clock'), /^\d:\d\d\.\d\d$/);
    await saveScreenshot(hostPage, 'm7b-3-host-racing');
    await saveScreenshot(bo.page, 'm7b-4-phone-racing');
  });

  test('the readout shows only while the tuning panel is open', async () => {
    assert.equal(await hostPage.isVisible('#kart-3d-readout'), false);
    await clickNow(hostPage, '#kart-3d-tuning-button');
    await hostPage.waitForSelector('#kart-3d-readout:not([hidden])');
    assert.equal(await hostPage.locator('#kart-3d-tuning #kart-3d-readout').count(), 1, 'the readout is in the popup');
    assert.match(await hostPage.textContent('#kart-3d-readout'), /Ana: [\d.]+ units\/s/);
    await clickNow(hostPage, '#kart-3d-tuning-button');
    await hostPage.waitForSelector('#kart-3d-readout', { state: 'hidden' });
  });

  test('when every player has left mid-race the race is over: the results list the CPU karts, the back arrow ends the game', async () => {
    await leave(bo);
    await waitUntil(async () => (await hudTexts('label')).length === 1, { ...RACE_TIMEOUT, message: 'Bo\'s view gone' });
    assert.equal(await hostPage.isVisible('#kart-3d-results'), false, 'Ana is still racing');
    await leave(ana);
    await hostPage.waitForSelector('#kart-3d-results:not([hidden])', { timeout: 60000 });
    assert.equal(await hostPage.isVisible('#kart-3d-race-bar'), false, 'the race bar makes way for the results');
    const rows = await hostPage.locator('#kart-3d-results-rows li').allTextContents();
    assert.equal(rows.length, 10);
    // No kart finished, so no row has a time or a gap.
    rows.forEach((row, index) => assert.equal(row, `${['1st', '2nd', '3rd'][index] ?? `${index + 1}th`}CPU--`));
    assert.equal(await hostPage.textContent('#kart-3d-results .k3d-results-heading h2'), 'Results');
    assert.match(await hostPage.textContent('#kart-3d-results-summary'), /^Seaside Skyway · 200cc · 4 laps$/);
    assert.equal(await hostPage.locator('#kart-3d-results-rows li.first').count(), 1, 'the winner\'s row is marked');
    await saveScreenshot(hostPage, 'm7b-5-host-results');
    assert.equal(await hostPage.locator('#kart-3d-lobby-button').count(), 0, 'the results have no Back to lobby button any more');
    await goBackToPicker(hostPage);
    assert.equal(await hostPage.evaluate(() => document.querySelectorAll('canvas').length), 0, 'the race\'s canvas is gone');
  });

  test('the results panel lists players in their colours with their times, and Race again works', async () => {
    // The page's own module, with standings as race-views.js makes them, in a container of its own.
    const shown = await hostPage.evaluate(async () => {
      const { createResultsPanel } = await import('/host/games/kart-3d/results-panel.js');
      const { addPlayer } = await import('/host/roster.js');
      const container = document.createElement('div');
      document.body.append(container);
      const players = new Map();
      addPlayer(players, 'p1');
      players.get('p1').name = 'Cy';
      let raceAgainClicks = 0;
      const panel = createResultsPanel(container, { onRaceAgain: () => (raceAgainClicks += 1) });
      panel.show(
        [{ place: 1, playerId: 'p1', finishTime: 101.256 }, { place: 2, playerId: null, finishTime: 103.746 }, { place: 3, playerId: null, finishTime: null }],
        players,
        'Seaside Skyway · 150cc · 3 laps',
      );
      const summary = container.querySelector('#kart-3d-results-summary').textContent;
      const rows = [...container.querySelectorAll('li')].map((row) => ({ text: row.textContent, color: row.querySelector('.name .pp-dot').style.getPropertyValue('--pp-dot-color') }));
      container.querySelector('#kart-3d-race-again-button').click();
      container.remove();
      return { rows, summary, raceAgainClicks };
    });
    // Place, name, time and the gap to the winner (the winner and a kart that did not finish have none).
    assert.deepEqual(shown.rows.map((row) => row.text), ['1stCy1:41.25', '2ndCPU1:43.74+2.49', '3rdCPU--']);
    assert.equal(shown.summary, 'Seaside Skyway · 150cc · 3 laps');
    assert.notEqual(shown.rows[0].color, shown.rows[1].color, 'the player in their colour, CPU karts in grey');
    assert.equal(shown.raceAgainClicks, 1);
  });

  test('a race on the Test track; a lost WebGL context ends it through the shell\'s error path', { timeout: STARTING_TIMEOUT }, async () => {
    // The last game ended with the back arrow; a new game has a new room, and a new player joins it.
    roomCode = await startGame(hostPage, { gameId: 'kart-3d', timeoutMs: GAME_START_TIMEOUT });
    const cy = await joinAs(chromium, 'Pixel 7 landscape', 'Cy');
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    assert.equal(await hostPage.getAttribute('[data-course-id="palm-bay-airport"]', 'aria-pressed'), 'true', 'a new game starts on the first course');
    await clickNow(hostPage, '[data-course-id="test-track"]');
    await hostPage.waitForSelector('[data-course-id="test-track"][aria-pressed="true"]');
    await cy.page.click('#kart-ready-button');
    await clickStartRace(hostPage, 'test-track');
    await cy.page.waitForSelector('#kart-controls:not([hidden])');
    await waitUntil(async () => (await hudTexts('lap')).join() === 'Lap 1/3', { ...RACE_TIMEOUT, message: 'Cy\'s view on the Test track' });
    await saveScreenshot(hostPage, 'm7b-6-host-test-track');
    // What happens when the browser takes the graphics memory back (it can, on an iPad under pressure).
    const stopped = hostPage.waitForEvent('console', (entry) => entry.text().includes('Kart race 3D stopped with an error'));
    await hostPage.evaluate(() => {
      document.querySelector('#game-container canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();
    });
    await stopped;
    await hostPage.waitForSelector('#game-picker:not([hidden])');
    assert.match(await hostPage.textContent('#picker-problem'), /^Kart race 3D stopped with an error/);
    await cy.page.waitForSelector('#ended-screen:not([hidden])');
    assert.deepEqual(pageErrors, []);
  });
});
