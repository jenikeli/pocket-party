// `npm run kit-shots -- [--bloom] [--name <sheet name>] <piece> [<piece> ...]`: a dev-only review tool. Renders each kit piece
// on a short straight of road, lit as in the race, from kart height ("near") and from higher up ("above"), and
// writes one picture sheet, test-results/review/<name>.png, with the single shots in test-results/review/shots/.
// --bloom draws through the race's bloom (High quality), so glow can be judged.
// `--course <course id> <s> [<s> ...]` shoots the whole dressed course instead (host/kit-shots/course-view.js): for
// each distance s a near view from the chase camera's spot and one from 60 above, then an overview of the course.
// The pieces and their framing live in host/kit-shots/pieces.js; the page that draws them is host/kit-shots/.
// Implementers run it in their worktrees at the same time, so at most SHOT_SLOTS runs draw at once on the
// machine (tools/machine-slots.js) and the others wait.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT_DIR, startServer } from '../test/helpers/start-server.js';
import { launchBrowser } from '../test/helpers/browser.js';
import { takeSlot } from './machine-slots.js';
import { loadShot } from './load-shot.js';

const REVIEW_DIR = path.join(ROOT_DIR, 'test-results', 'review');
const SHOTS_DIR = path.join(REVIEW_DIR, 'shots');
const VIEWS = ['near', 'above'];
const SHEET_WIDTH = 1340;
// Each run is a headless Chromium drawing on the CPU: the dev box (4 threads, 7 GB) takes two at once.
const SHOT_SLOTS = 2;
const USAGE = 'Usage: npm run kit-shots -- [--bloom] [--name <sheet name>] <piece> [<piece> ...]\n'
  + '   or: npm run kit-shots -- --course <course id> [--bloom] [--name <sheet name>] [<s> ...]';

// Reads the command line (without node and the script): `--bloom`, `--name <name>`, `--course <id>` and the piece
// names (with --course, the distances along the road). Returns { pieces, bloom, name, course } (course is null
// for pieces). The sheet's default name is the pieces joined with '-' (for a course, the id then the distances),
// plus '-bloom' with the flag. Throws a message that says how to call it when nothing is asked for, a value is
// missing, or a course's distance is not a number.
export function parseArguments(args) {
  const pieces = [];
  let name = null;
  let course = null;
  let bloom = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--bloom') {
      bloom = true;
    } else if (args[index] === '--name') {
      index += 1;
      name = args[index];
    } else if (args[index] === '--course') {
      index += 1;
      course = args[index];
    } else {
      pieces.push(args[index]);
    }
  }
  const missingValue = name === undefined || course === undefined;
  const nothingAsked = course === null && pieces.length === 0;
  const badDistance = course !== null && pieces.some((s) => Number.isNaN(Number(s)));
  if (missingValue || nothingAsked || badDistance) {
    throw new Error(USAGE);
  }
  const nameParts = [...(course === null ? [] : [course]), ...pieces, ...(bloom ? ['bloom'] : [])];
  return { pieces, bloom, name: name ?? nameParts.join('-'), course };
}

async function savePicture(page, fileName) {
  const file = path.join(SHOTS_DIR, fileName);
  await page.screenshot({ path: file });
  return file;
}

// Opens one view of one piece and saves its picture.
async function shootPiece(page, baseUrl, piece, view, bloom) {
  const url = `${baseUrl}/host/kit-shots/index.html?piece=${piece}&view=${view}${bloom ? '&bloom=1' : ''}`;
  await loadShot(page, url, `${piece} (${view})`);
  return savePicture(page, `${piece}-${view}${bloom ? '-bloom' : ''}.png`);
}

async function shootPieces(page, baseUrl, pieces, bloom) {
  const shotFiles = {};
  for (const piece of pieces) {
    shotFiles[piece] = [];
    for (const view of VIEWS) {
      shotFiles[piece].push(await shootPiece(page, baseUrl, piece, view, bloom));
      console.log(`shot ${piece} ${view}`);
    }
  }
  return shotFiles;
}

// The whole course, built once (the bake takes most of the time) and drawn again for each view through the page's
// drawCourseView. Returns the sheet's rows: each distance with its near and above shots, then the overview.
async function shootCourse(page, baseUrl, course, distances, bloom) {
  const suffix = bloom ? '-bloom' : '';
  const first = distances.length > 0 ? `view=near&s=${distances[0]}` : 'view=overview';
  await loadShot(page, `${baseUrl}/host/kit-shots/index.html?course=${course}&${first}${bloom ? '&bloom=1' : ''}`, course);
  const draw = (view, s) => page.evaluate(([viewName, distance]) => window.drawCourseView(viewName, distance), [view, s]);
  const rows = {};
  for (const [position, s] of distances.entries()) {
    rows[`s = ${s}`] = [];
    for (const view of VIEWS) {
      // The page drew the first distance's near view itself when it loaded.
      if (position > 0 || view !== 'near') {
        await draw(view, Number(s));
      }
      rows[`s = ${s}`].push(await savePicture(page, `${course}-${s}-${view}${suffix}.png`));
      console.log(`shot ${course} s=${s} ${view}`);
    }
  }
  if (distances.length > 0) {
    await draw('overview', 0);
  }
  rows.overview = [await savePicture(page, `${course}-overview${suffix}.png`)];
  console.log(`shot ${course} overview`);
  return rows;
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
  const { pieces, bloom, name, course } = parseArguments(process.argv.slice(2));
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const releaseSlot = await takeSlot('pocket-party-kit-shots', SHOT_SLOTS);
  const server = await startServer();
  let browser = null;
  try {
    browser = await launchBrowser('chromium');
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const shotFiles = course === null
      ? await shootPieces(page, server.baseUrl, pieces, bloom)
      : await shootCourse(page, server.baseUrl, course, pieces, bloom);
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
