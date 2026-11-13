// Builds the 3D race's chosen course when a race, Watch or Measure needs it (M10: nothing is built on the setup
// screen), behind the shell's loading screen with the course's name and saved picture, its bar following the
// build's stages (renderer.js's buildCourse). A course built once is kept until another is built. Used by
// host/games/kart-3d/index.js.

import { COURSE_PREVIEWS } from './course-previews.js';

// `renderer` is renderer.js's (only its buildCourse is used), `showLoading` host/loading-screen.js's (passed in,
// so this file has no DOM and is unit tested in Node). Returns { withCourseBuilt(course, track, then), isBuilding(), throwIfFailed(),
// stop() }.
export function createCourseLoader(renderer, showLoading) {
  // The id of the course the renderer holds, null until the first build.
  let builtCourseId = null;
  // The loading screen's handle while a course is built, and the error a build threw, if one did.
  let loading = null;
  let buildError = null;

  // Runs `then()` once `course` (an entry of COURSES, with its `track`) is built: at once if it is the course built
  // last, otherwise after building it. The build yields a frame between stages, so the game keeps stepping
  // meanwhile (the phones keep their setup views). If the game stops meanwhile, `then` never runs.
  async function withCourseBuilt(course, track, then) {
    if (builtCourseId === course.id) {
      then();
      return;
    }
    loading = showLoading({ title: course.name, picture: COURSE_PREVIEWS[course.id].picture });
    try {
      if (await renderer.buildCourse(track, loading.setProgress)) {
        builtCourseId = course.id;
        then();
      }
    } catch (error) {
      buildError = error;
    } finally {
      hideLoading();
    }
  }

  // A build runs outside the game's frames, so its error is kept for the game's render() to throw: the shell then
  // ends the game and the lobby says why, as for an error in any frame.
  function throwIfFailed() {
    if (buildError) {
      throw buildError;
    }
  }

  function hideLoading() {
    loading?.hide();
    loading = null;
  }

  // A build under way stops at its next stage once the renderer is destroyed; its loading screen goes now.
  return { withCourseBuilt, isBuilding: () => loading !== null, throwIfFailed, stop: hideLoading };
}
