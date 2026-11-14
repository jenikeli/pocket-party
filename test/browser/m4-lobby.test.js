// Browser tests for M4, joining and reconnection: the real host page (desktop Chromium) and real controller
// pages on an emulated Android phone (Chromium) and iPhone (WebKit), in the input lab's room. Dead and unreachable
// sockets are faked by routing the controller's WebSocket through Playwright (page.routeWebSocket), which can
// stop passing frames. Since M10b a phone that joins lands on the game's screen at once (no lobby page, no Change
// name), Leave and the host's Remove are two clicks confirmed by colour (no dialog), and the back arrow ends the
// game for every phone. The picker, join window and settings are in m10-shell.test.js, the races' rows in m5c.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader, findColor } from '../helpers/screenshot-pixels.js';
import { cardRemoveButton, closeJoinWindow, goBackToPicker, startGame, clickNow, confirmClick } from '../helpers/host-buttons.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const CONTROLLER_DEVICES = [
  { name: 'android', engine: 'chromium', device: devices['Pixel 7'] },
  { name: 'iphone', engine: 'webkit', device: devices['iPhone 13'] },
];

const FIRST_COLOR = '#e74c3c';
const SECOND_COLOR = '#3498db';
// The red of an armed button (--pp-danger), as drawn on the input lab's canvas by host/buttons.js.
const ARMED_RED = 0x8e2b22;

// Routes the page's game socket through Playwright. Returns { routes, setBlocked(flag) }: routes[i].cut = true
// makes socket i drop every frame both ways (a half-open socket); while blocked, new sockets are closed at once
// without reaching the server (no network). Call before page.goto.
async function routeSockets(page) {
  const routes = [];
  let blocked = false;
  await page.routeWebSocket(/\/ws$/, (pageSide) => {
    const route = { pageSide, cut: false };
    routes.push(route);
    if (blocked) {
      pageSide.close();
      return;
    }
    const serverSide = pageSide.connectToServer();
    pageSide.onMessage((message) => !route.cut && serverSide.send(message));
    serverSide.onMessage((message) => !route.cut && pageSide.send(message));
  });
  return { routes, setBlocked: (flag) => (blocked = flag) };
}

