// Unit tests for Palm Bay Airport's dressing layout (M9, airport-layout.js and airport-props.js), which run without a
// browser: the barrier runs cover every wall outside the anti-gravity ring, every prop stands on the ground beside
// the road (level with it, not in the sea or the cutting) clear of the road, the barriers, the turn boards, the
// other props and the landmarks, every landmark's footprint is clear of the road, and the islands and boats float
// in open sea, away from the road.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { PALM_BAY_AIRPORT } from '../../host/games/kart-3d/palm-bay-airport.js';
import {
  BARRIER_RUNS, TERMINAL, GATE_LIVERIES, APRON_AIRLINERS, PROP_PLANES, CONTROL_TOWER, HANGARS, CONVEYOR, TAKE_OFF,
  ISLANDS, BOATS, gatePlaneSpot, toWorld,
} from '../../host/games/kart-3d/airport-layout.js';
import { PROPS } from '../../host/games/kart-3d/airport-props.js';
import { PROP_REACH, BARRIER_STYLES, barrierStyleAt, sideSign, turnBoardSpots } from '../../host/games/kart-3d/kit/layout-rules.js';
import {
  besideRoad, ribbonHeight, groundHeightAt, hasRibbon, inSea, inRect, underTunnel, CUTTING_HOLE, RIBBON_WIDTH,
} from '../../host/games/kart-3d/airport-ground.js';
import { checkTurnBoards, stationAt } from '../helpers/kit-layout-checks.js';

// The kit imports Three.js by its bare name, which the browser's import map points at the vendored copy; a resolve
// hook does the same here (as in kart-3d-airport-landmarks.test.js).
const threeFolder = pathToFileURL(new URL('../../host/vendor/three-0.186.1/', import.meta.url).pathname).href;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three') {
      return next(`${threeFolder}three.module.js`, context);
    }
    if (specifier.startsWith('three/addons/')) {
      return next(`${threeFolder}addons/${specifier.slice('three/addons/'.length)}`, context);
    }
    return next(specifier, context);
  },
});
const { terminalFootprint, terminalGates } = await import('../../host/games/kart-3d/kit/terminal.js');
const { CONTROL_TOWER_FOOTPRINT } = await import('../../host/games/kart-3d/kit/control-tower.js');
const { AIRLINER_FOOTPRINT, AIRLINER_DOOR } = await import('../../host/games/kart-3d/kit/airliner.js');
const { PROP_PLANE_FOOTPRINT } = await import('../../host/games/kart-3d/kit/prop-plane.js');
const { rockIslandFootprint } = await import('../../host/games/kart-3d/kit/rock-island.js');

const track = buildTrack(PALM_BAY_AIRPORT);
// The barriers' ledge reaches this far beyond the edge of the ground, away from the turn boards.
const LEDGE = 1;
// A prop's foot may stand this much above or below the ground under it.
const GROUND_TOLERANCE = 0.3;
// What karts need above the road, and the road's depth under it, where something passes over or under it.
const ABOVE_ROAD = 5;
const BELOW_ROAD = 3;
// The course's baked shade darkens anything within about this of the road (task L's note).
const SHADE_REACH = 20;

// Points on the road, its shoulders and the barriers' ledge, every unit across each station: wherever karts are.
const roadPoints = track.stations.filter((station) => !station.gap).flatMap((station) => {
  const points = [];
  for (let lateral = -(station.halfWidth + station.shoulderLeft + LEDGE); lateral <= station.halfWidth + station.shoulderRight + LEDGE; lateral += 1) {
    points.push({ x: station.point.x + station.right.x * lateral, y: station.point.y + station.right.y * lateral, z: station.point.z + station.right.z * lateral });
  }
  return points;
});

// Where a prop spot stands in the world: { x, y, z } and its station.
function propPlace(spot) {
  const station = stationAt(track, spot.s);
  return { ...besideRoad(station, sideSign(spot.side), spot.out), station };
}

