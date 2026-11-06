// Palm Bay Airport's look (M9): its road and its dressing, for scenery.js. The road is the kit's in airport
// colours (dark asphalt, a white edge line, orange and white curbs), set into the airfield's ground (task D of
// docs/queue.md): the land, paving and sea bed of airport-ground.js's plan (kit/terrain.js), the runway's and
// taxiways' paint, the cutting's retaining walls and the tunnel under the runway, the seawalls, and the shallows
// and foam along the shore. Its dressing (task M): the airport's barriers (airport-layout.js) with turn boards round
// the corners, the start gate in the airport's colours, the props along the road (airport-props.js), the spin-boost
// posts in the hangar's ring, and the landmarks: buildings, planes, the conveyor, islands and boats
// (airport-landmarks.js).

import { buildKitRoad } from './kit/road.js';
import { buildBarriers } from './kit/barriers.js';
import { buildSpinPosts } from './kit/spin-post.js';
import { buildTurnBoards } from './kit/turn-boards.js';
import { buildStartGate } from './kit/start-gate.js';
import { buildStartLights } from './kit/start-lights.js';
import { buildProps } from './kit/props.js';
import { buildTerrain } from './kit/terrain.js';
import { buildRunwayPaint } from './kit/runway-paint.js';
import { buildRetainingWalls } from './kit/retaining-wall.js';
import { buildTunnel } from './kit/tunnel.js';
import { buildSeawalls } from './kit/seawall.js';
import { buildShoreWater } from './kit/shore-water.js';
import { dressSea } from './kit/sea.js';
import { createKit, kitPart } from './kit/kit.js';
import { KIT_PARTS, turnBoardSpots } from './kit/layout-rules.js';
import { BARRIER_RUNS } from './airport-layout.js';
import { PROPS } from './airport-props.js';
import { buildAirportLandmarks } from './airport-landmarks.js';
import { CORAL, NAVY } from './kit/hangar-maps.js';

const ROAD_THEME = Object.freeze({ asphalt: 0xffffff, edgeLine: 0xf4f4f0, curb: [0xf07a1e, 0xf4f4f0], checks: [0xf4f4f0, 0x1a1a1e] });
// The airport's own colours, as on its terminal and hangars: a coral sign with a sun-yellow stripe and navy outline
// on white posts banded in navy.
const GATE_THEME = Object.freeze({ post: 0xf6f6f2, band: NAVY, body: CORAL, background: '#f0532d', stripe: '#ffc531', outline: '#1e3566' });

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
  const barriers = kitPart(kit, KIT_PARTS.BARRIERS);
  buildBarriers(barriers, BARRIER_RUNS);
  buildTurnBoards(barriers, turnBoardSpots(track, BARRIER_RUNS));
  const gate = kitPart(kit, KIT_PARTS.GATE);
  const startLights = buildStartLights(gate, buildStartGate(gate, GATE_THEME));
  const props = kitPart(kit, KIT_PARTS.PROPS);
  buildProps(props, PROPS);
  const spinPosts = buildSpinPosts(props);
  props.world.add(spinPosts.object);
  const landmarks = buildAirportLandmarks(kit, seaLevel);
  return {
    update(dt, race) {
      startLights.update(race);
      spinPosts.update(dt, race);
      landmarks.update(dt);
      shore.update(dt);
      water.update(dt);
    },
  };
}
