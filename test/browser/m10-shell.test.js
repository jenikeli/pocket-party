// Browser tests for the host shell since M10b: the game picker (no room, no socket), Play (the room is made
// after the load, the join window opens by itself and closes on a click outside), the settings (the hold time),
// Back to games (two clicks, then every phone reads "The game ended"; a second game gets a new code), the room
// open on a race's setup screen and shut during a race (late joiners), the fifth phone refused in the 3D race, a
// name on every icon-only control, and the connection lost. The host is the real page in desktop Chromium, the
// phones emulated Pixel 7s. The QR code is proved in m1, reconnection in m4, a game that fails to load in m5a.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import {
  GAME_BACK_BUTTON,
  removeRowButton,
  goBackToPicker,
  startGame,
  startRace,
  clickNow,
} from '../helpers/host-buttons.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

// From small tablets to a 4K television: the stage scales to fit, so the join window must too.
const SCREEN_SIZES = [
  { width: 1920, height: 1080 },
  { width: 1024, height: 768 },
  { width: 640, height: 360 },
  { width: 3840, height: 2160 },
];

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

describe('M10b host shell', () => {
  let server;
  let browser;
  let hostPage;
  let hostMessages;
  let roomCode;
  // How many WebSockets the host page has opened: none until Play.
  let hostSocketCount = 0;
  // The phones that stay in the room from one test to the next: { context, page, playerId }.
  const phones = [];

  // Joins a new phone to the room `code` (its own context, so its own saved session).
  async function joinPhone(playerName, code = roomCode) {
    const context = await browser.newContext(devices['Pixel 7']);
    const page = await context.newPage();
    await page.goto(`${server.baseUrl}/?room=${code}`);
    await page.fill('#player-name', playerName);
    await page.click('#join-button');
    await page.waitForSelector('#game-screen:not([hidden])');
    const { playerId } = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    return { context, page, playerId };
  }

  // Tries to join and returns what the join screen says once the server has answered.
  async function tryJoin(code = roomCode) {
    const context = await browser.newContext(devices['Pixel 7']);
    const page = await context.newPage();
    await page.goto(`${server.baseUrl}/?room=${code}`);
    await page.click('#join-button');
    await page.waitForFunction(() => document.getElementById('join-status').textContent !== 'Joining...');
    const status = await page.textContent('#join-status');
    await context.close();
    return status;
  }

  // The visible buttons on the host page that hold no text and no name: an icon-only control must have both an
  // aria-label and a title (CLAUDE.md, "UI design").
  function unnamedIconButtons() {
    return hostPage.evaluate(() => {
      const isShown = (element) => element.getClientRects().length > 0;
      return [...document.querySelectorAll('button')]
        .filter((button) => isShown(button) && button.textContent.trim() === '')
        .filter((button) => !button.getAttribute('aria-label') || !button.title)
        .map((button) => button.id || button.className);
    });
  }

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    hostPage = await browser.newPage({ viewport: SCREEN_SIZES[0] });
    hostPage.on('websocket', () => (hostSocketCount += 1));
    hostMessages = watchServerMessages(hostPage);
    await openHost(hostPage, server.baseUrl);
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('the picker has no room: no socket is open, and a phone that tries to join is told no game is open', async () => {
    assert.equal(await hostPage.isVisible('#game-picker'), true);
    assert.equal(await hostPage.isVisible('#join-window'), false);
    assert.equal(await hostPage.isVisible('#room-code-chip'), false);
    assert.equal(await hostPage.isVisible('#game-back-button'), false);
    await hostPage.waitForTimeout(1000);
    assert.equal(hostSocketCount, 0, 'the host opens no socket before Play');
    assert.equal(await tryJoin('ABCD'), 'No game is open right now.');
    await saveScreenshot(hostPage, 'm10b-1-host-picker');
  });

  test('the picker shows the chosen game, its blurb, how many play it, and its thumbnails', async () => {
    assert.equal(await hostPage.getAttribute('[data-game-id="kart-3d"]', 'aria-pressed'), 'true');
    assert.equal(await hostPage.textContent('#picker-game-title'), 'Kartwheel');
    assert.equal(await hostPage.textContent('#picker-player-range'), '1 to 4');
    // The one line about the game is back under its name (from the registry's blurb).
    assert.match(await hostPage.textContent('#picker-game-blurb'), /\S/);
    await clickNow(hostPage, '[data-game-id="kart-2d"]');
    await hostPage.waitForSelector('[data-game-id="kart-2d"][aria-pressed="true"]');
    assert.equal(await hostPage.getAttribute('[data-game-id="kart-3d"]', 'aria-pressed'), 'false');
    assert.equal(await hostPage.textContent('#picker-game-title'), 'Kartwheel Mini');
    assert.match(await hostPage.textContent('#picker-game-blurb'), /\S/);
    assert.equal(await hostPage.textContent('#picker-player-range'), '2 to 9');
    await clickNow(hostPage, '[data-game-id="input-lab"]');
    await hostPage.waitForSelector('[data-game-id="input-lab"][aria-pressed="true"]');
    assert.equal(await hostPage.textContent('#picker-player-range'), '1 to 9');
    assert.deepEqual(await unnamedIconButtons(), []);
  });

  test('the settings gear opens the volumes and the hold time on the picker; the hold time is kept and clamped', async () => {
    assert.equal(await hostPage.isVisible('#settings'), false);
    await hostPage.click('#settings-button');
    await hostPage.waitForSelector('#settings:not([hidden])');
    assert.equal(await hostPage.getAttribute('#settings-button', 'aria-pressed'), 'true');
    assert.equal(await hostPage.isVisible('#music-volume'), true);
    assert.equal(await hostPage.isVisible('#effects-volume'), true);
    // Each row has words in place of an icon.
    assert.deepEqual(await hostPage.locator('#settings .settings-label').allTextContents(), [
      'Music',
      'Sound effects',
      'Hold a dropped player',
    ]);
    assert.equal(await hostPage.textContent('#grace-value'), '0:30');
    await saveScreenshot(hostPage, 'm10b-2-host-settings');

    await hostPage.click('#grace-plus');
    assert.equal(await hostPage.textContent('#grace-value'), '1:00');
    assert.equal(await hostPage.evaluate(() => localStorage.getItem('pocket-party-grace-seconds')), '60');
    // It cannot go below half a minute.
    await hostPage.click('#grace-minus');
    await hostPage.click('#grace-minus');
    assert.equal(await hostPage.textContent('#grace-value'), '0:30');
    await hostPage.click('#grace-plus');

    // A press anywhere else closes the panel.
    await hostPage.mouse.click(960, 540);
    await hostPage.waitForSelector('#settings', { state: 'hidden' });
    assert.equal(await hostPage.getAttribute('#settings-button', 'aria-pressed'), 'false');
  });

  test('Play shows the loading screen first and makes the room only after the game has loaded', async () => {
    await clickNow(hostPage, '[data-game-id="kart-2d"]');
    await hostPage.waitForSelector('[data-game-id="kart-2d"][aria-pressed="true"]');
    // Slows the game's code down, so the loading screen stays up long enough to look at the socket.
    await hostPage.route('**/host/games/kart-2d/index.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await clickNow(hostPage, '#play-button');
    await hostPage.waitForSelector('#loading-screen:not([hidden])');
    assert.equal(await hostPage.textContent('#loading-title'), 'Kartwheel Mini');
    assert.equal(hostSocketCount, 0, 'no room while the game loads');
    await saveScreenshot(hostPage, 'm10b-3-host-loading');

    ({ roomCode } = await hostMessages.nextOfType(MESSAGE_TYPES.ROOM_CREATED, 15000));
    assert.equal(hostSocketCount, 1);
    await hostPage.unroute('**/host/games/kart-2d/index.js');
    // The game has started with the room open, and the join window opens by itself.
    await hostPage.waitForSelector('#join-window:not([hidden])');
    await hostPage.waitForSelector('#loading-screen', { state: 'hidden' });
    assert.equal(await hostPage.isVisible('#game-picker'), false);
    assert.equal(await hostPage.textContent('#join-code'), roomCode);
    assert.equal(await hostPage.textContent('#room-code-chip'), roomCode);
    // The test host is on 127.0.0.1, which a phone cannot reach.
    assert.equal(await hostPage.isVisible('#join-lan-warning'), true);
  });

  test('the join window lists who joins, closes on Done and on a click outside, and Add players opens it', async () => {
    phones.push(await joinPhone('Ana'));
    await hostPage.waitForSelector(`#join-players [data-player-id="${phones[0].playerId}"]`);
    assert.equal(await hostPage.textContent(`#join-players [data-player-id="${phones[0].playerId}"]`), 'Ana');
    await saveScreenshot(hostPage, 'm10b-4-host-join-window');

    // The window has its title and hint again, and a Done button with words (no cross).
    assert.equal(await hostPage.textContent('.join-title'), 'Join the party');
    assert.match(await hostPage.textContent('.join-hint'), /room code/);
    assert.equal(await hostPage.textContent('#join-done-button'), 'Done');
    assert.equal(await hostPage.locator('#join-close-button').count(), 0);
    assert.deepEqual(await unnamedIconButtons(), []);
    await clickNow(hostPage, '#join-done-button');
    await hostPage.waitForSelector('#join-window', { state: 'hidden' });
    assert.equal(await hostPage.isVisible('#kart-2d-setup'), true);

    // Add players has its icon and its words.
    assert.equal((await hostPage.textContent('#game-add-players-button')).trim(), 'Add players');
    assert.equal(await hostPage.locator('#game-add-players-button svg').count(), 1);
    await hostPage.click('#game-add-players-button');
    await hostPage.waitForSelector('#join-window:not([hidden])');
    // The corner of the screen is on the window's dark backdrop, outside the panel.
    await hostPage.mouse.click(5, 300);
    await hostPage.waitForSelector('#join-window', { state: 'hidden' });
  });

  test('a phone that drops is counted down from the saved hold time in its setup row, and its cross removes it', async () => {
    const dropped = await joinPhone('Dee');
    phones.push(dropped);
    await dropped.context.close();
    await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_DISCONNECTED);
    const row = `.kart-player-row.away[data-player-id="${dropped.playerId}"]`;
    await hostPage.waitForSelector(row);
    // The hold time was set to a minute in the settings test.
    await waitUntil(async () => /^back in (1:00|0:5\d)$/.test(await hostPage.textContent(`${row} .kart-player-style`)), {
      message: 'the dropped player\'s row to count down from a minute',
    });
    await saveScreenshot(hostPage, 'm10b-5-host-away-row');

    const left = hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_LEFT);
    await clickNow(hostPage, removeRowButton(dropped.playerId), 2);
    assert.equal((await left).playerId, dropped.playerId);
    await hostPage.waitForSelector(row, { state: 'detached' });
    phones.pop();
  });

  test('during a race the room is shut and a late joiner is refused; with the setup screen up it is open', async () => {
    // A setup screen takes a late joiner: Bo comes in after the room has been open a while.
    phones.push(await joinPhone('Bo'));
    await hostPage.waitForSelector('#kart-2d-players .kart-player-row:nth-child(2)');
    await startRace(hostPage, phones.map((phone) => phone.page));
    assert.equal(await hostPage.isVisible('#game-add-players-button'), false);
    assert.equal(await hostPage.isVisible('#room-code-chip'), false);
    assert.equal(await tryJoin(), 'That game has already started.');
    assert.deepEqual(await unnamedIconButtons(), []);
  });

  test('Back to games needs two clicks: the first turns it red, a press elsewhere disarms it', async () => {
    // The back button has words now, so no aria-label or title.
    assert.equal((await hostPage.textContent(GAME_BACK_BUTTON)).trim(), 'Back to games');
    await hostPage.click(GAME_BACK_BUTTON);
    assert.match(await hostPage.getAttribute(GAME_BACK_BUTTON, 'class'), /\barmed\b/);
    await saveScreenshot(hostPage, 'm10b-6-host-back-armed');
    // A press elsewhere disarms it; the race goes on.
    await hostPage.mouse.click(960, 540);
    await waitUntil(async () => !/\barmed\b/.test(await hostPage.getAttribute(GAME_BACK_BUTTON, 'class')), {
      message: 'Back to games to disarm on a press elsewhere',
    });
    // So does the 3 s window running out.
    await hostPage.click(GAME_BACK_BUTTON);
    assert.match(await hostPage.getAttribute(GAME_BACK_BUTTON, 'class'), /\barmed\b/);
    await hostPage.waitForFunction(() => !document.getElementById('game-back-button').classList.contains('armed'), null, {
      timeout: 5000,
    });
    assert.equal(await hostPage.isVisible('#game-picker'), false);
    for (const phone of phones) {
      assert.equal(await phone.page.isVisible('#ended-screen'), false);
    }
  });

  test('the second click goes back mid-race: the picker shows and every phone reads "The game ended"', async () => {
    await goBackToPicker(hostPage);
    assert.equal(await hostPage.isVisible('#game-back-button'), false);
    assert.equal(await hostPage.isVisible('#room-code-chip'), false);
    for (const phone of phones) {
      await phone.page.waitForSelector('#ended-screen:not([hidden])');
      assert.equal(await phone.page.textContent('#ended-text'), 'The game ended');
    }
    await saveScreenshot(phones[0].page, 'm10b-7-controller-game-ended');
    // The old code leads nowhere now.
    assert.equal(await tryJoin(), 'No game is open right now.');
  });

  test('a second game gets a new code; "Join another" keeps the name and clears the code', async () => {
    const firstCode = roomCode;
    roomCode = await startGame(hostPage, { gameId: 'input-lab' });
    assert.notEqual(roomCode, firstCode);
    // Nothing of the last game's players is in the new room.
    assert.equal(await hostPage.locator('#join-players [data-player-id]').count(), 0);

    const ana = phones[0];
    await ana.page.click('#ended-join-button');
    await ana.page.waitForSelector('#join-screen:not([hidden])');
    assert.equal(await ana.page.inputValue('#room-code'), '');
    assert.equal(await ana.page.inputValue('#player-name'), 'Ana');
    await ana.page.fill('#room-code', roomCode);
    await ana.page.click('#join-button');
    await ana.page.waitForSelector('#pad-screen', { state: 'visible' });
    assert.equal(await ana.page.textContent('#game-status'), roomCode);
    await hostPage.waitForSelector('#game-container canvas');
    for (const phone of phones.slice(1)) {
      await phone.context.close();
    }
    phones.length = 0;
    await ana.context.close();
  });

  test('every icon-only control in a game has a name and a title', async () => {
    assert.deepEqual(await unnamedIconButtons(), []);
    // The gear stays an icon, with its name.
    assert.equal(await hostPage.getAttribute('#settings-button', 'aria-label'), 'Settings');
    assert.equal(await hostPage.getAttribute('#settings-button', 'title'), 'Settings');
    await hostPage.click('#settings-button');
    await hostPage.waitForSelector('#settings:not([hidden])');
    assert.deepEqual(await unnamedIconButtons(), []);
    await hostPage.mouse.click(960, 540);
  });

  test('going back from the lab shows the picker again with nothing to report, and Play is on', async () => {
    await goBackToPicker(hostPage);
    assert.equal(await hostPage.textContent('#picker-problem'), '');
    assert.equal(await hostPage.isEnabled('#play-button'), true);
  });
});

