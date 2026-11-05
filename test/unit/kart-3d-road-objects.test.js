// Unit tests for the 3D race's road objects (M8b, host/games/kart-3d/items/road-objects.js): the blocker as an
// item (placing, lasting, vanishing), karts bumping off a blocker, the CPU karts using the blocker and passing it,
// and the objects staying plain data.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { pointAt, progressBetween } from '../../host/games/kart-3d/track.js';
import { scale, addScaled, subtract, length } from '../../host/games/kart-3d/vector.js';
import { createRace, stepRace, RACE_PHASES } from '../../host/games/kart-3d/race.js';
import { createKart, forwardSpeed } from '../../host/games/kart-3d/kart-physics.js';
import { stepItems } from '../../host/games/kart-3d/items/item-rules.js';
import { ITEM_CATALOG } from '../../host/games/kart-3d/items/item-catalog.js';
import { cpuWantsItem } from '../../host/games/kart-3d/items/cpu-items.js';
import {
  OBJECT_VANISH_SECONDS,
  BLOCKER_SIZE,
  objectFrame,
  standingBlockers,
} from '../../host/games/kart-3d/items/road-objects.js';
import { GO_AT } from '../../host/games/kart-3d/rocket-start.js';
import { tuning } from '../../host/games/kart-3d/tuning.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';
import { KART_ITEMS } from '../../shared/protocol.js';

const STEP = 1 / 60;
const track = buildTrack(SEASIDE_SKYWAY);
// The start straight of Seaside Skyway: flat, no anti-gravity, no corner for 80 units .
const STRAIGHT_S = 20;
const TOP_SPEED = tuning.topSpeed;

// A race past GO with one player 'p1', items on (blocker only), and its player kart put on the road at
// `s`, `lateral`, driving at `speed`. The other karts are parked far away so they do not touch the scene.
function raceWithKart(s, lateral = 0, speed = 0) {
  const race = createRace(track, ['p1'], 3, 150, 'normal', [KART_ITEMS.BLOCKER]);
  race.phase = RACE_PHASES.RACING;
  race.time = GO_AT;
  const kart = race.karts.find((each) => each.playerId === 'p1');
  Object.assign(kart, createKart(track, s, lateral, kart.weight, kart.engineClassShare));
  kart.velocity = scale(kart.forward, speed);
  parkOthers(race, kart);
  return { race, kart };
}

function parkOthers(race, kart) {
  race.karts.filter((each) => each !== kart).forEach((each, index) => {
    Object.assign(each, createKart(track, 200 + index * 20, 0, each.weight, each.engineClassShare));
  });
}

function useItem(race, kart, item) {
  ITEM_CATALOG[item].use(race, track, kart);
}

function stepItemsFor(race, seconds) {
  for (let step = 0; step < Math.round(seconds / STEP); step += 1) {
    stepItems(race, track, STEP);
  }
}

test('blocker: dropped just behind the kart at its lane, with running ids, and no objects with items off', () => {
  const { race, kart } = raceWithKart(STRAIGHT_S, 2);
  useItem(race, kart, KART_ITEMS.BLOCKER);
  useItem(race, kart, KART_ITEMS.BLOCKER);
  const [first, second] = race.items.objects;
  assert.equal(first.item, KART_ITEMS.BLOCKER);
  assert.ok(Math.abs(progressBetween(track, first.s, kart.s) - 3) < 1e-9);
  assert.equal(first.lateral, 2);
  assert.equal(first.left, tuning.itemEffectSeconds);
  assert.equal(second.id, first.id + 1);
  const off = createRace(track, ['p1'], 3, 150, 'normal', []);
  assert.deepEqual(off.items.objects, []);
});

test('blocker: kept inside the road at the edge and off gaps', () => {
  const { race, kart } = raceWithKart(STRAIGHT_S, 0);
  const halfWidth = track.stations[kart.trackIndex].halfWidth;
  kart.lateral = halfWidth;
  useItem(race, kart, KART_ITEMS.BLOCKER);
  assert.ok(Math.abs(race.items.objects[0].lateral) <= halfWidth - BLOCKER_SIZE.radius + 1e-9);
  // Just past the jump's gap: three units behind is over the gap, so the blocker is put further back, on road.
  const gapEnd = track.stations.findLast((station) => station.gap).s;
  kart.lateral = 0;
  kart.s = gapEnd + 1;
  useItem(race, kart, KART_ITEMS.BLOCKER);
  const dropped = race.items.objects[1];
  assert.equal(track.stations[pointAt(track, dropped.s).index].gap, false);
  assert.ok(dropped.s < kart.s);
});

test('objects last the effect time, stay for the vanishing, then go', () => {
  const { race, kart } = raceWithKart(STRAIGHT_S, 0);
  useItem(race, kart, KART_ITEMS.BLOCKER);
  const object = race.items.objects[0];
  stepItemsFor(race, tuning.itemEffectSeconds - 0.1);
  assert.ok(object.left > 0);
  stepItemsFor(race, 0.3);
  assert.ok(object.left < 0 && race.items.objects.includes(object), 'ended but still there to vanish');
  stepItemsFor(race, OBJECT_VANISH_SECONDS + 0.1);
  assert.equal(race.items.objects.length, 0);
});

