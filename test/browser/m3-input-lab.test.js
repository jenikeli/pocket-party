// Browser tests for M3, the input lab: the real controller page on an emulated Android phone (Chromium) and
// iPhone (WebKit) against the real host page. Headless browsers have no motion sensor, so the tilt tests stub
// DeviceOrientationEvent.requestPermission and fire deviceorientation events by hand.
// Since M4 the lab starts from the lobby once two players are ready. The tested phone joins first (so it has
// the first card), a helper phone joins second, and each test then reopens the tested phone's tab, which
// rejoins as the same player straight into the lab.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { startServer } from '../helpers/start-server.js';
import { launchBrowser, watchServerMessages, waitUntil, saveScreenshot } from '../helpers/browser.js';
import { openPixelReader, findColor } from '../helpers/screenshot-pixels.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const CONTROLLER_DEVICES = [
  { name: 'android', engine: 'chromium', device: devices['Pixel 7'], platform: 'Android' },
  { name: 'iphone', engine: 'webkit', device: devices['iPhone 13'], platform: 'iPhone' },
];

// From host/player-card.js: the first card's stick ring (see test/browser/m1-flow.test.js).
const FIRST_PLAYER_COLOR = 0xe74c3c;
const FIRST_DOT_START = { x: 120, y: 210 };
const FIRST_RING_AREA = { left: 45, top: 135, right: 196, bottom: 286 };

// Runs in the controller page before its scripts, so the lab sees this answer to the permission prompt.
function stubTiltPermission(answer) {
  DeviceOrientationEvent.requestPermission = async () => answer;
}

