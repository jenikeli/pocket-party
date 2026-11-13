// Browser tests for M2: the controller page is a secure context only over HTTPS, and host and controller
// connect over wss. Pages load from this machine's LAN IP, not 127.0.0.1, because browsers treat 127.0.0.1
// as secure even over plain HTTP. Real phones and real cert warnings still need a manual check.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, openHost, saveScreenshot } from '../helpers/browser.js';
import { startGame } from '../helpers/host-buttons.js';
import { makeTempCert } from '../helpers/temp-cert.js';
import { listLanAddresses } from '../../server/addresses.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const CONTROLLER_DEVICES = [
  { name: 'android', engine: 'chromium', device: devices['Pixel 7'] },
  { name: 'iphone', engine: 'webkit', device: devices['iPhone 13'] },
];

const lanAddress = listLanAddresses()[0]?.address;
const NO_LAN = lanAddress ? false : 'this machine has no LAN address';

// The controller's join screen lists what the browser offers, as label -> value.
async function readDeviceInfo(page) {
  const labels = await page.locator('#device-info dt').allTextContents();
  const values = await page.locator('#device-info dd').allTextContents();
  return Object.fromEntries(labels.map((label, index) => [label, values[index]]));
}

// Resolves with the URL of the first WebSocket the page opens. Call before page.goto (the host's opens when a
// game's Play is clicked).
function firstSocketUrl(page) {
  return new Promise((resolve) => page.once('websocket', (socket) => resolve(socket.url())));
}

for (const { name, engine, device } of CONTROLLER_DEVICES) {
  describe(`M2 HTTPS with an ${name} controller`, { skip: NO_LAN }, () => {
    let cert;
    let plainServer;
    let secureServer;
    let hostBrowser;
    let controllerBrowser;
    let controllerContext;

    before(async () => {
      cert = makeTempCert([lanAddress, '127.0.0.1']);
      plainServer = await startServer();
      secureServer = await startServer({ env: { CERT_PATH: cert.certPath, KEY_PATH: cert.keyPath } });
      hostBrowser = await launchBrowser('chromium');
      controllerBrowser = engine === 'chromium' ? hostBrowser : await launchBrowser(engine);
      // Stands in for the player tapping through the certificate warning.
      controllerContext = await controllerBrowser.newContext({ ...device, ignoreHTTPSErrors: true });
    });

    after(async () => {
      await hostBrowser?.close();
      await controllerBrowser?.close();
      await plainServer?.stop();
      await secureServer?.stop();
      cert?.remove();
    });

    test('over plain HTTP on the LAN IP, the controller is not a secure context and has no tilt or Wake Lock', async () => {
      const page = await controllerContext.newPage();
      await page.goto(`http://${lanAddress}:${plainServer.port}/`);
      const info = await readDeviceInfo(page);
      assert.equal(info['Secure context'], 'false');
      assert.equal(info['Tilt API'], 'missing');
      assert.equal(info['Wake Lock API'], 'missing');
      await saveScreenshot(page, `${name}-https-1-plain-http`);
      await page.close();
    });

    test('over HTTPS on the LAN IP, host and controller connect over wss and the controller is secure', async () => {
      const origin = `https://${lanAddress}:${secureServer.port}`;
      const hostPage = await hostBrowser.newPage({ viewport: { width: 1920, height: 1080 }, ignoreHTTPSErrors: true });
      const hostMessages = watchServerMessages(hostPage);
      const hostSocketUrl = firstSocketUrl(hostPage);
      // The host's socket opens at Play, which makes the input lab's room.
      await openHost(hostPage, origin);
      const roomCode = await startGame(hostPage, { gameId: 'input-lab' });
      assert.match(await hostSocketUrl, /^wss:\/\//);

      const page = await controllerContext.newPage();
      const controllerSocketUrl = firstSocketUrl(page);
      await page.goto(`${origin}/?room=${roomCode}`);
      const info = await readDeviceInfo(page);
      assert.equal(info['Secure context'], 'true');
      assert.equal(info['Tilt API'], 'present');
      assert.equal(info['Wake Lock API'], 'present');
      await saveScreenshot(page, `${name}-https-2-secure-join-screen`);

      await page.click('#join-button');
      await page.waitForSelector('#game-screen:not([hidden])');
      assert.match(await controllerSocketUrl, /^wss:\/\//);
      await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
      await page.close();
      await hostPage.close();
    });
  });
}
