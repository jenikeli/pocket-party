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
import { turnBoardSpots, KIT_PARTS } from './kit/layout-rules.js';
import { createKit, kitPart } from './kit/kit.js';
import { BARRIER_RUNS, PLATFORMS, GRANDSTAND, BUNTING, PROPS } from './test-track-layout.js';

const ROAD_THEME = Object.freeze({ asphalt: 0xffffff, edgeLine: 0xffc82a, curb: [0xd8302a, 0xf4f4f0], checks: [0xf4f4f0, 0x1a1a1e] });
const GATE_THEME = Object.freeze({ post: 0xf4f4f0, band: 0xd8302a, body: 0xffc61e, background: '#ffd21e', stripe: '#d8302a', outline: '#a3141a' });

// `photoAsphalt` is the photo-scanned asphalt's textures (photo-asphalt.js).
export function buildTestTrackRoad(track, photoAsphalt) {
  return buildKitRoad(track, ROAD_THEME, photoAsphalt);
}

// `world` is the group to add to, `sea` the sea's mesh (its height is where pillars reach down to), `keep(thing)`
// registers what must be disposed with the world. Returns { update(dt, race) }.
export function buildTestTrackScenery({ world, track, sea, keep }) {
  const kit = createKit({ world, track, keep });
  buildSupports(kitPart(kit, KIT_PARTS.SUPPORTS), sea.position.y, []);
  const barriers = kitPart(kit, KIT_PARTS.BARRIERS);
  buildBarriers(barriers, BARRIER_RUNS);
  buildTurnBoards(barriers, turnBoardSpots(track, BARRIER_RUNS));
  buildPlatforms(kitPart(kit, KIT_PARTS.DECKS), PLATFORMS, sea.position.y);
  const props = kitPart(kit, KIT_PARTS.PROPS);
  buildProps(props, PROPS);
  buildBunting(props, BUNTING);
  const gate = kitPart(kit, KIT_PARTS.GATE);
  const startLights = buildStartLights(gate, buildStartGate(gate, GATE_THEME));
  const grandstand = buildGrandstand(GRANDSTAND.length, props);
  grandstand.object.matrixAutoUpdate = false;
  grandstand.object.matrix.copy(spotFrame(track, GRANDSTAND));
  props.world.add(grandstand.object);
  return {
    update(dt, race) {
      startLights.update(race);
      grandstand.update(dt);
    },
  };
}