for (const { name, engine, device } of CONTROLLER_DEVICES) {
  describe(`M4 joining and reconnection with ${name} controllers`, () => {
    let server;
    let hostBrowser;
    let controllerBrowser;
    let pixelReader;
    let hostPage;
    let hostMessages;
    let roomCode;
    // Ana and Bo each get their own browser context, so each has its own localStorage (its saved session).
    let ana;
    let bo;

    async function openPlayer(context) {
      const page = await context.newPage();
      await page.goto(`${server.baseUrl}/?room=${roomCode}`);
      return page;
    }

    async function joinAs(playerName) {
      const context = await controllerBrowser.newContext(device);
      const page = await openPlayer(context);
      await page.fill('#player-name', playerName);
      await page.click('#join-button');
      await page.waitForSelector('#pad-screen', { state: 'visible' });
      const { playerId } = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
      return { context, page, playerId };
    }

    // The next message of `type` the host receives about this player (other players' traffic is skipped).
    async function nextAbout(type, playerId, timeoutMs = 5000) {
      while (true) {
        const message = await hostMessages.nextOfType(type, timeoutMs);
        if (message.playerId === playerId) {
          return message;
        }
      }
    }

    // What the join window shows for a player: the name and the color of the dot. The window is opened from the
    // top bar and closed again, since it covers the lab.
    async function readJoinChip(playerId) {
      await clickNow(hostPage, '#game-add-players-button');
      await hostPage.waitForSelector('#join-window:not([hidden])');
      const chip = await hostPage.waitForSelector(`#join-players [data-player-id="${playerId}"]`);
      const shown = await chip.evaluate((element) => ({
        name: element.children[1].textContent,
        color: element.children[0].style.getPropertyValue('--pp-dot-color'),
        away: element.classList.contains('away'),
      }));
      await closeJoinWindow(hostPage);
      return shown;
    }

    // Whether any pixel of the armed red shows around the close mark of the input lab card in slot `slotIndex`.
    async function cardIsArmed(slotIndex) {
      const { x, y } = cardRemoveButton(slotIndex);
      const area = { left: x - 24, top: y - 24, right: x + 24, bottom: y + 24 };
      return (await findColor(pixelReader, await hostPage.screenshot(), ARMED_RED, area)).count > 0;
    }

    // Our handler only reads document.visibilityState, which stays 'visible' in a headless page.
    function fireBackToVisible(page) {
      return page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    }

    before(async () => {
      server = await startServer();
      hostBrowser = await launchBrowser('chromium');
      controllerBrowser = engine === 'chromium' ? hostBrowser : await launchBrowser(engine);
      pixelReader = await openPixelReader(hostBrowser);
      hostPage = await hostBrowser.newPage({ viewport: { width: 1920, height: 1080 } });
      hostMessages = watchServerMessages(hostPage);
      await openHost(hostPage, server.baseUrl);
      roomCode = await startGame(hostPage, { gameId: 'input-lab' });
    });

    after(async () => {
      await hostBrowser?.close();
      await controllerBrowser?.close();
      await server?.stop();
    });

    test('a player joins with a name and lands on the game at once, with the room code and no lobby page; the host lists the name in its color', async () => {
      ana = await joinAs('Ana');
      assert.equal(await ana.page.textContent('#game-status'), roomCode);
      for (const gone of ['#lobby-screen', '#ready-button', '#change-name-button', '#lobby-others', '#player-label']) {
        assert.equal(await ana.page.locator(gone).count(), 0, `the phone has no ${gone}`);
      }
      await waitUntil(async () => (await readJoinChip(ana.playerId)).name === 'Ana', {
        message: 'the host to list the name',
        timeoutMs: 15000,
      });
      assert.deepEqual(await readJoinChip(ana.playerId), { name: 'Ana', color: FIRST_COLOR, away: false });
      await saveScreenshot(ana.page, `${name}-m4-1-controller-joined`);
    });

    test('a second player gets the next color', async () => {
      bo = await joinAs('Bo');
      await waitUntil(async () => (await readJoinChip(bo.playerId)).name === 'Bo', {
        message: 'the host to list Bo',
        timeoutMs: 15000,
      });
      assert.deepEqual(await readJoinChip(bo.playerId), { name: 'Bo', color: SECOND_COLOR, away: false });
    });

    test('a code typed by hand goes into the address bar; Leave takes two taps (red first, no dialog) and frees the slot without reconnecting', async () => {
      const context = await controllerBrowser.newContext(device);
      const page = await context.newPage();
      let dialogs = 0;
      page.on('dialog', (dialog) => {
        dialogs += 1;
        return dialog.dismiss();
      });
      await page.goto(`${server.baseUrl}/`);
      await page.fill('#room-code', roomCode.toLowerCase());
      await page.click('#join-button');
      await page.waitForSelector('#pad-screen', { state: 'visible' });
      const { playerId } = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
      assert.equal(new URL(page.url()).searchParams.get('room'), roomCode);

      const leave = '#game-top .leave-button';
      assert.equal(await page.getAttribute(leave, 'aria-label'), 'Leave game');
      assert.equal(await page.getAttribute(leave, 'title'), 'Leave game');
      assert.equal(await page.locator(`${leave} svg`).count(), 1, 'the leave button holds the door icon');
      await page.click(leave);
      assert.match(await page.getAttribute(leave, 'class'), /\barmed\b/);
      await saveScreenshot(page, `${name}-m4-2-controller-leave-armed`);
      // A press elsewhere disarms it, and nothing has left yet.
      await page.click('#game-status');
      await waitUntil(async () => !/\barmed\b/.test(await page.getAttribute(leave, 'class')), {
        message: 'Leave to disarm on a press elsewhere',
      });
      assert.equal(await page.isVisible('#pad-screen'), true);

      await page.click(leave);
      await page.click(leave);
      await page.waitForSelector('#join-screen:not([hidden])');
      assert.equal(await page.textContent('#join-status'), 'You left the game.');
      assert.equal(dialogs, 0, 'there is no confirm dialog any more');
      // Straight to PLAYER_LEFT: no disconnect, no grace period.
      assert.equal((await nextAbout(MESSAGE_TYPES.PLAYER_LEFT, playerId)).playerId, playerId);
      assert.equal(await page.evaluate(() => localStorage.getItem('pocket-party:session')), null);
      // It stays on the join screen: no rejoin attempt, so no second socket.
      await page.waitForTimeout(500);
      assert.equal(await page.isVisible('#reconnect-overlay'), false);
      await context.close();
    });

    test('the host removes a player from the lab with two clicks on the card\'s cross, red after the first, and the phone is told', async () => {
      const cy = await joinAs('Cy');
      // Ana and Bo hold the first two slots, so Cy's card is the third.
      const cross = cardRemoveButton(2);
      assert.equal(await cardIsArmed(2), false);
      await hostPage.mouse.click(cross.x, cross.y);
      await waitUntil(() => cardIsArmed(2), { message: 'the cross to turn red' });
      await saveScreenshot(hostPage, `${name}-m4-3-host-remove-armed`);
      // A press elsewhere (on the card's own body) disarms it and the player stays.
      await hostPage.mouse.click(cross.x - 300, cross.y + 150);
      await waitUntil(async () => !(await cardIsArmed(2)), { message: 'the cross to disarm on a press elsewhere' });
      assert.equal(await cy.page.isVisible('#pad-screen'), true);

      await confirmClick(hostPage, cross);
      await nextAbout(MESSAGE_TYPES.PLAYER_LEFT, cy.playerId);
      await cy.page.waitForSelector('#join-screen:not([hidden])');
      assert.equal(await cy.page.textContent('#join-status'), 'The host removed you from the game.');
      await cy.context.close();
    });

    test('closing the tab and opening the link again rejoins as the same player, straight into the lab', async () => {
      await ana.page.close();
      await nextAbout(MESSAGE_TYPES.PLAYER_DISCONNECTED, ana.playerId);
      assert.equal((await readJoinChip(ana.playerId)).away, true);
      await saveScreenshot(hostPage, `${name}-m4-5-host-waiting`);

      ana.page = await openPlayer(ana.context);
      await ana.page.waitForSelector('#pad-screen', { state: 'visible' });
      await nextAbout(MESSAGE_TYPES.PLAYER_RECONNECTED, ana.playerId);
      const saved = await ana.page.evaluate(() => JSON.parse(localStorage.getItem('pocket-party:session')));
      assert.equal(saved.playerId, ana.playerId);
      assert.equal(saved.roomCode, roomCode);
    });

    test('on coming back, a socket that no longer answers is noticed by the ping, and the phone rejoins', async () => {
      await ana.page.close();
      ana.page = await ana.context.newPage();
      const sockets = await routeSockets(ana.page);
      await ana.page.goto(`${server.baseUrl}/?room=${roomCode}`);
      await ana.page.waitForSelector('#pad-screen', { state: 'visible' });
      await nextAbout(MESSAGE_TYPES.PLAYER_RECONNECTED, ana.playerId);

      // The socket still reads open on the phone, but nothing gets through any more.
      sockets.routes[0].cut = true;
      await fireBackToVisible(ana.page);
      await nextAbout(MESSAGE_TYPES.PLAYER_RECONNECTED, ana.playerId);
      assert.equal(sockets.routes.length, 2);
      await ana.page.waitForSelector('#reconnect-overlay', { state: 'hidden' });
      assert.equal(await ana.page.isVisible('#pad-screen'), true);
    });

    test('with no server to reach it tries a few times, then offers "Tap to reconnect", which works', async () => {
      await ana.page.close();
      ana.page = await ana.context.newPage();
      const sockets = await routeSockets(ana.page);
      await ana.page.goto(`${server.baseUrl}/?room=${roomCode}`);
      await ana.page.waitForSelector('#pad-screen', { state: 'visible' });
      await nextAbout(MESSAGE_TYPES.PLAYER_RECONNECTED, ana.playerId);

      sockets.setBlocked(true);
      await sockets.routes[0].pageSide.close();
      await ana.page.waitForSelector('#reconnect-overlay:not([hidden])');
      assert.equal(await ana.page.textContent('#reconnect-text'), 'Reconnecting...');
      await ana.page.waitForSelector('#reconnect-button:not([hidden])', { timeout: 15000 });
      assert.equal(await ana.page.textContent('#reconnect-text'), 'Could not reconnect.');
      assert.equal(await ana.page.isVisible('#overlay-leave-button'), true);
      // The first socket plus three automatic attempts.
      assert.equal(sockets.routes.length, 4);
      await saveScreenshot(ana.page, `${name}-m4-6-controller-tap-to-reconnect`);

      sockets.setBlocked(false);
      await ana.page.click('#reconnect-button');
      await nextAbout(MESSAGE_TYPES.PLAYER_RECONNECTED, ana.playerId);
      await ana.page.waitForSelector('#reconnect-overlay', { state: 'hidden' });
      assert.equal(await ana.page.isVisible('#pad-screen'), true);
    });

    test('the host removes a player during the game; the lab is always open, so the phone can join again', async () => {
      await confirmClick(hostPage, cardRemoveButton(1));
      await nextAbout(MESSAGE_TYPES.PLAYER_LEFT, bo.playerId);
      await bo.page.waitForSelector('#join-screen:not([hidden])');
      assert.equal(await bo.page.textContent('#join-status'), 'The host removed you from the game.');

      // The code is still filled in, and the lab takes players at any time.
      await bo.page.click('#join-button');
      await bo.page.waitForSelector('#pad-screen', { state: 'visible' });
      await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
      await saveScreenshot(hostPage, `${name}-m4-7-host-after-remove`);
    });

    test('the back arrow sends every phone to "The game ended", with the old code cleared', async () => {
      await goBackToPicker(hostPage);
      await ana.page.waitForSelector('#ended-screen:not([hidden])');
      assert.equal(await ana.page.textContent('#ended-text'), 'The game ended');
      assert.equal(await ana.page.inputValue('#room-code'), '');
      assert.equal(new URL(ana.page.url()).searchParams.has('room'), false);
      assert.equal(await hostPage.isVisible('#game-picker'), true);
      await saveScreenshot(hostPage, `${name}-m4-8-host-picker-after-back`);
    });
  });
}

