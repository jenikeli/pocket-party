// Browser tests for M1 end to end: the real host page (desktop Chromium) and the real controller page on an
// emulated Android phone (Chromium) and iPhone (WebKit, Safari's engine). Screenshots go to test-results/screenshots/.
// Since M3 the host shows the input lab, so "the player's square" is the stick dot on that player's card.
// Since M10b the host page starts with Tap to start, then the game picker (no room yet); Play opens the input
// lab's room and its join window, the phone joins after that (read by id, the QR code from its drawn pixels).

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader, findColor, readDarkPoints } from '../helpers/screenshot-pixels.js';
import { startGame, closeJoinWindow } from '../helpers/host-buttons.js';
import { QUIET_ZONE_MODULES } from '../../host/qr-code.js';
import { qrcode } from '../../host/vendor/qrcode-generator-2.0.4.mjs';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const CONTROLLER_DEVICES = [
  { name: 'android', engine: 'chromium', device: devices['Pixel 7'] },
  { name: 'iphone', engine: 'webkit', device: devices['iPhone 13'] },
];

// Layout from host/games/input-lab/player-card.js, at 1:1 scale (1920x1080 viewport).
const FIRST_PLAYER_COLOR = 0xe74c3c;
// The first card's top-left corner is (15, 110); its stick ring is centered 105, 195 inside it, radius 75.
const FIRST_DOT_START = { x: 120, y: 305 };
const FIRST_RING_AREA = { left: 45, top: 230, right: 196, bottom: 381 };