test('blocker: a kart driving into it is pushed out, loses speed and bounces; one flying above passes over', () => {
  const { race, kart } = raceWithKart(STRAIGHT_S, 0, TOP_SPEED);
  const object = { id: 1, item: KART_ITEMS.BLOCKER, s: STRAIGHT_S + 1.5, lateral: 0, left: 5 };
  race.items.objects.push(object);
  const frame = objectFrame(track, object);
  stepItems(race, track, STEP);
  assert.ok(length(subtract(kart.position, frame.position)) >= BLOCKER_SIZE.radius + 1 - 1e-6, 'pushed out to touching');
  assert.ok(forwardSpeed(kart) < TOP_SPEED * 0.8, `lost speed (${forwardSpeed(kart)})`);
  assert.ok(kart.slideLeft > 0, 'loose grip after the bounce');

  const flying = raceWithKart(STRAIGHT_S, 0, TOP_SPEED);
  flying.race.items.objects.push({ ...object });
  flying.kart.position = addScaled(flying.kart.position, flying.kart.up, BLOCKER_SIZE.height + 1);
  const before = flying.kart.velocity;
  stepItems(flying.race, track, STEP);
  assert.deepEqual(flying.kart.velocity, before);
});

test('blocker: an ended one is not solid', () => {
  const { race, kart } = raceWithKart(STRAIGHT_S, 0, TOP_SPEED);
  race.items.objects.push({ id: 1, item: KART_ITEMS.BLOCKER, s: STRAIGHT_S + 1, lateral: 0, left: -0.1 });
  const before = kart.velocity;
  stepItems(race, track, STEP);
  assert.deepEqual(kart.velocity, before);
});

test('CPU rules: blocker with a kart close behind in line', () => {
  const { race, kart } = raceWithKart(STRAIGHT_S, 0, 10);
  const other = race.karts.find((each) => each !== kart);
  kart.cpu = {};
  Object.assign(kart.item, { landedAt: 0, cpuWait: 0, held: KART_ITEMS.BLOCKER });
  Object.assign(other, createKart(track, STRAIGHT_S - 6, 0));
  assert.equal(cpuWantsItem(race, track, kart), true, 'a kart close behind');
  Object.assign(other, createKart(track, STRAIGHT_S - 40, 0));
  assert.equal(cpuWantsItem(race, track, kart), false, 'nobody close behind');
  Object.assign(other, createKart(track, STRAIGHT_S + 6, 0));
  assert.equal(cpuWantsItem(race, track, kart), false, 'a kart ahead is not behind');
});

// A Hard CPU kart set off at 20 units a second down the start straight, with a blocker on `blockerAt` if given
// (else none); returns where across the road it was as it passed distance `blockerS`, and whether it was bumped.
function cpuPassing(blockerS, blockerAt = null) {
  const race = createRace(track, [], 3, 150, 'hard', [KART_ITEMS.BLOCKER]);
  race.phase = RACE_PHASES.RACING;
  race.time = GO_AT;
  const kart = race.karts[0];
  Object.assign(kart, createKart(track, STRAIGHT_S - 20, 0, kart.weight, kart.engineClassShare));
  kart.velocity = scale(kart.forward, 20);
  parkOthers(race, kart);
  if (blockerAt !== null) {
    race.items.objects.push({ id: 1, item: KART_ITEMS.BLOCKER, s: blockerS, lateral: blockerAt, left: 20 });
  }
  const result = { lateral: null, bumped: false };
  for (let step = 0; step < 320; step += 1) {
    const before = kart.s;
    stepRace(race, track, () => NEUTRAL_CONTROLS, STEP);
    result.bumped ||= kart.slideLeft > 0;
    if (result.lateral === null && progressBetween(track, blockerS, kart.s) > 0 && progressBetween(track, blockerS, before) <= 0) {
      result.lateral = kart.lateral;
    }
  }
  return result;
}

test('CPU karts drive round a standing blocker on their line as round a slow kart', () => {
  const blockerS = STRAIGHT_S + 70;
  const free = cpuPassing(blockerS);
  assert.notEqual(free.lateral, null, 'drove past the spot');
  const withBlocker = cpuPassing(blockerS, free.lateral);
  assert.equal(withBlocker.bumped, false, 'without touching it');
  assert.ok(Math.abs(withBlocker.lateral - free.lateral) > BLOCKER_SIZE.radius + 1, 'went round it');
  assert.equal(standingBlockers(track, [{ item: KART_ITEMS.BLOCKER, s: 5, lateral: 0, left: 1 }]).length, 1);
});

test('objects are plain data: they survive a round trip through JSON', () => {
  const { race, kart } = raceWithKart(STRAIGHT_S, 0);
  useItem(race, kart, KART_ITEMS.BLOCKER);
  kart.s += 10;
  useItem(race, kart, KART_ITEMS.BLOCKER);
  stepItemsFor(race, 0.1);
  assert.deepEqual(JSON.parse(JSON.stringify(race.items.objects)), race.items.objects);
  assert.equal(race.items.nextObjectId, 3);
});
