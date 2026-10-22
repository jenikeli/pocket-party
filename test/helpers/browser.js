// Shared setup for the browser tests: launching browsers, watching a page's WebSocket messages,
// polling until something shows up, and saving screenshots to test-results/screenshots/.

import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import { ROOT_DIR } from './start-server.js';
import { createMessageQueue } from './message-queue.js';

const SCREENSHOT_DIR = path.join(ROOT_DIR, 'test-results', 'screenshots');
const ENGINES = { chromium, webkit };

// Launches a headless browser, with a hint when the browser or its system libraries are missing.
export async function launchBrowser(engineName) {
  try {
    return await ENGINES[engineName].launch();
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
