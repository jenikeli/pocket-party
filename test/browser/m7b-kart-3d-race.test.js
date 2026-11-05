// Browser tests for M7b, the 3D race on its courses: the setup screen offers the courses, and its laps and
// engine class reach the phones; Start race counts down on both screens, then each split-screen view shows its
// player's name, lap and place (clear of the shell's game bar), the phones show their place and lap, and the
// race clock runs; the readout shows only with the tuning panel; when every player has left mid-race the
// results list the CPU karts and Back to lobby ends the game; the results panel lists players in their colours
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
import { launchBrowser, watchServerMessages, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { startGame, clickNow, NEXT_GAME_BUTTON } from '../helpers/host-buttons.js';
import { presetQuality, presetPlainCourse, clickStartRace, GAME_START_TIMEOUT } from '../helpers/kart-3d-host.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const HOST_SIZE = { width: 960, height: 540 };
// The lobby is drawn at 1920x1080 and scaled to fit the half-size page.
const HOST_SCALE = 0.5;
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
    await page.click('#ready-button');
    await page.waitForSelector('#ready-button[aria-pressed="true"]');
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

  async function leave(player) {
    player.page.once('dialog', (dialog) => dialog.accept());
    await player.page.click('#game-screen .leave-button');
    await player.page.waitForSelector('#join-screen:not([hidden])');
  }

  async function chooseKartRace3d() {
    // Input lab, Kart race 2D, then Kart race 3D.
    for (let i = 0; i < 2; i += 1) {
      await hostPage.mouse.click(NEXT_GAME_BUTTON.x * HOST_SCALE, NEXT_GAME_BUTTON.y * HOST_SCALE);
      await hostPage.waitForTimeout(300);
    }
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
    await hostPage.goto(`${server.baseUrl}/host`);
    roomCode = (await hostMessages.nextOfType(MESSAGE_TYPES.ROOM_CREATED, 10000)).roomCode;
    ana = await joinAs(chromium, 'Pixel 7 landscape', 'Ana');
    bo = await joinAs(webkit, 'iPhone 13 landscape', 'Bo');
    await chooseKartRace3d();
    await startGame(hostPage, ana.page, '#kart-setup', HOST_SCALE, GAME_START_TIMEOUT);
    await bo.page.waitForSelector('#kart-setup:not([hidden])');
  });

  after(async () => {
    await chromium?.close();
    await webkit?.close();
    await server?.stop();
  });

  test('the setup screen offers the courses; the host\'s laps and engine class reach the phones', async () => {
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    assert.deepEqual(await hostPage.locator('[data-course-id]').allTextContents(), ['Seaside Skyway', 'Test track']);
    assert.equal(await hostPage.getAttribute('[data-course-id="seaside-skyway"]', 'aria-pressed'), 'true');
    // The overview behind the setup screen changes to the chosen course, and back.
    await clickNow(hostPage, '[data-course-id="test-track"]');
    await hostPage.waitForSelector('[data-course-id="test-track"][aria-pressed="true"]');
    assert.equal(await hostPage.getAttribute('[data-course-id="seaside-skyway"]', 'aria-pressed'), 'false');
    await saveScreenshot(hostPage, 'm7b-0-host-setup-test-track');
    await clickNow(hostPage, '[data-course-id="seaside-skyway"]');
    await hostPage.waitForSelector('[data-course-id="seaside-skyway"][aria-pressed="true"]');
    assert.equal(await hostPage.getAttribute('[data-engine-class="150"]', 'aria-pressed'), 'true');
    await clickNow(hostPage, '#kart-3d-laps-plus');
    await clickNow(hostPage, '[data-engine-class="200"]');
    await hostPage.waitForSelector('[data-engine-class="200"][aria-pressed="true"]');
    assert.equal(await hostPage.textContent('#kart-3d-laps'), '4');
    const view = await nextView(bo, (each) => each.phase === 'setup' && each.engineClass === 200);
    assert.deepEqual(view, { phase: 'setup', laps: 4, engineClass: 200, steering: 'stick', autoAccelerate: false, ready: false });
    for (const player of [ana, bo]) {
      await waitUntil(async () => (await player.page.textContent('#kart-setup-laps')) === '4 laps, 200cc', { message: `${player.name}'s laps line` });
    }
    await saveScreenshot(hostPage, 'm7b-1-host-setup');
  });

  // M7d4c1: Watch races stand-ins that drive themselves, a view each, with no phone needed.
  test('Watch with 4 views races four self-driving stand-ins while the phones wait; Back to setup ends it', async () => {
    await clickNow(hostPage, '[data-watch-views="4"]');
    await waitUntil(async () => (await hudTexts('label')).length === 4, { ...RACE_TIMEOUT, message: 'four views' });
    assert.deepEqual(await hudTexts('label'), ['View 1', 'View 2', 'View 3', 'View 4']);
    assert.deepEqual(await hudTexts('lap'), Array(4).fill('Lap 1/4'));
    for (const player of [ana, bo]) {
      await waitUntil(async () => (await player.page.textContent('#kart-line')) === 'Waiting for the next race', { message: `${player.name} waits` });
    }
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
    // Bo's view is the bottom one, in the corner of the shell's End game and Close room buttons.
    const lifts = await hostPage.locator('.kart-3d-view-hud:not([hidden]) .kart-3d-view-place').evaluateAll((places) => places.map((place) => place.style.bottom));
    assert.deepEqual(lifts, ['0px', '80px']);
    await hostPage.waitForSelector('#kart-3d-countdown:not([hidden])');
    await saveScreenshot(hostPage, 'm7b-2-host-countdown');
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
    assert.match(await hostPage.textContent('#kart-3d-readout'), /Ana: [\d.]+ units\/s/);
    await clickNow(hostPage, '#kart-3d-tuning-button');
    await hostPage.waitForSelector('#kart-3d-readout', { state: 'hidden' });
  });

  test('when every player has left mid-race the race is over: the results list the CPU karts, Back to lobby ends the game', async () => {
    await leave(bo);
    await waitUntil(async () => (await hudTexts('label')).length === 1, { ...RACE_TIMEOUT, message: 'Bo\'s view gone' });
    assert.equal(await hostPage.isVisible('#kart-3d-results'), false, 'Ana is still racing');
    await leave(ana);
    await hostPage.waitForSelector('#kart-3d-results:not([hidden])', { timeout: 60000 });
    assert.equal(await hostPage.isVisible('#kart-3d-race-bar'), false, 'the race bar makes way for the results');
    const rows = await hostPage.locator('#kart-3d-results-rows li').allTextContents();
    assert.equal(rows.length, 10);
    rows.forEach((row, index) => assert.equal(row, `${['1st', '2nd', '3rd'][index] ?? `${index + 1}th`}CPU--`));
    await saveScreenshot(hostPage, 'm7b-5-host-results');
    await clickNow(hostPage, '#kart-3d-lobby-button');
    await hostPage.waitForSelector('#shell:not([hidden])', { timeout: 20000 });
    assert.equal(await hostPage.evaluate(() => document.querySelectorAll('canvas').length), 1, 'the race\'s canvas is gone');
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
      const panel = createResultsPanel(container, { onRaceAgain: () => (raceAgainClicks += 1), onBackToLobby: () => {} });
      panel.show([{ place: 1, playerId: 'p1', finishTime: 101.256 }, { place: 2, playerId: null, finishTime: null }], players);
      const rows = [...container.querySelectorAll('li')].map((row) => ({ text: row.textContent, color: row.querySelector('.name').style.color }));
      container.querySelector('#kart-3d-race-again-button').click();
      container.remove();
      return { rows, raceAgainClicks };
    });
    assert.deepEqual(shown.rows.map((row) => row.text), ['1stCy1:41.25', '2ndCPU--']);
    assert.notEqual(shown.rows[0].color, shown.rows[1].color, 'the player in their colour, CPU karts in grey');
    assert.equal(shown.raceAgainClicks, 1);
  });

  test('a race on the Test track; a lost WebGL context ends it through the shell\'s error path', async () => {
    // The room reopened after the game; a new player joins so the race can start again.
    const cy = await joinAs(chromium, 'Pixel 7 landscape', 'Cy');
    await startGame(hostPage, cy.page, '#kart-setup', HOST_SCALE, GAME_START_TIMEOUT);
    await hostPage.waitForSelector('#kart-3d-setup:not([hidden])');
    assert.equal(await hostPage.getAttribute('[data-course-id="seaside-skyway"]', 'aria-pressed'), 'true', 'a new game starts on the first course');
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
    await hostPage.waitForSelector('#shell:not([hidden])');
    await cy.page.waitForSelector('#lobby-screen:not([hidden])');
    assert.deepEqual(pageErrors, []);
  });
});
