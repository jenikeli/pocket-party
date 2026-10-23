// Browser tests for M4, the lobby and reconnection: the real host page (desktop Chromium) and real controller
// pages on an emulated Android phone (Chromium) and iPhone (WebKit). Dead and unreachable sockets are faked by
// routing the controller's WebSocket through Playwright (page.routeWebSocket), which can stop passing frames.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader, findColor } from '../helpers/screenshot-pixels.js';
import {
  START_BUTTON,
  CLOSE_ROOM_BUTTON,
  GAME_CLOSE_ROOM_BUTTON,
  lobbyRemoveButton,
  cardRemoveButton,
  startGame,
  confirmClick,
} from '../helpers/host-buttons.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const CONTROLLER_DEVICES = [
  { name: 'android', engine: 'chromium', device: devices['Pixel 7'] },
  { name: 'iphone', engine: 'webkit', device: devices['iPhone 13'] },
];

// From host/lobby-player-list.js and host/settings-panel.js, at 1:1 scale (1920x1080 viewport).
const LIST_DOT_X = 110;
const LIST_FIRST_ROW_Y = 230;
const LIST_ROW_HEIGHT = 72;
const MAX_PLAYERS_MINUS = { x: 700, y: 900 };
const FIRST_COLOR = 0xe74c3c;
const SECOND_COLOR = 0x3498db;

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
  describe(`M4 lobby and reconnection with ${name} controllers`, () => {
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
      await page.waitForSelector('#lobby-screen:not([hidden])');
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

    // A dot of `color` in the lobby list's row `index`.
    async function listDot(index, color) {
      const y = LIST_FIRST_ROW_Y + index * LIST_ROW_HEIGHT;
      const area = { left: LIST_DOT_X - 30, top: y - 30, right: LIST_DOT_X + 30, bottom: y + 30 };
      const dot = await findColor(pixelReader, await hostPage.screenshot(), color, area);
      return dot.count > 0;
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
      await hostPage.goto(`${server.baseUrl}/host`);
      roomCode = (await hostMessages.nextOfType(MESSAGE_TYPES.ROOM_CREATED, 10000)).roomCode;
    });

    after(async () => {
      await hostBrowser?.close();
      await controllerBrowser?.close();
      await server?.stop();
    });

    test('players join with a name; each phone says who it is and the host lists them in their colors', async () => {
      ana = await joinAs('Ana');
      bo = await joinAs('Bo');
      // The first state names them "Player N"; the host's next one uses the name the phone sent after joining.
      for (const [player, playerName] of [[ana, 'Ana'], [bo, 'Bo']]) {
        await waitUntil(async () => (await player.page.textContent('#player-label')) === `Connected as ${playerName}`, {
          message: `${playerName}'s phone to show the name from the host`,
        });
      }
      const swatch = await ana.page.$eval('#player-swatch', (element) => getComputedStyle(element).backgroundColor);
      assert.equal(swatch, 'rgb(231, 76, 60)');
      assert.equal(await ana.page.textContent('#lobby-room'), `Room ${roomCode}`);

      await waitUntil(async () => (await listDot(0, FIRST_COLOR)) && (await listDot(1, SECOND_COLOR)), {
        message: 'both players in the host\'s list',
      });
      await saveScreenshot(ana.page, `${name}-m4-1-controller-lobby`);
      await saveScreenshot(hostPage, `${name}-m4-1-host-lobby`);
    });

    test('a code typed by hand goes into the address bar, and Leave frees the slot without reconnecting', async () => {
      const context = await controllerBrowser.newContext(device);
      const page = await context.newPage();
      await page.goto(`${server.baseUrl}/`);
      await page.fill('#room-code', roomCode.toLowerCase());
      await page.click('#join-button');
      await page.waitForSelector('#lobby-screen:not([hidden])');
      const { playerId } = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
      assert.equal(new URL(page.url()).searchParams.get('room'), roomCode);

      page.once('dialog', (dialog) => dialog.accept());
      await page.click('#lobby-screen .leave-button');
      await page.waitForSelector('#join-screen:not([hidden])');
      assert.equal(await page.textContent('#join-status'), 'You left the game.');
      // Straight to PLAYER_LEFT: no disconnect, no grace period.
      assert.deepEqual(await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_LEFT), { type: MESSAGE_TYPES.PLAYER_LEFT, playerId });
      assert.equal(await page.evaluate(() => localStorage.getItem('pocket-party:session')), null);
      // It stays on the join screen: no rejoin attempt, so no second socket.
      await page.waitForTimeout(500);
      assert.equal(await page.isVisible('#reconnect-overlay'), false);
      await context.close();
    });

    test('the host removes a player from the lobby with two clicks, and the phone is told', async () => {
      const cy = await joinAs('Cy');
      // A single click only arms the button.
      await hostPage.mouse.click(lobbyRemoveButton(2).x, lobbyRemoveButton(2).y);
      await hostPage.waitForTimeout(300);
      assert.equal(await cy.page.isVisible('#lobby-screen'), true);
      await saveScreenshot(hostPage, `${name}-m4-2-host-remove-armed`);
      await hostPage.mouse.click(lobbyRemoveButton(2).x, lobbyRemoveButton(2).y);

      await nextAbout(MESSAGE_TYPES.PLAYER_LEFT, cy.playerId);
      await cy.page.waitForSelector('#join-screen:not([hidden])');
      assert.equal(await cy.page.textContent('#join-status'), 'The host removed you from the game.');
      await cy.context.close();
    });

    test('the host\'s max players setting refuses joins beyond it', async () => {
      // 6 -> 2. It cannot go lower, because two players are in.
      for (let i = 0; i < 5; i += 1) {
        await hostPage.mouse.click(MAX_PLAYERS_MINUS.x, MAX_PLAYERS_MINUS.y);
      }
      // Phaser handles clicks on its next frame, so wait until the server has the new limit.
      await waitUntil(() => server.output().includes(`Room ${roomCode} now takes up to 2 players`), {
        message: 'the server to get the player limit',
      });
      const context = await controllerBrowser.newContext(device);
      const page = await openPlayer(context);
      await page.click('#join-button');
      await page.waitForFunction(() => document.getElementById('join-status').textContent !== 'Joining...');
      assert.equal(await page.textContent('#join-status'), 'That room is full.');
      await saveScreenshot(hostPage, `${name}-m4-2-host-settings`);
      await context.close();
    });

    test('ready goes through the host, and the host starts the game only once everyone is ready', async () => {
      await ana.page.click('#ready-button');
      await ana.page.waitForSelector('#ready-button[aria-pressed="true"]');
      assert.equal(await ana.page.textContent('#ready-button'), 'Not ready');
      await ana.page.click('#ready-button');
      await ana.page.waitForSelector('#ready-button[aria-pressed="false"]');

      // With Bo not ready, Start does nothing.
      await ana.page.click('#ready-button');
      await ana.page.waitForSelector('#ready-button[aria-pressed="true"]');
      await hostPage.mouse.click(START_BUTTON.x, START_BUTTON.y);
      await ana.page.waitForTimeout(500);
      assert.equal(await ana.page.isVisible('#lobby-screen'), true);

      await bo.page.click('#ready-button');
      await bo.page.waitForSelector('#ready-button[aria-pressed="true"]');
      await saveScreenshot(hostPage, `${name}-m4-3-host-all-ready`);
      await startGame(hostPage, ana.page);
      await bo.page.waitForSelector('#pad-screen:not([hidden])');
      assert.equal(await ana.page.textContent('#pad-status'), `In room ${roomCode}`);
      await saveScreenshot(hostPage, `${name}-m4-3-host-lab`);
    });

    test('while the game runs, a new player is refused', async () => {
      const context = await controllerBrowser.newContext(device);
      const page = await openPlayer(context);
      await page.click('#join-button');
      await page.waitForFunction(() => document.getElementById('join-status').textContent !== 'Joining...');
      assert.match(await page.textContent('#join-status'), /already started/);
      await context.close();
    });

    test('closing the tab and opening the link again rejoins as the same player, straight into the lab', async () => {
      await ana.page.close();
      await nextAbout(MESSAGE_TYPES.PLAYER_DISCONNECTED, ana.playerId);
      await saveScreenshot(hostPage, `${name}-m4-4-host-waiting`);

      ana.page = await openPlayer(ana.context);
      await ana.page.waitForSelector('#pad-screen:not([hidden])');
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
      await ana.page.waitForSelector('#pad-screen:not([hidden])');
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
      await ana.page.waitForSelector('#pad-screen:not([hidden])');
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
      await saveScreenshot(ana.page, `${name}-m4-5-controller-tap-to-reconnect`);

      sockets.setBlocked(false);
      await ana.page.click('#reconnect-button');
      await nextAbout(MESSAGE_TYPES.PLAYER_RECONNECTED, ana.playerId);
      await ana.page.waitForSelector('#reconnect-overlay', { state: 'hidden' });
      assert.equal(await ana.page.isVisible('#pad-screen'), true);
    });

    test('the host removes a player during the game; joining again is refused and stays on the join screen', async () => {
      await confirmClick(hostPage, cardRemoveButton(1));
      await nextAbout(MESSAGE_TYPES.PLAYER_LEFT, bo.playerId);
      await bo.page.waitForSelector('#join-screen:not([hidden])');
      assert.equal(await bo.page.textContent('#join-status'), 'The host removed you from the game.');

      // The code is still filled in, but the game has started, so Bo is refused.
      await bo.page.click('#join-button');
      await waitUntil(async () => (await bo.page.textContent('#join-status')) === 'That game has already started.', {
        message: 'the phone to say the game has started',
      });
      assert.equal(await bo.page.isVisible('#join-screen'), true);
      assert.equal(await bo.page.isVisible('#pad-screen'), false);
      await saveScreenshot(hostPage, `${name}-m4-6-host-after-remove`);
    });

    test('Close room during the game sends every phone back to the join screen, with the old code cleared', async () => {
      await confirmClick(hostPage, GAME_CLOSE_ROOM_BUTTON);
      await ana.page.waitForSelector('#join-screen:not([hidden])');
      assert.equal(await ana.page.textContent('#join-status'), 'The host left the game.');
      assert.equal(await ana.page.inputValue('#room-code'), '');
      assert.equal(new URL(ana.page.url()).searchParams.has('room'), false);
      await saveScreenshot(hostPage, `${name}-m4-7-host-room-closed`);
    });
  });
}

