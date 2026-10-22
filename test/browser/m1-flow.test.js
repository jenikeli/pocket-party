// Browser tests for M1 end to end: the real host page (desktop Chromium) and the real controller page on an
// emulated Android phone (Chromium) and iPhone (WebKit, Safari's engine). Screenshots go to test-results/screenshots/.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader, findColor, readDarkPoints } from '../helpers/screenshot-pixels.js';
import { qrcode } from '../../host/vendor/qrcode-generator-2.0.4.mjs';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const CONTROLLER_DEVICES = [
  { name: 'android', engine: 'chromium', device: devices['Pixel 7'] },
  { name: 'iphone', engine: 'webkit', device: devices['iPhone 13'] },
];

// Layout from host/scenes/squares-scene.js and host/qr-code.js, at 1:1 scale (1920x1080 viewport).
const PLAY_AREA = { left: 0, top: 0, right: 1380, bottom: 1080 };
const QR_CENTER = { x: 1650, y: 390 };
const QR_SIZE_PX = 420;
const QR_QUIET_ZONE_MODULES = 4;
const FIRST_PLAYER_COLOR = 0xe74c3c;
const FIRST_SQUARE_START = { x: 200, y: 440 };

// The center of every QR module, as [x, y] screen points, plus the dark/light pattern the code should have.
function expectedQrModules(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const moduleSize = Math.floor(QR_SIZE_PX / (count + QR_QUIET_ZONE_MODULES * 2));
  const drawnSize = moduleSize * (count + QR_QUIET_ZONE_MODULES * 2);
  const left = Math.round(QR_CENTER.x - drawnSize / 2) + QR_QUIET_ZONE_MODULES * moduleSize;
  const top = Math.round(QR_CENTER.y - drawnSize / 2) + QR_QUIET_ZONE_MODULES * moduleSize;

  const points = [];
  const dark = [];
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      points.push([left + (column + 0.5) * moduleSize, top + (row + 0.5) * moduleSize]);
      dark.push(qr.isDark(row, column));
    }
  }
  return { points, dark };
}

for (const { name, engine, device } of CONTROLLER_DEVICES) {
  describe(`M1 with an ${name} controller`, () => {
    let server;
    let hostBrowser;
    let controllerBrowser;
    let pixelReader;
    let hostPage;
    let hostMessages;
    let controllerContext;
    let controllerPage;
    let roomCode;

    // The first player's square on the host, or null when it is not on screen.
    async function findFirstSquare() {
      const square = await findColor(pixelReader, await hostPage.screenshot(), FIRST_PLAYER_COLOR, PLAY_AREA);
      return square.count > 0 ? square : null;
    }

    async function openController() {
      const page = await controllerContext.newPage();
      await page.goto(`${server.baseUrl}/?room=${roomCode}`);
      return page;
    }

    before(async () => {
      server = await startServer();
      hostBrowser = await launchBrowser('chromium');
      controllerBrowser = engine === 'chromium' ? hostBrowser : await launchBrowser(engine);
      pixelReader = await openPixelReader(hostBrowser);
      hostPage = await hostBrowser.newPage({ viewport: { width: 1920, height: 1080 } });
      controllerContext = await controllerBrowser.newContext(device);
    });

    after(async () => {
      await hostBrowser?.close();
      await controllerBrowser?.close();
      await server?.stop();
    });

    test('host shows a room code and a QR code for the join link', async () => {
      hostMessages = watchServerMessages(hostPage);
      await hostPage.goto(`${server.baseUrl}/host`);
      roomCode = (await hostMessages.nextOfType(MESSAGE_TYPES.ROOM_CREATED, 10000)).roomCode;

      const { points, dark } = expectedQrModules(`${server.baseUrl}/?room=${roomCode}`);
      await waitUntil(
        async () => {
          const drawn = await readDarkPoints(pixelReader, await hostPage.screenshot(), points);
          return drawn.every((isDark, index) => isDark === dark[index]);
        },
        { message: 'the QR code on the host to encode the join link' },
      );
      await saveScreenshot(hostPage, `${name}-1-host-lobby`);
    });

    test('controller fills in the code from the ?room= link and joins', async () => {
      controllerPage = await openController();
      assert.equal(await controllerPage.inputValue('#room-code'), roomCode);

      await controllerPage.click('#join-button');
      await controllerPage.waitForSelector('#pad-screen:not([hidden])');
      assert.equal(await controllerPage.textContent('#pad-status'), `In room ${roomCode}`);
      await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

      const square = await waitUntil(findFirstSquare, { message: 'the first square on the host' });
      assert.ok(Math.abs(square.centerX - FIRST_SQUARE_START.x) < 5, `square x ${square.centerX}`);
      assert.ok(Math.abs(square.centerY - FIRST_SQUARE_START.y) < 5, `square y ${square.centerY}`);
      await saveScreenshot(controllerPage, `${name}-2-controller-pad`);
      await saveScreenshot(hostPage, `${name}-2-host-with-player`);
    });

    test('dragging right on the pad moves that square right, and releasing stops it', async () => {
      const start = await findFirstSquare();
      const pad = await controllerPage.locator('#drag-pad').boundingBox();
      const padX = pad.x + pad.width / 2;
      const padY = pad.y + pad.height / 2;

      // Pointer events from a mouse go through the same code path as touch in drag.js.
      await controllerPage.mouse.move(padX, padY);
      await controllerPage.mouse.down();
      await controllerPage.mouse.move(padX + 100, padY, { steps: 5 });
      const moved = await waitUntil(
        async () => {
          const square = await findFirstSquare();
          return square && square.centerX > start.centerX + 150 ? square : null;
        },
        { message: 'the square to move right' },
      );
      assert.ok(Math.abs(moved.centerY - start.centerY) < 5, 'a straight-right drag should not move it vertically');
      await saveScreenshot(controllerPage, `${name}-3-controller-dragging`);
      await controllerPage.mouse.up();

      // After release the stick is 0, 0, so two screenshots a moment apart show the square in the same place.
      await waitUntil(
        async () => {
          const firstLook = await findFirstSquare();
          await new Promise((resolve) => setTimeout(resolve, 200));
          const secondLook = await findFirstSquare();
          return Math.abs(secondLook.centerX - firstLook.centerX) < 1;
        },
        { message: 'the square to stop after release' },
      );
      await saveScreenshot(hostPage, `${name}-3-host-after-drag`);
    });

    test('closing the controller tab removes its square', async () => {
      // A headless close tears the page down, which closes its socket whether or not pagehide runs, so this
      // does not prove the pagehide handler in controller/main.js works; that needs a real browser.
      // (close({ runBeforeUnload: true }) would fire pagehide, but in Playwright's WebKit it never closes the tab.)
      await controllerPage.close();
      await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_LEFT);
      await waitUntil(async () => (await findFirstSquare()) === null, { message: 'the square to disappear' });
      await saveScreenshot(hostPage, `${name}-4-host-after-leave`);
    });

    test('closing the host sends the controller back to the join screen', async () => {
      controllerPage = await openController();
      await controllerPage.click('#join-button');
      await controllerPage.waitForSelector('#pad-screen:not([hidden])');

      await hostPage.close();
      await controllerPage.waitForSelector('#join-screen:not([hidden])');
      assert.equal(await controllerPage.textContent('#join-status'), 'The host left the game.');
      await saveScreenshot(controllerPage, `${name}-5-controller-host-left`);
    });
  });
}
