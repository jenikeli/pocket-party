// `npm run course-previews`: a dev-only tool that builds each 3D course as kit-shots' `--course` does (the page in
// host/kit-shots/) and saves its near view at the distance `s` named in COURSE_PREVIEWS as
// assets/kart-3d/previews/<course id>.jpg, 1280x720. The setup screen shows these instead of building the courses.
// Re-run it when a course's look changes. Shares kit-shots' machine-wide drawing slots (tools/machine-slots.js).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT_DIR, startServer } from '../test/helpers/start-server.js';
import { launchBrowser } from '../test/helpers/browser.js';
import { takeSlot } from './machine-slots.js';
import { loadShot } from './load-shot.js';
import { COURSES } from '../host/games/kart-3d/courses.js';
import { COURSE_PREVIEWS } from '../host/games/kart-3d/course-previews.js';

const PREVIEWS_DIR = path.join(ROOT_DIR, 'assets', 'kart-3d', 'previews');
const JPEG_QUALITY = 80;
// The same slots as kit-shots: the two tools draw the same way and must not run beside each other.
const SHOT_SLOTS = 2;

// Where on disk a preview picture is saved: the registry's picture path is the URL under the server's root.
export function previewFile(courseId) {
  return path.join(ROOT_DIR, COURSE_PREVIEWS[courseId].picture);
}

// Opens the course's near view at its preview distance, waits for the page's picture, and saves it as a JPEG.
async function shootPreview(page, baseUrl, course) {
  const { s } = COURSE_PREVIEWS[course.id];
  await loadShot(page, `${baseUrl}/host/kit-shots/index.html?course=${course.id}&view=near&s=${s}`, course.id);
  const file = previewFile(course.id);
  await page.screenshot({ path: file, type: 'jpeg', quality: JPEG_QUALITY });
  console.log(`saved ${path.relative(ROOT_DIR, file)} (${fs.statSync(file).size} bytes)`);
}

async function main() {
  fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
  const releaseSlot = await takeSlot('pocket-party-kit-shots', SHOT_SLOTS);
  const server = await startServer();
  let browser = null;
  try {
    browser = await launchBrowser('chromium');
    for (const course of COURSES) {
      // A new page for each course: a built course holds its WebGL context, so it is closed before the next.
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await shootPreview(page, server.baseUrl, course);
      await page.close();
    }
  } finally {
    await browser?.close();
    await server.stop();
    releaseSlot();
  }
}

// Run only when started as a script, so the tests can import previewFile.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
