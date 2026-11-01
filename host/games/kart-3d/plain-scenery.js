// The plain dressing of the plain course (plain-course.js): only the barriers, in their plain wall (or the
// anti-gravity wall) wherever the track has walls, so karts still bounce off something visible. No supports, props,
// gate or landmarks. Used by scenery.js in place of a course's own dressing.

import { createKit, kitPart } from './kit/kit.js';
import { KIT_PARTS } from './kit/layout-rules.js';
import { buildBarriers } from './kit/barriers.js';

// Same arguments and return as a course's buildDressing (scenery.js). With no runs given, kit/layout-rules.js's
// barrierStyleAt picks the plain wall.
export function buildPlainDressing({ world, track, keep }) {
  const kit = createKit({ world, track, keep });
  buildBarriers(kitPart(kit, KIT_PARTS.BARRIERS), []);
  return { update() {} };
}
