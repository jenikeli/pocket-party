// Palm Bay Airport's look (M9): its road and its dressing, for scenery.js. For now a stand-in: the kit's road in
// airport colours (a white edge line, orange and white curbs) and only the barriers (plain-scenery.js). The
// airfield's ground (task D of docs/queue.md) and the dressing (task M) replace both.

import { buildKitRoad } from './kit/road.js';
import { buildPlainDressing } from './plain-scenery.js';

const ROAD_THEME = Object.freeze({ asphalt: 0xffffff, edgeLine: 0xf4f4f0, curb: [0xf07a1e, 0xf4f4f0], checks: [0xf4f4f0, 0x1a1a1e] });

// `photoAsphalt` is the photo-scanned asphalt's textures (photo-asphalt.js).
export function buildAirportRoad(track, photoAsphalt) {
  return buildKitRoad(track, ROAD_THEME, photoAsphalt);
}

// Same arguments and return as every course's buildDressing (scenery.js).
export function buildAirportScenery(options) {
  return buildPlainDressing(options);
}