for (const { name, engine, device, platform } of CONTROLLER_DEVICES) {
  describe(`M3 input lab with an ${name} controller`, () => {
    let server;
    let hostBrowser;
    let controllerBrowser;
    let pixelReader;
    let hostPage;
    let hostMessages;
    let roomCode;
    let controllerContext;
    let testedPlayerId;

    // The next message of `type` the host receives from the tested phone (the helper's traffic is skipped).
    async function nextFromTested(type, timeoutMs = 5000) {
      while (true) {
        const message = await hostMessages.nextOfType(type, timeoutMs);
        if (message.playerId === testedPlayerId) {
          return message;
        }
      }
    }

    // Opens a fresh tab for the tested phone, which rejoins into the lab. Every test closes its tab with leave().
    // Returns { page, playerId, deviceInfo, firstMode }: the two messages every controller sends after (re)joining
    // and starting the lab, read here so tests start with nothing left over in the queue.
    async function joinController(permissionAnswer) {
      const page = await controllerContext.newPage();
      if (permissionAnswer) {
        await page.addInitScript(stubTiltPermission, permissionAnswer);
      }
      await page.goto(`${server.baseUrl}/?room=${roomCode}`);
      await page.waitForSelector('#pad-screen:not([hidden])');
      const { playerId } = await nextFromTested(MESSAGE_TYPES.PLAYER_RECONNECTED);
      const deviceInfo = await nextFromTested(MESSAGE_TYPES.DEVICE_INFO);
      const firstMode = await nextFromTested(MESSAGE_TYPES.INPUT_MODE);
      return { page, playerId, deviceInfo, firstMode };
    }

    async function leave(page) {
      await page.close();
      await nextFromTested(MESSAGE_TYPES.PLAYER_DISCONNECTED);
    }

    // The next INPUT the host receives from this player that matches `kind`.
    async function nextHostInput(playerId, kind) {
      while (true) {
        const message = await hostMessages.nextOfType(MESSAGE_TYPES.INPUT, 5000);
        if (message.playerId === playerId && message.input.kind === kind) {
          return message;
        }
      }
    }

    // Joins `context`'s phone to the lobby and returns its page and playerId.
    async function joinLobby(context) {
      const page = await context.newPage();
      await page.goto(`${server.baseUrl}/?room=${roomCode}`);
      await page.click('#join-button');
      await page.waitForSelector('#lobby-screen:not([hidden])');
      const { playerId } = await hostMessages.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
      return { page, playerId };
    }

    function fireOrientation(page, beta, gamma) {
      return page.evaluate(
        ({ beta, gamma }) => window.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta, gamma })),
        { beta, gamma },
      );
    }

    async function findFirstDot() {
      const dot = await findColor(pixelReader, await hostPage.screenshot(), FIRST_PLAYER_COLOR, FIRST_RING_AREA);
      return dot.count > 0 ? dot : null;
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

      controllerContext = await controllerBrowser.newContext(device);
      const tested = await joinLobby(controllerContext);
      testedPlayerId = tested.playerId;
      const helper = await joinLobby(await hostBrowser.newContext(devices['Pixel 7']));
      await tested.page.click('#ready-button');
      await helper.page.click('#ready-button');
      await tested.page.waitForSelector('#pad-screen:not([hidden])', { timeout: 8000 });
      await leave(tested.page);
    });

    after(async () => {
      await hostBrowser?.close();
      await controllerBrowser?.close();
      await server?.stop();
    });

    test('on joining, the host learns the phone type and that it starts on drag', async () => {
      const { page, playerId, deviceInfo, firstMode } = await joinController();
      assert.equal(deviceInfo.playerId, playerId);
      assert.equal(deviceInfo.platform, platform);
      assert.deepEqual(firstMode, { type: MESSAGE_TYPES.INPUT_MODE, mode: 'drag', playerId });
      await leave(page);
    });

    test('the host pings each controller and gets a pong back through the page', async () => {
      const { page, playerId } = await joinController();
      // The host pings once a second, so a pong must arrive within about two.
      const pong = await nextFromTested(MESSAGE_TYPES.PONG, 3000);
      assert.equal(pong.playerId, playerId);
      assert.equal(typeof pong.sentAt, 'number');
      await leave(page);
    });

    test('tap mode sends one tap per touch and counts them on the phone', async () => {
      const { page, playerId } = await joinController();
      await page.click('button[data-mode="tap"]');
      assert.equal((await nextFromTested(MESSAGE_TYPES.INPUT_MODE)).mode, 'tap');
      for (let i = 0; i < 3; i += 1) {
        await page.click('#input-pad');
      }
      for (let i = 0; i < 3; i += 1) {
        const message = await nextHostInput(playerId, 'tap');
        assert.equal(typeof message.sentAt, 'number');
      }
      assert.equal(await page.textContent('#big-readout'), '3');
      await waitUntil(async () => /^[1-9]\d* Hz$/.test(await page.textContent('#readout-rate')), {
        message: 'the controller to show a send rate',
      });
      await saveScreenshot(page, `${name}-m3-1-controller-tap`);
      await saveScreenshot(hostPage, `${name}-m3-1-host-tap`);
      await leave(page);
    });

    test('swipe mode sends a flick to the right as a right swipe', async () => {
      const { page, playerId } = await joinController();
      await page.click('button[data-mode="swipe"]');
      const pad = await page.locator('#input-pad').boundingBox();
      const y = pad.y + pad.height / 2;
      await page.mouse.move(pad.x + 40, y);
      await page.mouse.down();
      await page.mouse.move(pad.x + pad.width - 40, y, { steps: 4 });
      await page.mouse.up();

      const { input } = await nextHostInput(playerId, 'swipe');
      assert.equal(input.direction, 'right');
      assert.equal(input.x, 1);
      assert.ok(input.speed > 0, `speed ${input.speed}`);
      assert.equal(await page.textContent('#big-readout'), '→');
      await leave(page);
    });

    test('tilt with permission granted: the first pose is zero, tilting moves the host dot, Set zero recenters', async () => {
      const { page, playerId } = await joinController('granted');
      await page.click('button[data-mode="tilt"]');
      await page.click('#enable-tilt-button');
      // The listener starts only after the permission answer, so keep sending the resting pose until the
      // first one lands; otherwise the tilted pose below could become zero.
      await waitUntil(
        async () => {
          await fireOrientation(page, 30, 0);
          return page.isVisible('#calibrate-button');
        },
        { message: 'tilt to start' },
      );
      assert.equal(await page.textContent('#readout-tilt'), 'working');

      // Tilt the right edge well down: the value climbs to a full push to the right.
      await waitUntil(
        async () => {
          await fireOrientation(page, 30, 40);
          const dot = await findFirstDot();
          return dot && dot.centerX > FIRST_DOT_START.x + 45;
        },
        { message: 'the host dot to move right when the phone tilts right' },
      );
      // The queue still holds every tilt input since the start, beginning with the calibrated 0, 0.
      let input = (await nextHostInput(playerId, 'tilt')).input;
      while (input.x === 0) {
        input = (await nextHostInput(playerId, 'tilt')).input;
      }
      assert.ok(input.x > 0 && input.y === 0, `tilt input ${JSON.stringify(input)}`);
      await saveScreenshot(page, `${name}-m3-2-controller-tilt`);
      await saveScreenshot(hostPage, `${name}-m3-2-host-tilt`);

      await page.click('#calibrate-button');
      await waitUntil(
        async () => {
          const dot = await findFirstDot();
          return dot && Math.abs(dot.centerX - FIRST_DOT_START.x) < 3;
        },
        { message: 'Set zero to put the host dot back in the middle' },
      );
      await leave(page);
    });

    test('tilt with permission denied falls back to drag and tells the host why', async () => {
      const { page, playerId } = await joinController('denied');
      await page.click('button[data-mode="tilt"]');
      await page.click('#enable-tilt-button');
      await page.waitForSelector('#lab-notice:not([hidden])');
      assert.match(await page.textContent('#lab-notice'), /permission denied/);
      assert.equal(await page.getAttribute('button[data-mode="drag"]', 'aria-pressed'), 'true');

      // First the switch to the tilt tab, then the fallback.
      assert.equal((await nextFromTested(MESSAGE_TYPES.INPUT_MODE)).mode, 'tilt');
      assert.deepEqual(await nextFromTested(MESSAGE_TYPES.INPUT_MODE), {
        type: MESSAGE_TYPES.INPUT_MODE,
        mode: 'drag',
        fallbackFrom: 'tilt',
        reason: 'denied',
        playerId,
      });
      await saveScreenshot(page, `${name}-m3-3-controller-tilt-denied`);
      await saveScreenshot(hostPage, `${name}-m3-3-host-tilt-denied`);
      await leave(page);
    });

    test('tilt with no readings falls back to drag after the 2 s wait', async () => {
      const { page } = await joinController('granted');
      await page.click('button[data-mode="tilt"]');
      await page.click('#enable-tilt-button');
      await page.waitForSelector('#lab-notice:not([hidden])', { timeout: 5000 });
      assert.match(await page.textContent('#lab-notice'), /no readings/);
      assert.equal(await page.textContent('#readout-tilt'), 'no readings (no sensor?)');
      await leave(page);
    });
  });
}