// The center of every QR module in the join window, as [x, y] page points, plus the dark/light pattern the code
// should have. The QR is an SVG whose viewBox counts modules (the quiet zone included), so a module is the
// svg's width over that count.
function expectedQrModules(text, svgBox) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const moduleSize = svgBox.width / (count + QUIET_ZONE_MODULES * 2);

  const points = [];
  const dark = [];
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      points.push([
        svgBox.x + (QUIET_ZONE_MODULES + column + 0.5) * moduleSize,
        svgBox.y + (QUIET_ZONE_MODULES + row + 0.5) * moduleSize,
      ]);
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

    // The first player's stick dot on the host, or null when it is not on screen.
    async function findFirstDot() {
      const dot = await findColor(pixelReader, await hostPage.screenshot(), FIRST_PLAYER_COLOR, FIRST_RING_AREA);
      return dot.count > 0 ? dot : null;
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

    test('the picker has no room; Play opens the input lab\'s room and the join window shows its code, the address and a QR code for the join link', async () => {
      hostMessages = watchServerMessages(hostPage);
      await hostPage.goto(`${server.baseUrl}/host`);
      assert.equal(await hostPage.isVisible('#tap-to-start'), true);
      assert.equal(await hostPage.isVisible('#game-picker'), false);
      await saveScreenshot(hostPage, `${name}-1-host-tap-to-start`);
      await hostPage.click('#tap-to-start-button');
      await hostPage.waitForSelector('#game-picker:not([hidden])');
      // Nothing is created before Play: the room (and its code) comes after it, so no message arrives first.
      const beforePlay = await hostMessages.collectFor(1500);
      assert.equal(beforePlay.some((message) => message.type === MESSAGE_TYPES.ROOM_CREATED), false);
      assert.equal(await hostPage.isVisible('#join-window'), false);

      roomCode = await startGame(hostPage, { gameId: 'input-lab', keepJoinWindow: true });
      assert.equal(await hostPage.isVisible('#tap-to-start'), false);
      assert.equal(await hostPage.isVisible('#join-window'), true);
      assert.equal(await hostPage.textContent('#join-code'), roomCode);
      assert.equal(await hostPage.textContent('#join-url'), server.baseUrl);

      const svgBox = await hostPage.locator('#join-qr svg').boundingBox();
      const { points, dark } = expectedQrModules(`${server.baseUrl}/?room=${roomCode}`, svgBox);
      await waitUntil(
        async () => {
          const drawn = await readDarkPoints(pixelReader, await hostPage.screenshot(), points);
          return drawn.every((isDark, index) => isDark === dark[index]);
        },
        { message: 'the QR code on the host to encode the join link' },
      );
      await saveScreenshot(hostPage, `${name}-1-host-join-window`);
    });

    test('controller fills in the code from the ?room= link and joins; the lab shows its card at once', async () => {
      controllerPage = await openController();
      assert.equal(await controllerPage.inputValue('#room-code'), roomCode);

      await controllerPage.click('#join-button');
      await controllerPage.waitForSelector('#pad-screen', { state: 'visible' });
      assert.equal(await controllerPage.textContent('#game-status'), roomCode);
      await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
      await closeJoinWindow(hostPage);

      const dot = await waitUntil(findFirstDot, { message: 'the first player\'s dot on the host' });
      assert.ok(Math.abs(dot.centerX - FIRST_DOT_START.x) < 3, `dot x ${dot.centerX}`);
      assert.ok(Math.abs(dot.centerY - FIRST_DOT_START.y) < 3, `dot y ${dot.centerY}`);
      await saveScreenshot(controllerPage, `${name}-2-controller-pad`);
      await saveScreenshot(hostPage, `${name}-2-host-with-player`);
    });

    test('dragging right on the pad moves that player\'s dot right, and releasing centers it', async () => {
      const start = await findFirstDot();
      const pad = await controllerPage.locator('#input-pad').boundingBox();
      const padX = pad.x + pad.width / 2;
      const padY = pad.y + pad.height / 2;

      // Pointer events from a mouse go through the same code path as touch in drag.js.
      await controllerPage.mouse.move(padX, padY);
      await controllerPage.mouse.down();
      await controllerPage.mouse.move(padX + 100, padY, { steps: 5 });
      // A full push moves the dot 53 px (ring radius 75 minus dot radius 22).
      const moved = await waitUntil(
        async () => {
          const dot = await findFirstDot();
          return dot && dot.centerX > start.centerX + 45 ? dot : null;
        },
        { message: 'the dot to move right' },
      );
      assert.ok(Math.abs(moved.centerY - start.centerY) < 5, 'a straight-right drag should not move it vertically');
      await saveScreenshot(controllerPage, `${name}-3-controller-dragging`);
      await controllerPage.mouse.up();

      // Release sends 0, 0, which puts the dot back in the middle of the ring.
      await waitUntil(
        async () => {
          const dot = await findFirstDot();
          return dot && Math.abs(dot.centerX - start.centerX) < 3;
        },
        { message: 'the dot to return to the center after release' },
      );
      await saveScreenshot(hostPage, `${name}-3-host-after-drag`);
    });

    // Changed in M4: the card stays, covered by "waiting to reconnect", until the grace period ends.
    test('closing the controller tab covers its card while the slot is held', async () => {
      // A headless close tears the page down, which closes its socket whether or not pagehide runs, so this
      // does not prove the pagehide handler in controller/main.js works; that needs a real browser.
      // (close({ runBeforeUnload: true }) would fire pagehide, but in Playwright's WebKit it never closes the tab.)
      await controllerPage.close();
      await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_DISCONNECTED);
      await waitUntil(async () => (await findFirstDot()) === null, { message: 'the card to be covered' });
      await saveScreenshot(hostPage, `${name}-4-host-after-leave`);
    });

    test('closing the host page ends the game on the phone', async () => {
      // The phone saved its place, so opening the link again rejoins straight into the lab.
      controllerPage = await openController();
      await controllerPage.waitForSelector('#pad-screen', { state: 'visible' });

      await hostPage.close();
      await controllerPage.waitForSelector('#ended-screen:not([hidden])');
      assert.equal(await controllerPage.textContent('#ended-text'), 'The game ended');
      await saveScreenshot(controllerPage, `${name}-5-controller-host-left`);
    });
  });
}
