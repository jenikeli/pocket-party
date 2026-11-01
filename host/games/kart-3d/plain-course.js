// The plain course: a test-only setting that draws the 3D race's course without its dressing, baked shade and
// course light, so the rules' browser tests (which draw in software) run faster. Kept in the host's localStorage
// like the quality (quality.js), where the tests set it before the page loads; nothing in the UI sets it. Used by
// host/games/kart-3d/index.js, which passes it to renderer.js.

export const PLAIN_COURSE_STORAGE_KEY = 'pocket-party.kart-3d.plain-course';

// True only when the host's localStorage holds '1'. localStorage can be missing or throw (a private window,
// blocked site data), and then the full course is drawn.
export function loadPlainCourse() {
  try {
    return localStorage.getItem(PLAIN_COURSE_STORAGE_KEY) === '1';
  } catch (error) {
    console.error('Could not read the plain course setting, drawing the full course', error);
    return false;
  }
}