describe('M10b host shell, the 3D race takes four', () => {
  let server;
  let browser;
  let hostPage;
  let hostMessages;
  let roomCode;
  const contexts = [];

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    hostPage = await browser.newPage({ viewport: SCREEN_SIZES[0] });
    hostMessages = watchServerMessages(hostPage);
    await openHost(hostPage, server.baseUrl);
    roomCode = await startGame(hostPage, { gameId: 'kart-3d', timeoutMs: 60000 });
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('the setup says "Scan the code to join" until the first phone joins', async () => {
    assert.equal(await hostPage.textContent('#kart-3d-no-players'), 'Scan the code to join');
    assert.equal(await hostPage.isVisible('#kart-3d-no-players'), true);
    assert.equal(await hostPage.isVisible('#kart-3d-rows'), false);
    assert.equal(await hostPage.textContent('.k3d-card-heading'), 'Players');
  });

  test('four phones join and the fifth is told the room is full', async () => {
    for (const playerName of ['Ana', 'Bo', 'Cy', 'Di']) {
      const context = await browser.newContext(devices['Pixel 7']);
      contexts.push(context);
      const page = await context.newPage();
      await page.goto(`${server.baseUrl}/?room=${roomCode}`);
      await page.fill('#player-name', playerName);
      await page.click('#join-button');
      await page.waitForSelector('#game-screen:not([hidden])');
      await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    }
    const context = await browser.newContext(devices['Pixel 7']);
    contexts.push(context);
    const page = await context.newPage();
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.click('#join-button');
    await page.waitForFunction(() => document.getElementById('join-status').textContent !== 'Joining...');
    assert.equal(await page.textContent('#join-status'), 'That room is full.');
    assert.equal(await hostPage.locator('#kart-3d-rows .kart-player-row').count(), 4);
    assert.equal(await hostPage.isVisible('#kart-3d-no-players'), false);
    assert.equal(await hostPage.isVisible('#kart-3d-rows'), true);
  });
});

