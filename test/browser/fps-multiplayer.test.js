// End-to-end check that Saltline opens as the original standalone host game, with mouse and keyboard input enabled.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, openHost, waitUntil } from '../helpers/browser.js';
import { startGame } from '../helpers/host-buttons.js';

describe('Saltline direct host game', () => {
  let server;
  let browser;
  let hostPage;

  before(async () => {
    server = await startServer();
    browser = await launchBrowser('chromium');
    hostPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await openHost(hostPage, server.baseUrl);
    await startGame(hostPage, { gameId: 'fps', keepJoinWindow: false });
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('opens the original playable game without a setup or split-screen gate', { timeout: 90000 }, async () => {
    await waitUntil(async () => hostPage.evaluate(() => {
      const iframe = document.querySelector('#game-container iframe');
      const game = iframe?.contentWindow?.__G;
      const style = iframe ? getComputedStyle(iframe) : null;
      return iframe
        && game?.render
        && game?.player
        && game.player.enabled === true
        && style?.pointerEvents === 'auto'
        ? true
        : null;
    }), { timeoutMs: 45000, message: 'the original Saltline player controls to be enabled' });

    assert.equal(await hostPage.locator('#fps-setup').count(), 0);
    assert.equal(await hostPage.locator('#game-container iframe').count(), 1);
  });
});
