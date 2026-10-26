// Shared setup for the 3D race's browser tests: how long the game may take to start, and starting the host at a
// chosen quality. Headless Chromium draws WebGL on the CPU (llvmpipe, test/helpers/browser.js), about 0.25 s a
// frame for the dressed course with two views, and the race's clock slows when frames are slow (the runner steps
// at most 15 times a frame). So the tests about the race's behaviour start the host at Medium (no bloom, but the
// full resolution, so pixel checks such as the black gap between views still hold), and the M7c test covers
// High and Low. These margins were set when frames took over a second (SwiftShader) and are kept on purpose.

import { QUALITY_STORAGE_KEY } from '../../host/games/kart-3d/quality.js';

// The 3D race builds its world and draws a first frame while it starts. Since M7d4b2 that takes about 10 s more
// in software: with its trials on (the defaults), the course's shade is baked from about a hundred depth maps,
// its light taken from six views of it, and the detailed pieces' maps drawn pixel by pixel.
export const GAME_START_TIMEOUT = 60000;

// Makes the host page load with `level` (a key of QUALITY_LEVELS) saved, as if chosen on an earlier visit.
// Call before the page's goto; it applies to every later load of that page too.
export function presetQuality(page, level) {
  return page.addInitScript(([key, value]) => localStorage.setItem(key, value), [QUALITY_STORAGE_KEY, level]);
}
