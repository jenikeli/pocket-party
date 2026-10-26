// Unit tests for Seaside Skyway's dressing (M7d3) that run without a browser: its trackside layout
// (seaside-layout.js: every deck, prop and string of bunting stands where it can, the two halves are themed, the
// trusses hold up the sky half), where its turn boards stand (kit/layout-rules.js), and its surroundings
// (seaside-landmarks.js): no island, hut, boat, cloud, balloon or airship reaches the road or the space above it,
// boats sail in open water, and the islands' outlines and beaches are as the drawing expects.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BARRIER_RUNS, TRUSS_RUNS, PLATFORMS, GRANDSTAND, BUNTING, PROPS } from '../../host/games/kart-3d/seaside-layout.js';
import {
  BEACH_ISLANDS,
  LIGHTHOUSE,
  KOOPA_SHELL,
  BOATS,
  FLOATING_ISLANDS,
  BACKDROP_CLIFFS,
  NEAR_CLOUDS,
  BALLOONS,
  AIRSHIP_PATH,
  shoreRadius,
  islandHeightAt,
} from '../../host/games/kart-3d/seaside-landmarks.js';
import { BARRIER_STYLES, barrierStyleAt, turnBoardSpots, sideSign } from '../../host/games/kart-3d/kit/layout-rules.js';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { addScaled } from '../../host/games/kart-3d/vector.js';
import { checkDecks, checkProps, checkBunting, checkDeckJoins, checkTurnBoards } from '../helpers/kit-layout-checks.js';

const seaside = buildTrack(SEASIDE_SKYWAY);
// scenery.js's sea level for the seaside scenery.
const SEA_LEVEL = -14;
// An outline wobbles out to at most 1.19 times its radius (shoreRadius; the floating islands' lathe is the same).
const WOBBLE = 1.19;
// What karts and their cameras need above the road, and what hangs under it (the road, a deck, a girder).
const ABOVE_ROAD = 5;
const BELOW_ROAD = 3;
// How far beside the edge of the ground the road's own things reach where no deck is: the barriers' ledge.
const LEDGE = 1;
// The tallest palm (size 1.15) and round tree (size 1.25).
const PALM_HEIGHT = 10.5;
const TREE_HEIGHT = 7.2;

// Points across the road, its sides and any deck beside it at every station, every unit: wherever the road
// is, rolled or not.
const roadPoints = seaside.stations.flatMap((station) => {
  const beyond = (side) => PLATFORMS.find((deck) => sideSign(deck.side) === side && station.s >= deck.fromS && station.s < deck.toS)?.depth ?? LEDGE;
  const from = -(station.halfWidth + station.shoulderLeft + beyond(-1));
  const to = station.halfWidth + station.shoulderRight + beyond(1);
  const points = [];
  for (let lateral = from; lateral <= to; lateral += 1) {
    points.push(addScaled(station.point, station.right, lateral));
  }
  return points;
});

// Whether an upright cylinder at (x, z), `reach` round, from `bottom` to `top`, stays clear of the road: no road
// point under or over it within the room the road needs.
function clearOfRoad({ x, z, reach, bottom, top }) {
  return roadPoints.every((point) => Math.hypot(point.x - x, point.z - z) > reach || bottom > point.y + ABOVE_ROAD || top < point.y - BELOW_ROAD);
}

test('Seaside Skyway\'s decks run outside walls on level road, and its props, grandstand and bunting stand where they can', () => {
  checkDecks(seaside, PLATFORMS);
  checkProps(seaside, PROPS, PLATFORMS, GRANDSTAND);
  checkTurnBoards(seaside, turnBoardSpots(seaside, BARRIER_RUNS), PROPS);
  checkDeckJoins(seaside, PLATFORMS);
  checkBunting(seaside, BUNTING);
  assert.equal(GRANDSTAND.side, 'left');
  assert.ok(Math.abs(GRANDSTAND.s - seaside.startLine) < GRANDSTAND.length / 2, 'the grandstand looks at the start line');
});

