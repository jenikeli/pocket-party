// `npm run kit-shots -- [--name <sheet name>] <piece> [<piece> ...]`: a dev-only review tool. Renders each kit piece
// on a short straight of road, lit as in the race, from kart height ("near") and from higher up ("above"), and
// writes one picture sheet, test-results/review/<name>.png, with the single shots in test-results/review/shots/.
// The pieces and their framing live in host/kit-shots/pieces.js; the page that draws them is host/kit-shots/.
// Implementers run it in their worktrees at the same time, so at most SHOT_SLOTS runs draw at once on the
// machine (tools/machine-slots.js) and the others wait.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT_DIR, startServer } from '../test/helpers/start-server.js';
import { launchBrowser } from '../test/helpers/browser.js';
import { takeSlot } from './machine-slots.js';

const REVIEW_DIR = path.join(ROOT_DIR, 'test-results', 'review');
const SHOTS_DIR = path.join(REVIEW_DIR, 'shots');
const VIEWS = ['near', 'above'];
// Building the course and drawing in software takes 20-60 s a shot on the dev box.
const SHOT_TIMEOUT_MS = 120000;
const SHEET_WIDTH = 1340;
// Each run is a headless Chromium drawing on the CPU: the dev box (4 threads, 7 GB) takes two at once.
const SHOT_SLOTS = 2;

// Reads the command line (without node and the script): `--name <name>` and the piece names. The sheet's default
// name is the pieces joined with '-'. Throws a message that says how to call it when no piece is given.
export function parseArguments(args) {
  const pieces = [];
  let name = null;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--name') {
      index += 1;
      name = args[index];
    } else {
      pieces.push(args[index]);
    }
  }
  if (pieces.length === 0 || name === undefined) {
    throw new Error('Usage: npm run kit-shots -- [--name <sheet name>] <piece> [<piece> ...]');
  }
  return { pieces, name: name ?? pieces.join('-') };
}

// Opens one view of one piece and saves its picture. Fails with the page's own message when it reports an
// error (an unknown piece, or building threw) or throws one.
async function shootPiece(page, baseUrl, piece, view) {
  const pageErrors = [];
  const onPageError = (error) => pageErrors.push(error.message);
  page.on('pageerror', onPageError);
  try {
    await page.goto(`${baseUrl}/host/kit-shots/index.html?piece=${piece}&view=${view}`);
    const outcome = await page.waitForFunction(
      () => window.kitShotReady === true || window.kitShotError || null,
      null,
      { timeout: SHOT_TIMEOUT_MS },
    ).then((handle) => handle.jsonValue());
    if (outcome !== true || pageErrors.length > 0) {
      throw new Error(`${piece} (${view}): ${pageErrors[0] ?? outcome}`);
    }
    const file = path.join(SHOTS_DIR, `${piece}-${view}.png`);
    await page.screenshot({ path: file });
    return file;
  } finally {
    page.off('pageerror', onPageError);
  }
}

// The sheet: a title, then a row for each piece with its two shots side by side at 640x360. The shots are
// embedded as data URLs, so the page needs no server.
function sheetHtml(name, shotFiles) {
  const dataUrl = (file) => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
  const rows = Object.entries(shotFiles).map(([piece, files]) => `
    <div class="row"><h2>${piece}</h2>${files.map((file) => `<img src="${dataUrl(file)}">`).join('')}</div>`);
  return `<html><body style="margin:0;background:#222;color:#eee;font:20px sans-serif">
    <h1 style="margin:12px 16px;font-size:26px">${name}</h1>${rows.join('')}
    <style>.row { padding: 4px 16px 12px } .row h2 { margin: 4px 0; font-size: 20px } .row img { width: 640px; height: 360px; margin-right: 8px }</style>
  </body></html>`;
}

async function writeSheet(browser, name, shotFiles) {
  const page = await browser.newPage({ viewport: { width: SHEET_WIDTH, height: 200 } });
  await page.setContent(sheetHtml(name, shotFiles));
  const file = path.join(REVIEW_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function main() {
  const { pieces, name } = parseArguments(process.argv.slice(2));
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const releaseSlot = await takeSlot('pocket-party-kit-shots', SHOT_SLOTS);
  const server = await startServer();
  let browser = null;
  try {
    browser = await launchBrowser('chromium');
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const shotFiles = {};
    for (const piece of pieces) {
      shotFiles[piece] = [];
      for (const view of VIEWS) {
        shotFiles[piece].push(await shootPiece(page, server.baseUrl, piece, view));
        console.log(`shot ${piece} ${view}`);
      }
    }
    console.log(`Sheet: ${await writeSheet(browser, name, shotFiles)}`);
  } finally {
    await browser?.close();
    await server.stop();
    releaseSlot();
  }
}

// Run only when started as a script, so the tests can import parseArguments.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
