// End-to-end Breakwater match: phones join and control players in the project-built split-screen scene.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, openHost, waitUntil } from '../helpers/browser.js';
import { openPixelReader } from '../helpers/screenshot-pixels.js';
import { closeJoinWindow, clickNow, startGame } from '../helpers/host-buttons.js';
import { openTouchscreen } from '../helpers/touch.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

describe('Breakwater multiplayer controls', () => {
  let server;
  let browser;
  let pixelReader;
  let hostPage;
  let roomCode;
  const shooterPageRequests = [];
  const hostErrors = [];

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

  async function rendererState() {
    return hostPage.evaluate(() => {
      const canvas = document.querySelector('#game-container canvas.fps-renderer-canvas');
      const views = [...document.querySelectorAll('#game-container .fps-renderer-view')]
        .filter((element) => element.style.display !== 'none')
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            playerId: element.dataset.playerId,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            hasHud: Boolean(element.querySelector('canvas')),
          };
        });
      return {
        canvasCount: document.querySelectorAll('#game-container canvas.fps-renderer-canvas').length,
        canvasWidth: canvas?.width ?? 0,
        canvasHeight: canvas?.height ?? 0,
        iframeCount: document.querySelectorAll('#game-container iframe').length,
        views,
      };
    });
  }

  async function sampledColorCount(screenshot, view) {
    return pixelReader.evaluate(async ({ base64, view }) => {
      const { data, width } = await window.decodePng(base64);
      const colors = new Set();
      const left = Math.round(view.left + view.width * 0.2);
      const right = Math.round(view.left + view.width * 0.8);
      const top = Math.round(view.top + view.height * 0.2);
      const bottom = Math.round(view.top + view.height * 0.8);
      for (let y = top; y < bottom; y += 8) {
        for (let x = left; x < right; x += 8) {
          const offset = (y * width + x) * 4;
          const red = data[offset];
          const green = data[offset + 1];
          const blue = data[offset + 2];
          if (red > 8 || green > 8 || blue > 8) colors.add(`${red},${green},${blue}`);
        }
      }
      return colors.size;
    }, { base64: screenshot.toString('base64'), view });
  }

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    pixelReader = await openPixelReader(browser);
    hostPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    hostPage.on('request', (request) => {
      if (request.url().includes('/saltline-fable-5.2/')) shooterPageRequests.push(request.url());
    });
    hostPage.on('pageerror', (error) => hostErrors.push(error.message));
    await openHost(hostPage, server.baseUrl);
    roomCode = await startGame(hostPage, { gameId: 'fps', keepJoinWindow: true });
    await closeJoinWindow(hostPage);
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('two phones play in separate original views without loading the archived page', { timeout: 90000 }, async () => {
    assert.equal(await hostPage.locator('#fps-start').count(), 1);
    assert.equal(await hostPage.locator('.fps-renderer-canvas').count(), 1);
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

    const state = await waitUntil(async () => {
      const current = await rendererState();
      return current.canvasCount === 1 && current.canvasWidth > 0 && current.canvasHeight > 0
        && current.iframeCount === 0 && current.views.length === 2
        && current.views.every((view) => view.playerId && view.hasHud)
        ? current
        : null;
    }, { timeoutMs: 20000, message: 'two rendered player views on the custom scene' });
    assert.ok(state.views[0].left < state.views[1].left, 'the two viewports occupy separate screen regions');
    assert.ok(state.views.every((view) => view.width > 0 && view.height > 0));
    assert.deepEqual(shooterPageRequests, [], 'the standalone shooter page is never requested');

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
    await touch.press(2, move.x + move.width / 2, move.y + move.height / 2);
    await touch.move(2, move.x + move.width / 2 + 50, move.y + move.height / 2 - 50);
    await waitUntil(async () => first.sentInputs.some((input) => input.kind === 'move' && Math.hypot(input.x, input.y) > 0.2), {
      timeoutMs: 3000,
      message: 'the first phone to send movement input',
    });
    await touch.release(2);

    const fire = await first.page.locator('[data-action="fire"]').boundingBox();
    await touch.press(3, fire.x + fire.width / 2, fire.y + fire.height / 2);
    await first.page.waitForTimeout(100);
    await touch.release(3);
    await waitUntil(async () => first.sentInputs.some((input) => input.button === 'fire' && input.pressed), {
      timeoutMs: 3000,
      message: 'the first phone to send fire input',
    });
    const screenshot = await hostPage.screenshot();
    const renderedColors = await Promise.all(state.views.map((view) => sampledColorCount(screenshot, view)));
    assert.ok(renderedColors.every((count) => count > 20), `both views should render the scene, got ${renderedColors}`);
    assert.deepEqual(first.errors, []);
    assert.deepEqual(second.errors, []);
    assert.deepEqual(hostErrors, []);
    await first.context.close();
    await second.context.close();
  });
});
