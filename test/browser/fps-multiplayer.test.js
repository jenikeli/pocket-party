// End-to-end Saltline match: phones join, ready, move and aim, while the host renders the shared original map.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, openHost, waitUntil } from '../helpers/browser.js';
import { closeJoinWindow, clickNow, startGame } from '../helpers/host-buttons.js';
import { openTouchscreen } from '../helpers/touch.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

describe('Saltline multiplayer controls', () => {
  let server;
  let browser;
  let hostPage;
  let roomCode;

  async function joinPhone(name) {
    const context = await browser.newContext(devices['Pixel 7']);
    const page = await context.newPage();
    const sentInputs = [];
    page.on('websocket', (socket) => socket.on('framesent', ({ payload }) => {
      const message = JSON.parse(payload);
      if (message.type === MESSAGE_TYPES.INPUT) sentInputs.push(message.input);
    }));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.fill('#player-name', name);
    await page.click('#join-button');
    await hostPage.waitForFunction(
      (playerName) => document.querySelector('#fps-teams')?.textContent.includes(playerName),
      name,
      { timeout: 10000 },
    );
    await page.waitForSelector('.fps-phone-setup', { timeout: 10000 });
    return { context, page, sentInputs, errors };
  }

  async function hostViews() {
    return hostPage.evaluate(() => [...document.querySelectorAll('#game-container iframe')].map((iframe) => {
      const win = iframe.contentWindow;
      const game = win?.__G;
      const actors = game?.scene?.children
        .filter((object) => object.name.startsWith('multiplayer-'))
        .map((object) => object.name) ?? [];
      return {
        hasBridge: typeof win?.__POCKET_PARTY__?.renderFrame === 'function',
        playerInputDisabledForPhoneControl: game?.player?.enabled === false,
        actors,
        camera: game?.camera?.position.toArray(),
        drawCalls: game?.renderer?.info?.render?.calls ?? 0,
      };
    }));
  }

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    hostPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await openHost(hostPage, server.baseUrl);
    roomCode = await startGame(hostPage, { gameId: 'fps', keepJoinWindow: true });
    await closeJoinWindow(hostPage);
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('two phones enter a shared Saltline match and control their split-screen views', { timeout: 90000 }, async () => {
    assert.equal(await hostPage.locator('#fps-start').count(), 1);
    const first = await joinPhone('First');
    const second = await joinPhone('Second');
    await first.page.waitForFunction(() => document.querySelector('[data-team="0"]')?.getAttribute('aria-pressed') === 'true');
    await second.page.waitForFunction(() => document.querySelector('[data-team="1"]')?.getAttribute('aria-pressed') === 'true');
    await first.page.click('.fps-ready');
    await second.page.click('.fps-ready');
    await hostPage.waitForFunction(() => {
      const button = document.querySelector('#fps-start');
      return button && !button.disabled;
    }, null, { timeout: 15000 });
    await clickNow(hostPage, '#fps-start');
    await first.page.waitForSelector('.fps-phone-play', { timeout: 15000 });
    await second.page.waitForSelector('.fps-phone-play', { timeout: 15000 });

    let views;
    try {
      views = await waitUntil(async () => {
        const current = await hostViews();
        return current.length === 2 && current.every((view) => view.hasBridge && view.actors.length >= 2)
          ? current
          : null;
      }, { timeoutMs: 45000, message: 'two original Saltline views with networked player avatars' });
    } catch (error) {
      const state = await hostPage.evaluate(() => ({
        viewCount: document.querySelectorAll('#game-container iframe').length,
        error: [...document.querySelectorAll('#game-container > div')].map((element) => element.textContent).filter(Boolean),
        frameStates: [...document.querySelectorAll('#game-container iframe')].map((iframe) => ({
          src: iframe.src,
          errors: iframe.contentWindow?.__errors,
          ready: iframe.contentWindow?.__ready,
          game: Boolean(iframe.contentWindow?.__G?.render),
        })),
      }));
      throw new Error(`${error.message}\nRenderer state: ${JSON.stringify(state)}`);
    }
    assert.ok(views.every((view) => view.playerInputDisabledForPhoneControl));
    assert.ok(views.every((view) => view.drawCalls > 0), 'the original Saltline scene renders in both views');
    assert.notDeepEqual(views[0].camera, views[1].camera);

    const touch = await openTouchscreen(first.page);
    const look = await first.page.locator('#fps-look').boundingBox();
    await touch.press(1, look.x + look.width / 2, look.y + look.height / 2);
    await touch.move(1, look.x + look.width / 2, look.y + look.height / 2 + 70);
    await touch.release(1);
    await waitUntil(async () => first.sentInputs.some((input) => input.kind === 'look'), {
      timeoutMs: 3000,
      message: 'the first phone to send aim input',
    });

    const move = await first.page.locator('#fps-move').boundingBox();
    const beforeMove = views[0].camera;
    await touch.press(2, move.x + move.width / 2, move.y + move.height / 2);
    await touch.move(2, move.x + move.width / 2 + 50, move.y + move.height / 2 - 50);
    await waitUntil(async () => first.sentInputs.some((input) => input.kind === 'move' && Math.hypot(input.x, input.y) > 0.2), {
      timeoutMs: 3000,
      message: 'the first phone to send movement input',
    });
    await waitUntil(async () => {
      const current = await hostViews();
      return current[0]?.camera
        && Math.hypot(current[0].camera[0] - beforeMove[0], current[0].camera[2] - beforeMove[2]) > 0.1
        ? true
        : null;
    }, { timeoutMs: 5000, message: 'phone movement to change its shared-map view' });
    await touch.release(2);

    const fire = await first.page.locator('[data-action="fire"]').boundingBox();
    await touch.press(3, fire.x + fire.width / 2, fire.y + fire.height / 2);
    await first.page.waitForTimeout(100);
    await touch.release(3);
    await waitUntil(async () => first.sentInputs.some((input) => input.button === 'fire' && input.pressed), {
      timeoutMs: 3000,
      message: 'the first phone to send fire input',
    });
    assert.deepEqual(first.errors, []);
    assert.deepEqual(second.errors, []);
    await first.context.close();
    await second.context.close();
  });
});
