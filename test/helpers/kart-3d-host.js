// Shared setup for the 3D race's browser tests: how long the game may take to start, and starting the host at a
// chosen quality. Headless Chromium draws WebGL on the CPU (llvmpipe, test/helpers/browser.js), about 0.25 s a
// frame for the dressed course with two views, and the race's clock slows when frames are slow (the runner steps
// at most 15 times a frame). So the tests about the race's behaviour start the host at Medium (no bloom, but the
// full resolution, so pixel checks such as the black gap between views still hold), and the M7c test covers
// High and Low. The rules tests (M6b, M6c, M7a, M7b) also start on the plain course (presetPlainCourse): only
// the road, the sea and the barriers, with no dressing, baked shade or course light, as these cost about 30 s
// more to start in software and slow every frame; the look tests keep the full drawing.
// These margins were set when frames took over a second (SwiftShader) and are kept on purpose.
// Since M9 every 3D test picks its course on the setup screen before it starts (clickStartRace), Seaside Skyway
// unless it says otherwise, so the tests stay on the course they were written for while Palm Bay Airport is first.

import { QUALITY_STORAGE_KEY } from '../../host/games/kart-3d/quality.js';
import { PLAIN_COURSE_STORAGE_KEY } from '../../host/games/kart-3d/plain-course.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { clickNow } from './host-buttons.js';

// The 3D race builds its world and draws a first frame while it starts. In software that takes about 10 s more
// since M7d4b2 (the course light, and the detailed pieces' maps drawn pixel by pixel) and since M7d4c1 the shade
// baked round the whole lap, about 400 depth maps: 21 s for Seaside Skyway, 10 s for the Test track. The plain
// course does none of these. A hook or test that starts the game needs its own timeout past node's default 60 s:
// STARTING_TIMEOUT leaves room for the joins and clicks around the start.
export const GAME_START_TIMEOUT = 90000;
export const STARTING_TIMEOUT = GAME_START_TIMEOUT + 30000;

// Makes the host page load with `level` (a key of QUALITY_LEVELS) saved, as if chosen on an earlier visit.
// Call before the page's goto; it applies to every later load of that page too.
export function presetQuality(page, level) {
  return page.addInitScript(([key, value]) => localStorage.setItem(key, value), [QUALITY_STORAGE_KEY, level]);
}

// Makes the host page load with the plain course saved (see presetQuality for when to call it).
export function presetPlainCourse(page) {
  return page.addInitScript((key) => localStorage.setItem(key, '1'), PLAIN_COURSE_STORAGE_KEY);
}

// Presses the setup screen's button for the course `courseId` (an id from courses.js) and waits until it shows
// pressed. Pressing the course already chosen changes nothing.
export async function pickCourse(hostPage, courseId) {
  const button = `[data-course-id="${courseId}"]`;
  await clickNow(hostPage, button);
  await hostPage.waitForSelector(`${button}[aria-pressed="true"]`);
}

// From the setup screen with every player ready: picks `courseId` (Seaside Skyway unless given), then clicks
// Start race once it is enabled.
export async function clickStartRace(hostPage, courseId = SEASIDE_SKYWAY.id) {
  await pickCourse(hostPage, courseId);
  await hostPage.waitForSelector('#kart-3d-start-button:not([disabled])');
  await clickNow(hostPage, '#kart-3d-start-button');
}
