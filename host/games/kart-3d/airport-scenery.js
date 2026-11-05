// Palm Bay Airport's look (M9): its road and its dressing, for scenery.js. For now a stand-in: the kit's road in
// airport colours (a white edge line, orange and white curbs), the barriers in their plain wall and the spin-boost
// posts in the hangar's ring. The airfield's ground (task D of docs/queue.md) and the dressing (task M) replace it.

import { buildKitRoad } from './kit/road.js';
import { buildBarriers } from './kit/barriers.js';
import { buildSpinPosts } from './kit/spin-post.js';
import { createKit, kitPart } from './kit/kit.js';
import { KIT_PARTS } from './kit/layout-rules.js';

const ROAD_THEME = Object.freeze({ asphalt: 0xffffff, edgeLine: 0xf4f4f0, curb: [0xf07a1e, 0xf4f4f0], checks: [0xf4f4f0, 0x1a1a1e] });

// `photoAsphalt` is the photo-scanned asphalt's textures (photo-asphalt.js).
export function buildAirportRoad(track, photoAsphalt) {
  return buildKitRoad(track, ROAD_THEME, photoAsphalt);
}

// Same arguments and return as every course's buildDressing (scenery.js).
export function buildAirportScenery({ world, track, keep }) {
  const kit = createKit({ world, track, keep });
  buildBarriers(kitPart(kit, KIT_PARTS.BARRIERS), []);
  const props = kitPart(kit, KIT_PARTS.PROPS);
  const spinPosts = buildSpinPosts(props);
  props.world.add(spinPosts.object);
  return {
    update(dt, race) {
      spinPosts.update(dt, race);
    },
  };
}
