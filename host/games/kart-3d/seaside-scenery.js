// Seaside Skyway's look (M7d3), built from the kit (kit/): its road in harbour colours (a white edge line,
// coral and pale teal checks, coral and white curbs, as at MK8DX's Toad Harbor), the barriers, decks, props,
// grandstand, gate and bunting that seaside-layout.js places, turn boards round its corners, piers and trusses
// holding the road up, and round it the sea (seaside-surroundings.js) and the sky (seaside-sky.js). Used by
// scenery.js.

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
import { buildSeasideSurroundings } from './seaside-surroundings.js';
import { buildSeasideSky } from './seaside-sky.js';
import { BARRIER_RUNS, TRUSS_RUNS, PLATFORMS, GRANDSTAND, BUNTING, PROPS } from './seaside-layout.js';

const ROAD_THEME = Object.freeze({ asphalt: 0xfff6ec, edgeLine: 0xf6f6f2, curb: [0xff6a4f, 0xf6f6f2], checks: [0xff7a68, 0xa6ebe4] });
// A sea-blue sign with a coral stripe on white posts banded in blue.
const GATE_THEME = Object.freeze({ post: 0xf6f6f2, band: 0x1f7fd8, body: 0x1f8fe0, background: '#2aa8f0', stripe: '#ff6a4f', outline: '#0a3f8a' });

export function buildSeasideRoad(track) {
  return buildKitRoad(track, ROAD_THEME);
}

// `world` is the group to add to, `sea` the sea's mesh (its height is the sea level), `keep(thing)` registers
// what must be disposed with the world. Returns { update(dt, race) }.
export function buildSeasideScenery({ world, track, sea, keep }) {
  const kit = createKit({ world, track, keep });
  const seaLevel = sea.position.y;
  buildSupports(kit, seaLevel, TRUSS_RUNS);
  buildBarriers(kit, BARRIER_RUNS);
  buildTurnBoards(kit, turnBoardSpots(track, BARRIER_RUNS));
  buildPlatforms(kit, PLATFORMS, seaLevel);
  buildProps(kit, PROPS);
  buildBunting(kit, BUNTING);
  const startLights = buildStartLights(kit, buildStartGate(kit, GATE_THEME));
  const grandstand = buildGrandstand(GRANDSTAND.length, kit);
  grandstand.object.matrixAutoUpdate = false;
  grandstand.object.matrix.copy(spotFrame(track, GRANDSTAND));
  world.add(grandstand.object);
  const surroundings = buildSeasideSurroundings(kit, sea);
  const sky = buildSeasideSky(kit, seaLevel, middleOf(track));
  return {
    update(dt, race) {
      startLights.update(race);
      grandstand.update(dt);
      surroundings.update(dt);
      sky.update(dt);
    },
  };
}

// The course's middle seen from above: the average of its stations.
function middleOf(track) {
  const sum = track.stations.reduce((total, station) => ({ x: total.x + station.point.x, z: total.z + station.point.z }), { x: 0, z: 0 });
  return { x: sum.x / track.stations.length, z: sum.z / track.stations.length };
}