// The grace timer runs on the host, so one device is enough; it takes the default 30 s grace period.
describe('M4 grace period', () => {
  let server;
  let browser;
  let hostPage;
  let hostMessages;
  let roomCode;

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    hostPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    hostMessages = watchServerMessages(hostPage);
    await openHost(hostPage, server.baseUrl);
    roomCode = await startGame(hostPage, { gameId: 'input-lab' });
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('a player who stays away past the grace period loses the slot and is told on return', async () => {
    const context = await browser.newContext(devices['Pixel 7']);
    const page = await context.newPage();
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.click('#join-button');
    await page.waitForSelector('#pad-screen', { state: 'visible' });
    const { playerId } = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    await page.close();
    assert.equal((await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_DISCONNECTED)).playerId, playerId);
    assert.equal((await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_LEFT, 40000)).playerId, playerId);

    const back = await context.newPage();
    await back.goto(`${server.baseUrl}/?room=${roomCode}`);
    await waitUntil(async () => /away too long/.test(await back.textContent('#join-status')), {
      message: 'the phone to say its place was given up',
    });
    assert.equal(await back.isVisible('#join-screen'), true);
    assert.equal(await back.evaluate(() => localStorage.getItem('pocket-party:session')), null);
    await saveScreenshot(back, 'android-m4-9-controller-slot-gone');
    await context.close();
  });

  test('Leave on the reconnect screen works at once (two taps), and the server is told once the network is back', async () => {
    const context = await browser.newContext(devices['Pixel 7']);
    const page = await context.newPage();
    const sockets = await routeSockets(page);
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.click('#join-button');
    await page.waitForSelector('#pad-screen', { state: 'visible' });
    const { playerId } = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    sockets.setBlocked(true);
    await sockets.routes[0].pageSide.close();
    await page.waitForSelector('#overlay-leave-button:not([hidden])', { timeout: 15000 });
    // The first tap turns the button red, the second leaves.
    await page.click('#overlay-leave-button');
    assert.match(await page.getAttribute('#overlay-leave-button', 'class'), /\barmed\b/);
    await page.click('#overlay-leave-button');
    // The phone does not wait for the network.
    await page.waitForSelector('#join-screen:not([hidden])');
    assert.equal(await page.textContent('#join-status'), 'You left the game.');

    // Wi-Fi comes back: a retry delivers the LEAVE, well before the 30 s grace period would have freed the slot.
    await page.waitForTimeout(2500);
    sockets.setBlocked(false);
    assert.equal((await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_LEFT, 10000)).playerId, playerId);
    await context.close();
  });
});