// Every landmark's footprint as a box in its own frame ({ minX, maxX, minZ, maxZ }) at its spot, from `bottom` to
// `top` (world heights).
const box = (minX, maxX, halfZ) => ({ minX, maxX, minZ: -halfZ, maxZ: halfZ });
const gateSpots = terminalGates(TERMINAL.length).map((gate) => gatePlaneSpot(TERMINAL, gate, AIRLINER_DOOR));
const airlinerBox = box(AIRLINER_FOOTPRINT.minX, AIRLINER_FOOTPRINT.maxX, AIRLINER_FOOTPRINT.halfWidth);
const terminalBox = terminalFootprint(TERMINAL.length);
const towerRadius = CONTROL_TOWER_FOOTPRINT.radius;
const LANDMARKS = [
  { name: 'terminal', spot: TERMINAL, area: terminalBox, top: terminalBox.height },
  ...gateSpots.map((spot, index) => ({ name: `the ${GATE_LIVERIES[index]} airliner`, spot, area: airlinerBox, top: AIRLINER_FOOTPRINT.height })),
  ...APRON_AIRLINERS.map((spot) => ({ name: 'the apron airliner', spot, area: airlinerBox, top: AIRLINER_FOOTPRINT.height })),
  ...PROP_PLANES.map((spot) => ({ name: 'a prop plane', spot, area: box(PROP_PLANE_FOOTPRINT.minX, PROP_PLANE_FOOTPRINT.maxX, PROP_PLANE_FOOTPRINT.halfWidth), top: PROP_PLANE_FOOTPRINT.height })),
  { name: 'control tower', spot: CONTROL_TOWER, area: box(-towerRadius, towerRadius, towerRadius), top: CONTROL_TOWER_FOOTPRINT.height },
  // A small hangar's walls, with its roof's overhang, trim and the open door leaf in front.
  ...HANGARS.map((hangar) => ({ name: `the ${hangar.airline} hangar`, spot: hangar, area: box(-hangar.depth / 2 - 0.6, hangar.depth / 2 + 1.3, hangar.width / 2 + 1), top: 14 })),
  // The conveyor stands under the jump's gap (no road there): its housings and frame, 3.4 tall.
  { name: 'conveyor', spot: CONVEYOR, area: { minX: -2.6, maxX: 2.6, minZ: -CONVEYOR.length / 2, maxZ: CONVEYOR.length / 2 }, top: 3.4 },
];

// The point (x, z) in the frame of a landmark at `spot`.
function toLocal(spot, x, z) {
  const [cos, sin] = [Math.cos(spot.heading), Math.sin(spot.heading)];
  const [dx, dz] = [x - spot.x, z - spot.z];
  return { x: dx * cos - dz * sin, z: dx * sin + dz * cos };
}

const inside = ({ spot, area }, x, z, margin = 0) => {
  const local = toLocal(spot, x, z);
  return local.x > area.minX - margin && local.x < area.maxX + margin && local.z > area.minZ - margin && local.z < area.maxZ + margin;
};

test('the walls outside the anti-gravity ring stand in the airport\'s styles, one style a stretch a side', () => {
  const airport = [BARRIER_STYLES.APRON_RAIL, BARRIER_STYLES.PADDED_BARRIER, BARRIER_STYLES.RAIL_FENCE];
  for (const station of track.stations.filter((each) => each.wallLeft && each.wallRight)) {
    for (const side of [-1, 1]) {
      const style = barrierStyleAt(BARRIER_RUNS, station, side);
      const expected = station.antiGravity ? [BARRIER_STYLES.ANTI_GRAVITY_WALL] : airport;
      assert.ok(expected.includes(style), `${style} at ${station.s.toFixed(0)}`);
    }
  }
  for (const run of BARRIER_RUNS) {
    const others = BARRIER_RUNS.filter((other) => other !== run && (other.side === 'both' || run.side === 'both' || other.side === run.side));
    assert.ok(others.every((other) => other.toS <= run.fromS || other.fromS >= run.toS), `the run from ${run.fromS} overlaps another`);
  }
});

test('every prop stands on the ground beside the road, level with it, clear of the barrier and the road', () => {
  for (const spot of PROPS) {
    const reach = PROP_REACH[spot.piece];
    const label = `the ${spot.piece} at ${spot.s} ${spot.side}`;
    assert.ok(reach !== undefined, `${label} is a prop the kit knows`);
    assert.ok(spot.out - reach >= LEDGE, `${label} is clear of the barrier`);
    const side = sideSign(spot.side);
    const { station } = propPlace(spot);
    const next = track.stations[(track.stations.indexOf(station) + 1) % track.stations.length];
    assert.ok(hasRibbon(station, next), `${label} stands where the ground meets the road`);
    for (const out of [spot.out - reach, spot.out, spot.out + reach]) {
      const point = besideRoad(station, side, out);
      const ground = out <= RIBBON_WIDTH ? ribbonHeight(station, side, out) : groundHeightAt(point.x, point.z);
      assert.ok(Math.abs(ground - station.point.y) <= GROUND_TOLERANCE, `${label}: the ground ${out} out is at ${ground.toFixed(2)}, its foot at ${station.point.y.toFixed(2)}`);
      assert.ok(!inSea(point.x, point.z), `${label} is not in the sea`);
      assert.ok(!inRect(CUTTING_HOLE, point.x, point.z) || underTunnel(point.x, point.z), `${label} is not over the cutting`);
    }
    const place = propPlace(spot);
    const near = roadPoints.filter((point) => Math.hypot(point.x - place.x, point.z - place.z) < reach && Math.abs(point.y - place.y) < ABOVE_ROAD);
    assert.equal(near.length, 0, `${label} is clear of every road`);
  }
});

