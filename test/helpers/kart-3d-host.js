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
// Since M10b every 3D test starts its game with Play on the picker (startGame in host-buttons.js, which resolves
// with the room code) and joins its phones to that room afterwards.
// Since M10 the game starts with no course built: Start race, Watch and Measure build the chosen one behind the
// loading screen (#loading-screen), so the long wait moved from starting the game to those clicks
// (waitForCourseBuilt). Look, Measure and Watch sit in the "Display and tools" drawer (openTools).

import { QUALITY_STORAGE_KEY } from '../../host/games/kart-3d/quality.js';
import { PLAIN_COURSE_STORAGE_KEY } from '../../host/games/kart-3d/plain-course.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { clickNow } from './host-buttons.js';

// The 3D race builds the chosen course after Start race, Watch or Measure. In software that takes about 10 s more
// since M7d4b2 (the course light, and the detailed pieces' maps drawn pixel by pixel) and since M7d4c1 the shade
// baked round the whole lap, about 400 depth maps: 21 s for Seaside Skyway, 10 s for the Test track. The plain
// course does none of these. A hook or test that starts a race needs its own timeout past node's default 60 s:
// STARTING_TIMEOUT leaves room for the joins and clicks around the start. GAME_START_TIMEOUT also bounds one
// course build (waitForCourseBuilt).
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

// From the setup screen with every player ready: picks `courseId` (Seaside Skyway unless given), clicks Start
// race once it is enabled, and waits until the course is built (the race's countdown then runs).
export async function clickStartRace(hostPage, courseId = SEASIDE_SKYWAY.id) {
  await pickCourse(hostPage, courseId);
  await hostPage.waitForSelector('#kart-3d-start-button:not([disabled])');
  await clickNow(hostPage, '#kart-3d-start-button');
  await waitForCourseBuilt(hostPage);
}

// After a click that builds a course (Start race, Watch, Measure): waits until the setup screen has gone and the
// loading screen is not up. A course built before is not built again, so the loading screen may never show.
export async function waitForCourseBuilt(hostPage) {
  await hostPage.waitForSelector('#kart-3d-setup', { state: 'hidden', timeout: GAME_START_TIMEOUT });
  await hostPage.waitForSelector('#loading-screen', { state: 'hidden', timeout: GAME_START_TIMEOUT });
}

// Opens the setup screen's "Display and tools" drawer (Look, Measure, Watch), if it is not open. Its buttons
// can be clicked with clickNow while it is closed too; open it for screenshots and visibility checks.
export async function openTools(hostPage) {
  if (!(await hostPage.isVisible('#kart-3d-tools'))) {
    await clickNow(hostPage, '#kart-3d-tools-button');
  }
  await hostPage.waitForSelector('#kart-3d-tools:not([hidden])');
}

// From the setup screen: clicks Watch with `viewCount` views (1 to 4) and waits until its course is built.
export async function clickWatch(hostPage, viewCount) {
  await clickNow(hostPage, `[data-watch-views="${viewCount}"]`);
  await waitForCourseBuilt(hostPage);
}

// Makes the host page count the WebGL draw calls it makes, from the page's start (call before goto). The setup
// screen draws nothing in 3D, so a count that stays still there proves no course is built or drawn (the renderer
// draws its sky reflection map once when it starts, so the count is not 0); read it with drawCallCount.
export function watchDrawCalls(page) {
  return page.addInitScript(() => {
    window.pocketPartyDrawCalls = 0;
    for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
        const original = context.prototype[name];
        if (!original) {
          continue;
        }
        context.prototype[name] = function countedDraw(...args) {
          window.pocketPartyDrawCalls += 1;
          return original.apply(this, args);
        };
      }
    }
  });
}

export function drawCallCount(hostPage) {
  return hostPage.evaluate(() => window.pocketPartyDrawCalls);
}

// Makes the host page log what the loading screen does, from the page's start (call before goto): each time it
// is shown or hidden, its title when shown, and every width the bar had. The course build blocks the page for
// seconds at a time, so polling would miss the screen; an observer's records arrive after each blocked stretch
// with the old values, so none is lost. Read it with loadingLog.
export function watchLoadingScreen(page) {
  return page.addInitScript(() => {
    window.pocketPartyLoading = { events: [], titles: [], barWidths: [] };
    const log = window.pocketPartyLoading;
    document.addEventListener('DOMContentLoaded', () => {
      const screen = document.getElementById('loading-screen');
      const bar = document.getElementById('loading-bar');
      new MutationObserver((records) => {
        for (const record of records) {
          // The attribute was absent before when the screen was shown at the time, so it has just been hidden.
          log.events.push(record.oldValue === null ? 'hidden' : 'shown');
          if (record.oldValue !== null) {
            log.titles.push(document.getElementById('loading-title').textContent);
          }
        }
      }).observe(screen, { attributes: true, attributeFilter: ['hidden'], attributeOldValue: true });
      new MutationObserver((records) => {
        for (const record of records) {
          log.barWidths.push(parseFloat(record.oldValue?.match(/width:\s*([\d.]+)%/)?.[1] ?? '0'));
        }
        log.barWidths.push(parseFloat(bar.style.width) || 0);
      }).observe(bar, { attributes: true, attributeFilter: ['style'], attributeOldValue: true });
    });
  });
}

export function loadingLog(hostPage) {
  return hostPage.evaluate(() => window.pocketPartyLoading);
}
