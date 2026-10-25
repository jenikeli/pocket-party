// The kit's barriers (M7d2): what stands on each of the kart rules' walls, in the style the course's layout
// chooses for that stretch (kit/layout-rules.js). Each style is its own piece with an add(segment, side) for
// every walled station segment and meshes() at the end, so a whole style draws in a few draw calls however much
// of the course it covers. Drawing only: the walls themselves are the rules' (kart-walls.js). Used by the
// courses' dressings.

import { BARRIER_STYLES, barrierStyleAt } from './layout-rules.js';
import { createPlainWall, createAntiGravityWall } from './plain-wall.js';
import { createSponsorWall } from './sponsor-wall.js';
import { createGuardrail } from './guardrail.js';
import { createStripedRail } from './striped-rail.js';
import { createRailFence } from './rail-fence.js';
import { createBlockCurbs } from './block-curbs.js';

const STYLE_BUILDERS = {
  [BARRIER_STYLES.WALL]: createPlainWall,
  [BARRIER_STYLES.ANTI_GRAVITY_WALL]: createAntiGravityWall,
  [BARRIER_STYLES.SPONSOR_WALL]: createSponsorWall,
  [BARRIER_STYLES.GUARDRAIL]: createGuardrail,
  [BARRIER_STYLES.STRIPED_RAIL]: createStripedRail,
  [BARRIER_STYLES.RAIL_FENCE]: createRailFence,
  [BARRIER_STYLES.BLOCK_CURBS]: createBlockCurbs,
};

// Adds every barrier to the world; `kit` is what kit/kit.js makes for the course, `runs` the course's choice of
// styles (see barrierStyleAt).
export function buildBarriers(kit, runs) {
  const { world, track } = kit;
  const styles = new Map();
  track.stations.forEach((station, index) => {
    const segment = { station, next: track.stations[(index + 1) % track.stations.length], index };
    for (const side of [-1, 1]) {
      if (station.gap || !(side > 0 ? station.wallRight : station.wallLeft)) {
        continue;
      }
      const name = barrierStyleAt(runs, station, side);
      if (!styles.has(name)) {
        styles.set(name, STYLE_BUILDERS[name](kit));
      }
      styles.get(name).add(segment, side);
    }
  });
  for (const style of styles.values()) {
    world.add(...style.meshes());
  }
}
