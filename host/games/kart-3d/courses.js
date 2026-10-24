// The 3D race's courses, in the order the setup screen offers them; the first is the default. Each is a track
// definition for track-builder.js, plus an `id` (what the setup screen's buttons send) and a `name` (what they
// show). Used by host/games/kart-3d/index.js and panels.js.

import { SEASIDE_SKYWAY } from './seaside-skyway.js';
import { TEST_TRACK } from './test-track.js';

export const COURSES = Object.freeze([SEASIDE_SKYWAY, TEST_TRACK]);