test('the seaside half has wooden fences, striped rails, block curbs, sponsor walls and a promenade railing; the sky half steel guardrails', () => {
  const styles = (fromS, toS) => {
    const shown = new Set();
    for (const station of seaside.stations.filter((candidate) => candidate.s >= fromS && candidate.s < toS && !candidate.gap)) {
      for (const side of [-1, 1]) {
        if (side > 0 ? station.wallRight : station.wallLeft) {
          shown.add(barrierStyleAt(BARRIER_RUNS, station, side));
        }
      }
    }
    return shown;
  };
  const { SPONSOR_WALL, STRIPED_RAIL, RAIL_FENCE, BLOCK_CURBS, PROMENADE_RAIL, GUARDRAIL, WALL } = BARRIER_STYLES;
  for (const [fromS, toS] of [[0, 340], [1076, seaside.length]]) {
    const seasideStyles = [SPONSOR_WALL, STRIPED_RAIL, RAIL_FENCE, BLOCK_CURBS, PROMENADE_RAIL];
    assert.ok([...styles(fromS, toS)].every((style) => seasideStyles.includes(style)), `the seaside from ${fromS}`);
    assert.ok(styles(fromS, toS).has(PROMENADE_RAIL), `a promenade railing in the seaside from ${fromS}`);
  }
  assert.deepEqual([...styles(340, 700)], [GUARDRAIL], 'up the climb, round the sweeper and over the jump');
  assert.ok(![...styles(0, seaside.length)].includes(WALL), 'every wall outside the anti-gravity section has a style');
});

test('trusses hold up the sky half from the foot of the climb to the landing', () => {
  assert.deepEqual(TRUSS_RUNS, [{ fromS: 340, toS: 700 }]);
  const climbFoot = seaside.stations.find((station) => station.s >= 340);
  assert.ok(climbFoot.point.y < 0.5, 'the climb starts after the run does');
});

test('turn boards stand round the outside of corners, behind low barriers only, pointing the way the road turns', () => {
  const spots = turnBoardSpots(seaside, BARRIER_RUNS);
  for (const spot of spots) {
    const station = seaside.stations[spot.index];
    assert.equal(spot.side, spot.turnsRight ? -1 : 1, 'on the outside');
    assert.ok(spot.side > 0 ? station.wallRight : station.wallLeft, 'on a wall');
    assert.ok(!station.gap && !station.antiGravity && station.normal.y > 0.95, 'on level, normal road');
    const style = barrierStyleAt(BARRIER_RUNS, station, spot.side);
    const lowBarriers = [BARRIER_STYLES.GUARDRAIL, BARRIER_STYLES.STRIPED_RAIL, BARRIER_STYLES.RAIL_FENCE, BARRIER_STYLES.PROMENADE_RAIL];
    assert.ok(lowBarriers.includes(style), `not behind a ${style}`);
  }
  const near = (s) => spots.filter((spot) => Math.abs(seaside.stations[spot.index].s - s) < 30);
  assert.ok(near(190).length > 0 && near(190).every((spot) => spot.turnsRight), 'the first corner, right');
  assert.ok(near(500).length > 0 && near(500).every((spot) => spot.turnsRight), 'the sweeper, right');
  assert.ok(near(735).length > 0 && near(735).every((spot) => !spot.turnsRight), 'the hairpin, left');
  assert.equal(near(600).length, 0, 'none on the bridge, which is straight');
  assert.equal(near(905).length, 0, 'none on the anti-gravity wall');
});