describe('M10b host shell, the join window fits every screen', () => {
  let server;
  let browser;

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('the join window fits every screen size', async () => {
    // One new host page (and room) per size: a headless page does not reliably run its resize handler when it is
    // resized after loading, so each page starts at its size.
    for (const size of SCREEN_SIZES) {
      const page = await browser.newPage({ viewport: size });
      await openHost(page, server.baseUrl);
      await startGame(page, { gameId: 'input-lab', keepJoinWindow: true });
      const fits = (inner, outer) => isInside(page, inner, outer);
      assert.equal(await fits('.join-panel', '#join-window'), true, `the panel fits ${size.width}x${size.height}`);
      assert.equal(await fits('#join-code', '.join-panel'), true, `the code fits ${size.width}x${size.height}`);
      assert.equal(await fits('#join-qr', '.join-panel'), true, `the QR fits ${size.width}x${size.height}`);
      assert.equal(await fits('#join-done-button', '.join-panel'), true, `Done fits ${size.width}x${size.height}`);
      await page.close();
    }
  });
});

describe('M10b host shell, connection lost', () => {
  let server;
  let browser;
  let hostPage;

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    hostPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await openHost(hostPage, server.baseUrl);
    await startGame(hostPage, { gameId: 'input-lab' });
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('when the server goes away the picker comes back and says so', async () => {
    await server.stop();
    // stop() waits for an exit event that a second call would never see, so the after hook must not call it again.
    server = null;
    await hostPage.waitForSelector('#game-picker:not([hidden])');
    assert.equal(await hostPage.textContent('#picker-problem'), 'Lost connection to the server.');
    assert.equal(await hostPage.isVisible('#game-back-button'), false);
    await saveScreenshot(hostPage, 'm10b-8-host-connection-lost');
  });
});
