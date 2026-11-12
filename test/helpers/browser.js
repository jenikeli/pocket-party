// Shared setup for the browser tests: launching browsers, watching a page's WebSocket messages, opening the host
// page, polling until something shows up, and saving screenshots to test-results/screenshots/.

import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import { ROOT_DIR } from './start-server.js';
import { createMessageQueue } from './message-queue.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const SCREENSHOT_DIR = path.join(ROOT_DIR, 'test-results', 'screenshots');
const ENGINES = { chromium, webkit };
// Headless Chromium draws WebGL on the CPU. By default it uses its own SwiftShader; these flags make it use
// Mesa's llvmpipe instead (also CPU, but measured about 5 times faster on the dev box: 0.23 s against 1.17 s a
// frame of the 3D race). llvmpipe is on Chromium's GPU blocklist, so without the second flag WebGL silently
// fails. WebKit has no such switch and only runs the phone pages, which draw no WebGL.
const LAUNCH_OPTIONS = { chromium: { args: ['--use-angle=gl-egl', '--ignore-gpu-blocklist'] }, webkit: {} };

// Launches a headless browser, with a hint when the browser or its system libraries are missing.
export async function launchBrowser(engineName) {
  try {
    return await ENGINES[engineName].launch(LAUNCH_OPTIONS[engineName]);
  } catch (error) {
    throw new Error(
      `Could not launch ${engineName}. If it is not installed, run once:\n` +
        '  npx playwright install chromium webkit\n' +
        '  sudo npx playwright install-deps chromium webkit\n' +
        `Original error: ${error.message}`,
    );
  }
}

// Collects every message the server sends to this page, so tests can await e.g. room_created.
// Call before page.goto, or the first messages are missed.
export function watchServerMessages(page) {
  const queue = createMessageQueue();
  page.on('websocket', (socket) => {
    socket.on('framereceived', ({ payload }) => queue.push(JSON.parse(payload)));
  });
  return queue;
}

// Opens the host page, taps Tap to start (the room is created only after the tap) and resolves with the room code
// once the lobby shows. The join window opens by itself on an empty room and is left open, for the tests that
// look at it; startGame and chooseGame in host-buttons.js close it. `hostMessages` comes from
// watchServerMessages(hostPage), called before this.
export async function openHost(hostPage, baseUrl, hostMessages) {
  await hostPage.goto(`${baseUrl}/host`);
  await hostPage.click('#tap-to-start-button');
  const { roomCode } = await hostMessages.nextOfType(MESSAGE_TYPES.ROOM_CREATED, 10000);
  await hostPage.waitForSelector('#join-window:not([hidden])');
  return roomCode;
}

// Calls `check` until it returns something truthy, and returns that. Rendering happens on the next
// animation frames, so a test cannot look at the screen right after sending a message.
export async function waitUntil(check, { timeoutMs = 5000, message = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out after ${timeoutMs} ms waiting for: ${message}`);
}

// Saves a screenshot under test-results/screenshots/<name>.png and returns the PNG bytes.
export async function saveScreenshot(page, name) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  return page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
}
