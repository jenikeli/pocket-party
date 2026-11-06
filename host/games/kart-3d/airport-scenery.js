// Palm Bay Airport's look (M9): its road and its dressing, for scenery.js. The road is the kit's in airport
// colours (dark asphalt, a white edge line, orange and white curbs), set into the airfield's ground (task D of
// docs/queue.md): the land, paving and sea bed of airport-ground.js's plan (kit/terrain.js), the runway's and
// taxiways' paint, the cutting's retaining walls and the tunnel under the runway, the seawalls, and the shallows
// and foam along the shore. For now the barriers stand in their plain wall, and the spin-boost posts in the hangar's
// ring; the rest of the dressing is task M's.

import { buildKitRoad } from './kit/road.js';
import { buildBarriers } from './kit/barriers.js';
import { buildSpinPosts } from './kit/spin-post.js';
import { buildTerrain } from './kit/terrain.js';
import { buildRunwayPaint } from './kit/runway-paint.js';
import { buildRetainingWalls } from './kit/retaining-wall.js';
import { buildTunnel } from './kit/tunnel.js';
import { buildSeawalls } from './kit/seawall.js';
import { buildShoreWater } from './kit/shore-water.js';
import { dressSea } from './kit/sea.js';
import { createKit, kitPart } from './kit/kit.js';
import { KIT_PARTS } from './kit/layout-rules.js';

const ROAD_THEME = Object.freeze({ asphalt: 0xffffff, edgeLine: 0xf4f4f0, curb: [0xf07a1e, 0xf4f4f0], checks: [0xf4f4f0, 0x1a1a1e] });

// `photoAsphalt` is the photo-scanned asphalt's textures (photo-asphalt.js). The road lies on the ground, so it
// has no supports.
export function buildAirportRoad(track, photoAsphalt) {
  return buildKitRoad(track, ROAD_THEME, photoAsphalt);
}

// Same arguments and return as every course's buildDressing (scenery.js). The ground, its paint and the water by
// the shore are the course's surroundings; the walls that hold the ground back or the sea out, and the tunnel,
// are its supports.
export function buildAirportScenery({ world, track, sea, keep }) {
  const kit = createKit({ world, track, keep });
  const seaLevel = sea.position.y;
  const surroundings = kitPart(kit, KIT_PARTS.SURROUNDINGS);
  buildTerrain(surroundings);
  buildRunwayPaint(surroundings);
  const shore = buildShoreWater(surroundings, seaLevel);
  const water = dressSea(sea, keep);
  const supports = kitPart(kit, KIT_PARTS.SUPPORTS);
  buildRetainingWalls(supports);
  buildTunnel(supports);
  buildSeawalls(supports, seaLevel);
  buildBarriers(kitPart(kit, KIT_PARTS.BARRIERS), []);
  const props = kitPart(kit, KIT_PARTS.PROPS);
  const spinPosts = buildSpinPosts(props);
  props.world.add(spinPosts.object);
  return {
    update(dt, race) {
      spinPosts.update(dt, race);
      shore.update(dt);
      water.update(dt);
    },
  };
}