test('no prop stands in another, in a turn board or in a landmark', () => {
  checkTurnBoards(track, turnBoardSpots(track, BARRIER_RUNS), PROPS);
  const places = PROPS.map((spot) => ({ spot, ...propPlace(spot), reach: PROP_REACH[spot.piece] }));
  places.forEach((first, index) => {
    for (const second of places.slice(index + 1)) {
      const apart = Math.hypot(first.x - second.x, first.z - second.z);
      assert.ok(apart >= first.reach + second.reach, `the ${first.spot.piece} at ${first.spot.s} and the ${second.spot.piece} at ${second.spot.s} are ${apart.toFixed(1)} apart`);
    }
    for (const landmark of LANDMARKS) {
      assert.ok(!inside(landmark, first.x, first.z, first.reach), `the ${first.spot.piece} at ${first.spot.s} stands in the ${landmark.name}`);
    }
  });
});

test('every landmark stands on the land, clear of the road', () => {
  for (const landmark of LANDMARKS) {
    const near = roadPoints.filter((point) => inside(landmark, point.x, point.z) && landmark.top > point.y - BELOW_ROAD && 0 < point.y + ABOVE_ROAD);
    assert.equal(near.length, 0, `the ${landmark.name} is clear of the road (at ${near.map((point) => `${point.x.toFixed(0)},${point.z.toFixed(0)}`).slice(0, 3)})`);
    const { area, spot } = landmark;
    for (const [x, z] of [[area.minX, area.minZ], [area.minX, area.maxZ], [area.maxX, area.minZ], [area.maxX, area.maxZ]]) {
      const corner = toWorld(spot, { x, z });
      assert.ok(!inSea(corner.x, corner.z), `the ${landmark.name}'s corner (${corner.x.toFixed(0)}, ${corner.z.toFixed(0)}) is on land`);
    }
  }
});

test('the islands and boats float in open sea, away from the road and its shade', () => {
  const afloat = [
    ...ISLANDS.map((island) => ({ name: `island ${island.seed}`, x: island.x, z: island.z, radius: rockIslandFootprint(island).radius })),
    ...BOATS.map((boat) => ({ name: `the ${boat.kind} at ${boat.x}, ${boat.z}`, x: boat.x, z: boat.z, radius: 4.3 })),
  ];
  for (const { name, x, z, radius } of afloat) {
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
      assert.ok(inSea(x + radius * Math.cos(angle), z + radius * Math.sin(angle)), `${name} is all in the sea`);
    }
    const nearest = Math.min(...roadPoints.map((point) => Math.hypot(point.x - x, point.z - z)));
    const room = name.startsWith('island') ? radius + SHADE_REACH : radius + 2;
    assert.ok(nearest > room, `${name} is ${nearest.toFixed(0)} from the road`);
  }
});

test('the plane taking off rolls on the runway east of the road, and no floodlight stands under its low flight', () => {
  for (const end of [TAKE_OFF.from, TAKE_OFF.to]) {
    assert.ok(roadPoints.every((point) => Math.hypot(point.x - end.x, point.z - end.z) > 30), 'the roll is clear of the road');
  }
  const LOW_FLIGHT_HALF_WIDTH = 24;
  for (const spot of PROPS.filter((each) => each.piece === 'airport-floodlight')) {
    const place = propPlace(spot);
    const underFlight = Math.abs(place.z - TAKE_OFF.to.z) < LOW_FLIGHT_HALF_WIDTH && place.x < TAKE_OFF.from.x;
    assert.ok(!underFlight, `the floodlight at ${spot.s} stands under the plane's flight`);
  }
});