// The grace timer runs on the host, so one device is enough; it takes the default 30 s grace period. This also
// checks Close room from the lobby, which the tests above use during the game.
describe('M4 grace period and closing from the lobby', () => {
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
    await hostPage.goto(`${server.baseUrl}/host`);
    roomCode = (await hostMessages.nextOfType(MESSAGE_TYPES.ROOM_CREATED, 10000)).roomCode;
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  async function joinLobby(context) {
    const page = await context.newPage();
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.click('#join-button');
    await page.waitForSelector('#lobby-screen:not([hidden])');
    const { playerId } = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    return { page, playerId };
  }

  test('a player who stays away past the grace period loses the slot and is told on return', async () => {
    const context = await browser.newContext(devices['Pixel 7']);
    const { page, playerId } = await joinLobby(context);
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
    await saveScreenshot(back, 'android-m4-8-controller-slot-gone');
    await context.close();
  });

  test('Leave on the reconnect screen works at once, and the server is told once the network is back', async () => {
    const context = await browser.newContext(devices['Pixel 7']);
    const page = await context.newPage();
    const sockets = await routeSockets(page);
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.click('#join-button');
    await page.waitForSelector('#lobby-screen:not([hidden])');
    const { playerId } = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    sockets.setBlocked(true);
    await sockets.routes[0].pageSide.close();
    await page.waitForSelector('#overlay-leave-button:not([hidden])', { timeout: 15000 });
    page.once('dialog', (dialog) => dialog.accept());
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

  test('Close room in the lobby sends the phones back to the join screen', async () => {
    const { page } = await joinLobby(await browser.newContext(devices['Pixel 7']));
    await confirmClick(hostPage, CLOSE_ROOM_BUTTON);
    await page.waitForSelector('#join-screen:not([hidden])');
    assert.equal(await page.textContent('#join-status'), 'The host left the game.');
  });
});
