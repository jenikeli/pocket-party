// End-to-end Saltline phone input and split-screen rendering through the real room server.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, openHost, waitUntil, watchServerMessages } from '../helpers/browser.js';
import { clickNow, closeJoinWindow, startGame } from '../helpers/host-buttons.js';
import { openTouchscreen } from '../helpers/touch.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

describe('Saltline multiplayer controls', () => {
  let server;
  let browser;
  let hostPage;
  let hostMessages;
  let roomCode;

  async function joinPhone(name) {
    const context = await browser.newContext(devices['Pixel 7']);
    const page = await context.newPage();
    const messages = watchServerMessages(page);
    const sentInputs = [];
    page.on('websocket', (socket) => socket.on('framesent', ({ payload }) => {
      const message = JSON.parse(payload);
      if (message.type === MESSAGE_TYPES.INPUT) sentInputs.push(message.input);
    }));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(`${server.baseUrl}/?room=${roomCode}`);
    await page.fill('#player-name', name);
    await page.click('#join-button');
    try {
      await hostPage.waitForFunction(
        (playerName) => document.querySelector('#fps-teams')?.textContent.includes(playerName),
        name,
        { timeout: 5000 },
      );
    } catch (error) {
      throw new Error(
        `Host did not receive player_joined: ${error.message}\n` +
        `Room: ${roomCode}\nHost players: ${await hostPage.locator('#join-players').textContent()}\n` +
        `Server log:\n${server.output()}`,
      );
    }
    try {
      await messages.nextOfType(MESSAGE_TYPES.CONTROLLER_STATE, 5000);
    } catch (error) {
      throw new Error(
        `Controller did not receive state: ${error.message}\n` +
        `Host players: ${await hostPage.locator('#join-players').innerText().catch(() => '(not visible)')}`,
      );
    }
    try {
      await page.waitForSelector('.fps-phone-setup', { timeout: 10000 });
    } catch (error) {
      const received = await messages.collectFor(1000);
      throw new Error(
        `${error.message}\nController page: ${await page.locator('body').innerText()}\n` +
        `Messages: ${JSON.stringify(received)}\n${errors.join('\n')}`,
      );
    }
    assert.equal(await page.locator('[data-primary]').count(), 0);
    assert.match(await page.locator('.fps-setup-intro').textContent(), /PAC-9 Longshore/);
    return { context, page, sentInputs, errors };
  }

  async function hostViewState(page = hostPage) {
    return page.evaluate(() => {
      const frames = [...document.querySelectorAll('#game-container iframe')];
      return frames.map((iframe) => {
        const game = iframe.contentWindow?.__G;
        const actors = game?.scene?.children
          .filter((object) => object.name.startsWith('multiplayer-'))
          .map((object) => object.name) ?? [];
        return {
          hasBridge: typeof iframe.contentWindow?.__POCKET_PARTY__?.renderFrame === 'function',
          yaw: game?.camera?.rotation.y,
          pitch: game?.camera?.rotation.x,
          position: game?.camera?.position.toArray(),
          actors: actors.length,
          bots: actors.filter((name) => name.startsWith('multiplayer-bot')).length,
        };
      });
    });
  }

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    hostPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    hostMessages = watchServerMessages(hostPage);
    await openHost(hostPage, server.baseUrl);
    roomCode = await startGame(hostPage, { gameId: 'fps', keepJoinWindow: true });
    const { addresses } = await (await fetch(`${server.baseUrl}/server/lan-addresses.json`)).json();
    if (addresses.length > 0) {
      const expectedOrigin = `${new URL(server.baseUrl).protocol}//${addresses[0].address}:${server.port}`;
      await hostPage.waitForFunction((origin) => document.querySelector('#join-url')?.textContent === origin, expectedOrigin);
      assert.equal(await hostPage.textContent('#join-url'), expectedOrigin);
    }
    await closeJoinWindow(hostPage);
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('a phone controls the host match and its original Saltline renderer shows other players', { timeout: 90000 }, async () => {
    await hostPage.waitForFunction(() => document.querySelector('#fps-status')?.textContent.includes('No phones joined'));
    assert.match(await hostPage.textContent('#fps-status'), /No phones joined/);
    assert.equal(await hostPage.textContent('#fps-assets'), 'Saltline Terminal · PAC-9 Longshore');
    assert.equal(await hostPage.locator('[data-map]').count(), 0);
    assert.equal(await hostPage.isDisabled('#fps-start'), true);
    assert.equal(await hostPage.isEnabled('#fps-watch'), true);
    await clickNow(hostPage, '[data-mode="relay"]');
    await hostPage.waitForFunction(() => document.querySelector('#fps-status')?.textContent.includes('needs at least one phone'));
    assert.equal(await hostPage.isDisabled('#fps-watch'), true);
    await clickNow(hostPage, '[data-mode="tdm"]');
    await hostPage.waitForFunction(() => document.querySelector('#fps-status')?.textContent.includes('No phones joined'));
    assert.equal(await hostPage.isEnabled('#fps-watch'), true);
    const first = await joinPhone('First');
    const second = await joinPhone('Second');
    await hostPage.waitForFunction(() => document.querySelector('#fps-watch')?.disabled);
    assert.equal(await hostPage.isDisabled('#fps-watch'), true);
    await first.page.waitForFunction(() => document.querySelector('[data-team="0"]')?.getAttribute('aria-pressed') === 'true');
    await second.page.waitForFunction(() => document.querySelector('[data-team="1"]')?.getAttribute('aria-pressed') === 'true');
    assert.match(await hostPage.locator('#fps-teams [data-team="0"]').textContent(), /First/);
    assert.match(await hostPage.locator('#fps-teams [data-team="1"]').textContent(), /Second/);
    await first.page.click('.fps-ready');
    await second.page.click('.fps-ready');

    try {
      await hostPage.waitForFunction(() => {
        const button = document.querySelector('#fps-start');
        return button && !button.disabled;
      }, null, { timeout: 15000 });
    } catch (error) {
      throw new Error(
        `${error.message}\nHost setup: ${await hostPage.locator('#fps-setup').innerText().catch(() => '(not visible)')}`,
      );
    }
    await clickNow(hostPage, '#fps-start');
    await first.page.waitForSelector('.fps-phone-play', { timeout: 15000 });
    await second.page.waitForSelector('.fps-phone-play', { timeout: 15000 });
    assert.equal(await first.page.locator('[data-action="swap"]').count(), 0);
    assert.equal(await first.page.textContent('#fps-weapon'), 'PAC-9 LONGSHORE');

    const views = await waitUntil(async () => {
      const current = await hostViewState();
      return current.length === 2 && current.every((view) => view.hasBridge && view.bots >= 1)
        ? current
        : null;
    }, { timeoutMs: 45000, message: 'two original Saltline split-screen renderers with CPU characters' });
    assert.equal(views.length, 2);

    const beforeCamera = views[0];
    const touch = await openTouchscreen(first.page);
    const look = await first.page.locator('#fps-look').boundingBox();
    const x = look.x + look.width / 2;
    const y = look.y + look.height / 2;
    await touch.press(1, x, y);
    await touch.move(1, x, y + 90);
    await first.page.waitForTimeout(100);
    await touch.release(1);
    await waitUntil(async () => first.sentInputs.some((input) => input.kind === 'look'), {
      timeoutMs: 3000,
      message: 'the phone to send aim input',
    });
    await waitUntil(async () => {
      const current = await hostViewState();
      return current[0]
        && (Math.abs(current[0].yaw - beforeCamera.yaw) > 0.01
          || Math.abs(current[0].pitch - beforeCamera.pitch) > 0.01);
    }, { timeoutMs: 5000, message: 'phone aim input to change the host-rendered player camera' });

    await first.page.waitForTimeout(3500);
    const beforePosition = (await hostViewState())[0].position;
    const move = await first.page.locator('#fps-move').boundingBox();
    const moveX = move.x + move.width / 2;
    const moveY = move.y + move.height / 2;
    await touch.press(2, moveX, moveY);
    await touch.move(2, moveX + 55, moveY - 55);
    await first.page.waitForTimeout(1200);
    await touch.release(2);
    await waitUntil(async () => first.sentInputs.some((input) => input.kind === 'move' && Math.hypot(input.x, input.y) > 0.2), {
      timeoutMs: 3000,
      message: 'the phone to send movement input',
    });
    try {
      await waitUntil(async () => {
        const current = await hostViewState();
        return current[0] && Math.hypot(current[0].position[0] - beforePosition[0], current[0].position[2] - beforePosition[2]) > 0.1;
      }, { timeoutMs: 10000, message: 'phone movement input to move its host-rendered character' });
    } catch (error) {
      throw new Error(
        `${error.message}\nBefore: ${JSON.stringify(beforePosition)}\n` +
        `After: ${JSON.stringify((await hostViewState())[0]?.position)}\n` +
        `Move inputs: ${JSON.stringify(first.sentInputs.filter((input) => input.kind === 'move'))}`,
      );
    }

    await closeJoinWindow(hostPage);
    assert.deepEqual(first.errors, []);
    assert.deepEqual(second.errors, []);
    await first.context.close();
    await second.context.close();
  });

  test('Watch bots play starts a CPU-only match in the original Saltline renderer', async () => {
    await hostPage.close();
    hostPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    hostMessages = watchServerMessages(hostPage);
    await openHost(hostPage, server.baseUrl);
    await startGame(hostPage, { gameId: 'fps', keepJoinWindow: true });
    await closeJoinWindow(hostPage);

    await hostPage.waitForFunction(() => document.querySelector('#fps-status')?.textContent.includes('No phones joined'));
    assert.equal(await hostPage.isEnabled('#fps-watch'), true);
    await clickNow(hostPage, '#fps-watch');

    await hostPage.waitForFunction(() => document.querySelector('#fps-setup')?.hidden);
    const views = await waitUntil(async () => {
      const current = await hostViewState();
      return current[0]?.hasBridge && current[0].bots > 0 ? current : null;
    }, { timeoutMs: 45000, message: 'the original Saltline renderer to show CPU characters' });
    assert.ok(views[0].bots > 0);
  });
});
