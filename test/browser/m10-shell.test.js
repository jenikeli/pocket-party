// Browser tests for the M10 host shell: the join window (opens by itself, Done, Add players, a click outside, fits
// every screen size), room settings (the hold time), Play and the player count (too few and too many players), the
// loading screen, the room open on a game's setup screen and shut during a race (late joiners), and the
// connection-lost screen. The host is the real page in desktop Chromium, the phones emulated Pixel 7s. The
// Tap to start screen, the QR code and the lobby's chips and Change name are proved in m1 and m4.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import {
  GAME_END_BUTTON,
  lobbyChip,
  chooseGame,
  closeJoinWindow,
  startRace,
  clickNow,
  confirmClick,
} from '../helpers/host-buttons.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

// From small tablets to a 4K television: the stage scales to fit, so the join window must too.
const SCREEN_SIZES = [
  { width: 1920, height: 1080 },
  { width: 1024, height: 768 },
  { width: 640, height: 360 },
  { width: 3840, height: 2160 },
];

describe('M10 host shell', () => {
  let server;
  let browser;
  let hostPage;
  let hostMessages;
  let roomCode;
  // The phones that stay in the room from one test to the next: { context, page, playerId }.
  const phones = [];

  // Joins a new phone (its own context, so its own saved session). `screen` is what it should end up showing:
  // the lobby, or the game screen when the room is open on a game's setup.
  async function joinPhone(playerName, screen = '#lobby-screen') {
    const context = await browser.newContext(devices['Pixel 7']);
    const page = await context.newPage();
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.fill('#player-name', playerName);
    await page.click('#join-button');
    await page.waitForSelector(`${screen}:not([hidden])`);
    const { playerId } = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    return { context, page, playerId };
  }

  // Tries to join and returns what the join screen says once the server has answered.
  async function tryJoin() {
    const context = await browser.newContext(devices['Pixel 7']);
    const page = await context.newPage();
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.click('#join-button');
    await page.waitForFunction(() => document.getElementById('join-status').textContent !== 'Joining...');
    const status = await page.textContent('#join-status');
    await context.close();
    return status;
  }

  async function removeChip(playerId) {
    const left = hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_LEFT);
    await confirmClick(hostPage, lobbyChip(playerId));
    assert.equal((await left).playerId, playerId);
  }

  // Whether the element `inner` lies inside the element `outer`, both as selectors on `page`.
  async function isInside(page, inner, outer) {
    const innerBox = await page.locator(inner).boundingBox();
    const outerBox = await page.locator(outer).boundingBox();
    return (
      innerBox.x >= outerBox.x - 1 &&
      innerBox.y >= outerBox.y - 1 &&
      innerBox.x + innerBox.width <= outerBox.x + outerBox.width + 1 &&
      innerBox.y + innerBox.height <= outerBox.y + outerBox.height + 1
    );
  }

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    hostPage = await browser.newPage({ viewport: SCREEN_SIZES[0] });
    hostMessages = watchServerMessages(hostPage);
    roomCode = await openHost(hostPage, server.baseUrl, hostMessages);
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('the join window opens by itself and lists the players who join', async () => {
    assert.equal(await hostPage.isVisible('#join-window'), true);
    assert.equal(await hostPage.isVisible('#join-qr svg'), true);
    assert.equal(await hostPage.textContent('#join-code'), roomCode);
    // The test host is on 127.0.0.1, which a phone cannot reach.
    assert.equal(await hostPage.isVisible('#join-lan-warning'), true);

    phones.push(await joinPhone('Ana'));
    await hostPage.waitForSelector(`#join-players [data-player-id="${phones[0].playerId}"]`);

    await saveScreenshot(hostPage, 'm10-1-host-join-window');
  });

  test('the join window fits every screen size', async () => {
    // One new host page (and room) per size: a headless page does not reliably run its resize handler when it is
    // resized after loading, so each page starts at its size.
    for (const size of SCREEN_SIZES) {
      const page = await browser.newPage({ viewport: size });
      await openHost(page, server.baseUrl, watchServerMessages(page));
      const fits = (inner, outer) => isInside(page, inner, outer);
      assert.equal(await fits('.join-panel', '#join-window'), true, `the panel fits ${size.width}x${size.height}`);
      assert.equal(await fits('#join-code', '.join-panel'), true, `the code fits ${size.width}x${size.height}`);
      assert.equal(await fits('#join-qr', '.join-panel'), true, `the QR fits ${size.width}x${size.height}`);
      assert.equal(await fits('#join-done-button', '.join-panel'), true, `Done fits ${size.width}x${size.height}`);
      await page.close();
    }
  });

  test('Done closes the join window, Add players opens it again, and so does a click outside the panel close it', async () => {
    await hostPage.click('#join-done-button');
    await hostPage.waitForSelector('#join-window', { state: 'hidden' });
    assert.equal(await hostPage.isVisible('#lobby'), true);

    await hostPage.click('#add-players-button');
    await hostPage.waitForSelector('#join-window:not([hidden])');
    // The corner of the screen is on the window's dark backdrop, outside the panel.
    await hostPage.mouse.click(5, 5);
    await hostPage.waitForSelector('#join-window', { state: 'hidden' });
  });

  test('Room settings steps the hold time for a dropped player, and a dropped player counts down from it', async () => {
    await hostPage.click('#room-settings-button');
    await hostPage.waitForSelector('#room-settings:not([hidden])');
    assert.equal(await hostPage.textContent('#grace-value'), '0:30');
    assert.equal(await hostPage.isVisible('#music-volume'), true);
    assert.equal(await hostPage.isVisible('#effects-volume'), true);
    await saveScreenshot(hostPage, 'm10-2-host-room-settings');

    await hostPage.click('#grace-plus');
    assert.equal(await hostPage.textContent('#grace-value'), '1:00');
    // A phone that drops now is held for a minute.
    const dropped = await joinPhone('Dee');
    await dropped.context.close();
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_DISCONNECTED);
    await waitUntil(async () => /^back in (1:00|0:5\d)$/.test(await readStatus(dropped.playerId)), {
      message: 'the dropped player\'s chip to count down from a minute',
    });

    // It cannot go below half a minute, and a click outside the panel closes it.
    await hostPage.click('#grace-minus');
    await hostPage.click('#grace-minus');
    assert.equal(await hostPage.textContent('#grace-value'), '0:30');
    await hostPage.mouse.click(960, 540);
    await hostPage.waitForSelector('#room-settings', { state: 'hidden' });
    await removeChip(dropped.playerId);

    function readStatus(playerId) {
      return hostPage.$eval(lobbyChip(playerId), (chip) => chip.children[2].textContent);
    }
  });

  test('Play is off with the reason shown when the count does not fit: too few for the 2D race, too many for the 3D race', async () => {
    // One player: Kart race 3D takes any count, Kart race 2D needs two.
    assert.equal(await hostPage.isDisabled('#play-button'), false);
    await chooseGame(hostPage, 'kart-2d');
    await waitUntil(() => hostPage.isDisabled('#play-button'), { message: 'Play to be off with one player' });
    assert.equal(await hostPage.textContent('#lobby-status'), 'Kart race 2D needs at least 2 players');

    // The lobby takes up to 9, so a fifth player gets in even though the 3D race takes only 4.
    for (const playerName of ['Bo', 'Cy', 'Di', 'Ed']) {
      phones.push(await joinPhone(playerName));
    }
    await chooseGame(hostPage, 'kart-3d');
    await waitUntil(() => hostPage.isDisabled('#play-button'), { message: 'Play to be off with five players' });
    assert.equal(await hostPage.textContent('#lobby-status'), 'Kart race 3D takes at most 4 players');
    await saveScreenshot(hostPage, 'm10-3-host-too-many');

    // The other games take five, and removing one player brings the 3D race back in range.
    await chooseGame(hostPage, 'kart-2d');
    await waitUntil(async () => !(await hostPage.isDisabled('#play-button')), { message: 'Play to turn on for the 2D race' });
    assert.equal(await hostPage.textContent('#lobby-status'), '');
    const removed = phones.pop();
    await removeChip(removed.playerId);
    await chooseGame(hostPage, 'kart-3d');
    await waitUntil(async () => !(await hostPage.isDisabled('#play-button')), { message: 'Play to turn on with four players' });
    assert.equal(await hostPage.textContent('#lobby-status'), '');
    await removed.context.close();
  });

  test('Play shows the loading screen, then the 2D race\'s setup with the room open: a late joiner gets in', async () => {
    await chooseGame(hostPage, 'kart-2d');
    // Slows the game's code down, so the loading screen stays up long enough to see.
    await hostPage.route('**/host/games/kart-2d/index.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await clickNow(hostPage, '#play-button');
    await hostPage.waitForSelector('#loading-screen:not([hidden])');
    assert.equal(await hostPage.textContent('#loading-title'), 'Kart race 2D');
    await saveScreenshot(hostPage, 'm10-4-host-loading');
    await phones[0].page.waitForSelector('#kart-setup', { state: 'visible', timeout: 15000 });
    await hostPage.waitForSelector('#loading-screen', { state: 'hidden' });
    await hostPage.unroute('**/host/games/kart-2d/index.js');

    // The setup screen is where a player can still come in, from the game bar's Add players or the QR.
    await hostPage.waitForSelector('#game-add-players-button:not([hidden])');
    await clickNow(hostPage, '#game-add-players-button');
    await hostPage.waitForSelector('#join-window:not([hidden])');
    await closeJoinWindow(hostPage);
    const late = await joinPhone('Late', '#game-screen');
    phones.push(late);
    await late.page.waitForSelector('#kart-setup', { state: 'visible' });
    await waitUntil(async () => (await hostPage.locator('#kart-2d-players li').count()) === phones.length, {
      message: 'the setup screen to list the late joiner',
    });
    await saveScreenshot(hostPage, 'm10-5-host-setup-late-joiner');
  });

  test('during a race the room is shut and a late joiner is refused; after End game it is open again', async () => {
    await startRace(hostPage, phones.map((phone) => phone.page));
    assert.equal(await hostPage.isVisible('#game-add-players-button'), false);
    assert.equal(await tryJoin(), 'That game has already started.');

    await confirmClick(hostPage, GAME_END_BUTTON);
    await hostPage.waitForSelector('#lobby:not([hidden])');
    await phones[0].page.waitForSelector('#lobby-screen:not([hidden])');
    const afterwards = await joinPhone('After');
    assert.equal(await afterwards.page.isVisible('#lobby-screen'), true);
    await afterwards.context.close();
  });
});

describe('M10 host shell, connection lost', () => {
  let server;
  let browser;
  let hostPage;

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    hostPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await openHost(hostPage, server.baseUrl, watchServerMessages(hostPage));
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('when the server goes away the host says so and offers a new room', async () => {
    await closeJoinWindow(hostPage);
    await server.stop();
    // stop() waits for an exit event that a second call would never see, so the after hook must not call it again.
    server = null;
    await hostPage.waitForSelector('#connection-lost:not([hidden])');
    assert.equal(await hostPage.textContent('#connection-lost-message'), 'Lost connection to the server.');
    assert.equal(await hostPage.isVisible('#new-room-button'), true);
    await saveScreenshot(hostPage, 'm10-6-host-connection-lost');
  });
});
