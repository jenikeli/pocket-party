// The Test track's dressing (M7d2): the track where the kit's pieces (kit/) are shown, so they can be looked at
// on the iPad before a course depends on them. Its road and gate are the kit's, in Mario Kart Stadium's colours
// (a yellow edge line, black and white checks, red and white curbs, a yellow gate); every barrier style stands somewhere on its walls,
// decks beside the road carry a grandstand, a paddock and the rest of the props, as test-track-layout.js
// places them, turn boards stand round its corners, and concrete piers hold it all up. Used by scenery.js.

import { buildKitRoad } from './kit/road.js';
import { buildBarriers } from './kit/barriers.js';
import { buildStartGate } from './kit/start-gate.js';
import { buildStartLights } from './kit/start-lights.js';
import { buildPlatforms } from './kit/platform.js';
import { buildProps, spotFrame } from './kit/props.js';
import { buildGrandstand } from './kit/grandstand.js';
import { buildBunting } from './kit/bunting.js';
import { buildSupports } from './kit/supports.js';
import { buildTurnBoards } from './kit/turn-boards.js';
import { turnBoardSpots } from './kit/layout-rules.js';
import { createKit } from './kit/kit.js';
import { BARRIER_RUNS, PLATFORMS, GRANDSTAND, BUNTING, PROPS } from './test-track-layout.js';

const ROAD_THEME = Object.freeze({ asphalt: 0xffffff, edgeLine: 0xffc82a, curb: [0xd8302a, 0xf4f4f0], checks: [0xf4f4f0, 0x1a1a1e] });
const GATE_THEME = Object.freeze({ post: 0xf4f4f0, band: 0xd8302a, body: 0xffc61e, background: '#ffd21e', stripe: '#d8302a', outline: '#a3141a' });

export function buildTestTrackRoad(track) {
  return buildKitRoad(track, ROAD_THEME);
}

// `world` is the group to add to, `sea` the sea's mesh (its height is where pillars reach down to), `keep(thing)`
// registers what must be disposed with the world. Returns { update(dt, race) }.
export function buildTestTrackScenery({ world, track, sea, keep }) {
  const kit = createKit({ world, track, keep });
  buildSupports(kit, sea.position.y, []);
  buildBarriers(kit, BARRIER_RUNS);
  buildTurnBoards(kit, turnBoardSpots(track, BARRIER_RUNS));
  buildPlatforms(kit, PLATFORMS, sea.position.y);
  buildProps(kit, PROPS);
  buildBunting(kit, BUNTING);
  const startLights = buildStartLights(kit, buildStartGate(kit, GATE_THEME));
  const grandstand = buildGrandstand(GRANDSTAND.length, kit);
  grandstand.object.matrixAutoUpdate = false;
  grandstand.object.matrix.copy(spotFrame(track, GRANDSTAND));
  world.add(grandstand.object);
  return {
    update(dt, race) {
      startLights.update(race);
      grandstand.update(dt);
    },
  };
}