test('nothing round Seaside Skyway reaches the road or the room above it', () => {
  for (const island of BEACH_ISLANDS) {
    const top = SEA_LEVEL + island.height + PALM_HEIGHT;
    assert.ok(clearOfRoad({ x: island.x, z: island.z, reach: island.radius * WOBBLE + 4, bottom: SEA_LEVEL, top }), `the beach island at ${island.x}, ${island.z}, its palms and huts`);
  }
  const lighthouseTop = SEA_LEVEL + LIGHTHOUSE.height + LIGHTHOUSE.tower + 7;
  assert.ok(clearOfRoad({ x: LIGHTHOUSE.x, z: LIGHTHOUSE.z, reach: LIGHTHOUSE.radius * WOBBLE, bottom: SEA_LEVEL, top: lighthouseTop }), 'the lighthouse');
  assert.ok(lighthouseTop > 6, 'the lighthouse\'s dome shows above the road');
  assert.ok(clearOfRoad({ x: KOOPA_SHELL.x, z: KOOPA_SHELL.z, reach: KOOPA_SHELL.radius * 1.1, bottom: SEA_LEVEL, top: SEA_LEVEL + KOOPA_SHELL.radius }), 'the Koopa shell');
  for (const boat of BOATS) {
    assert.ok(clearOfRoad({ x: boat.x, z: boat.z, reach: 3.5, bottom: SEA_LEVEL, top: SEA_LEVEL + 7.5 }), `the boat at ${boat.x}, ${boat.z}`);
  }
  for (const island of FLOATING_ISLANDS) {
    const spot = { x: island.x, z: island.z, reach: island.radius * WOBBLE * 1.03, bottom: island.y - 1.2 * island.radius, top: island.y + TREE_HEIGHT };
    assert.ok(clearOfRoad(spot), `the floating island at ${island.x}, ${island.z}`);
  }
  for (const cliff of BACKDROP_CLIFFS) {
    assert.ok(clearOfRoad({ x: cliff.x, z: cliff.z, reach: cliff.radius * WOBBLE * 1.08 + 60, bottom: SEA_LEVEL, top: SEA_LEVEL + cliff.height * 1.05 }), 'a backdrop cliff, far off');
  }
  for (const cloud of NEAR_CLOUDS) {
    assert.ok(clearOfRoad({ x: cloud.x, z: cloud.z, reach: 16.5 * cloud.size, bottom: cloud.y, top: cloud.y + 7.5 * cloud.size }), `the cloud at ${cloud.x}, ${cloud.z}`);
  }
  for (const balloon of BALLOONS) {
    assert.ok(clearOfRoad({ x: balloon.x, z: balloon.z, reach: 4.5, bottom: balloon.y - 3, top: balloon.y + 14 }), `the balloon at ${balloon.x}, ${balloon.z}`);
  }
  const highestRoad = Math.max(...seaside.stations.map((station) => station.point.y + station.halfWidth * Math.abs(station.right.y)));
  assert.ok(AIRSHIP_PATH.height - 8 > highestRoad + ABOVE_ROAD + 20, 'the airship flies well above the whole course');
});

test('boats sail in open water, clear of every island', () => {
  for (const boat of BOATS) {
    for (const island of [...BEACH_ISLANDS, LIGHTHOUSE]) {
      assert.ok(Math.hypot(boat.x - island.x, boat.z - island.z) > island.radius * WOBBLE * 1.15 + 4, `the boat at ${boat.x}, ${boat.z} is off the island at ${island.x}, ${island.z}`);
    }
    assert.ok(Math.hypot(boat.x - KOOPA_SHELL.x, boat.z - KOOPA_SHELL.z) > KOOPA_SHELL.radius + 4, `the boat at ${boat.x}, ${boat.z} is off the shell`);
  }
});

test('an island\'s shore wobbles round its radius, and its beach rises from the shallows to its top', () => {
  const island = { x: 30, z: -10, radius: 20, height: 6 };
  for (let angle = 0; angle < 2 * Math.PI; angle += 0.05) {
    const radius = shoreRadius(island, angle);
    assert.ok(radius > island.radius * (2 - WOBBLE) && radius < island.radius * WOBBLE);
  }
  assert.notEqual(shoreRadius(island, 0), shoreRadius({ ...island, x: 31 }, 0), 'each island has its own outline');
  assert.equal(islandHeightAt(island, 0), 6);
  assert.ok(Math.abs(islandHeightAt(island, 0.8) - 1) < 1e-9, 'the beach is 1 high where the hill starts');
  assert.equal(islandHeightAt(island, 1), 0, 'the waterline');
  assert.ok(islandHeightAt(island, 1.2) < 0 && islandHeightAt(island, 2) >= -2.4, 'under the shallows, a gentle shelf');
  for (let share = 0.05; share <= 1.5; share += 0.05) {
    assert.ok(islandHeightAt(island, share) <= islandHeightAt(island, share - 0.05) + 1e-9, 'it only falls going out');
  }
});
