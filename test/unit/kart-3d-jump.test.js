// Unit tests for the jump item (M8d, host/games/kart-3d/items/jump.js): the launch's height and time in the air
// from the tuning, the kart keeping its speed along the road, a trick off it boosting on landing, the item held
// while the kart is in the air, the launch puff's trigger (jumpedAt), and the CPU's use of it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { createRace, stepRace, RACE_PHASES } from '../../host/games/kart-3d/race.js';
import { createKart, forwardSpeed } from '../../host/games/kart-3d/kart-physics.js';
import { scale, subtract, dot } from '../../host/games/kart-3d/vector.js';
import { stepItems } from '../../host/games/kart-3d/items/item-rules.js';
import { ITEM_CATALOG } from '../../host/games/kart-3d/items/item-catalog.js';
import { cpuWantsItem } from '../../host/games/kart-3d/items/cpu-items.js';
import { GO_AT } from '../../host/games/kart-3d/rocket-start.js';
import { tuning } from '../../host/games/kart-3d/tuning.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';
import { KART_ITEMS } from '../../shared/protocol.js';

const STEP = 1 / 60;
const track = buildTrack(SEASIDE_SKYWAY);
// The start straight of Seaside Skyway: flat, no anti-gravity, no corner for 80 units.
const STRAIGHT_S = 20;

// A race past GO with one player 'p1' holding a jump, its kart on the start straight driving at `speed`; the
// other karts parked far away.
function raceWithKart(speed = 20) {
  const race = createRace(track, ['p1'], 3, 150, 'normal', [KART_ITEMS.JUMP]);
  race.phase = RACE_PHASES.RACING;
  race.time = GO_AT;
  const kart = race.karts.find((each) => each.playerId === 'p1');
  Object.assign(kart, createKart(track, STRAIGHT_S, 0, kart.weight, kart.engineClassShare));
  kart.velocity = scale(kart.forward, speed);
  kart.item.held = KART_ITEMS.JUMP;
  race.karts.filter((each) => each !== kart).forEach((each, index) => {
    Object.assign(each, createKart(track, 300 + index * 20, 0, each.weight, each.engineClassShare));
  });
  return { race, kart };
}

// Launches the kart and steps the race until it lands, pressing Drift as `drift(kart)` says; returns how high
// over its start it got, the seconds in the air, and the speed along the road it had just after the launch.
function flyOffJump(race, kart, drift = () => false) {
  const start = kart.position;
  const up = kart.up;
  const speedBefore = forwardSpeed(kart);
  ITEM_CATALOG[KART_ITEMS.JUMP].use(race, track, kart);
  const result = { peak: 0, seconds: 0, speedBefore, speedAfter: forwardSpeed(kart) };
  while (!kart.grounded && result.seconds < 5) {
    stepRace(race, track, () => ({ ...NEUTRAL_CONTROLS, drift: drift(kart) }), STEP);
    result.peak = Math.max(result.peak, dot(subtract(kart.position, start), up));
    result.seconds += STEP;
  }
  return result;
}

test('the launch lifts the kart to tuning.jumpHeight and keeps it up about a second', () => {
  const { race, kart } = raceWithKart();
  const { peak, seconds } = flyOffJump(race, kart);
  assert.ok(Math.abs(peak - tuning.jumpHeight) < 0.2, `peaked ${peak.toFixed(2)} over the road`);
  assert.ok(seconds > 0.8 && seconds < 1.1, `${seconds.toFixed(2)} s in the air`);
  assert.equal(kart.grounded, true, 'it lands');
});

test('the launch keeps the kart speed along the road, and a taller jump stays up longer', () => {
  const { race, kart } = raceWithKart(25);
  const { speedBefore, speedAfter } = flyOffJump(race, kart);
  assert.ok(Math.abs(speedAfter - speedBefore) < 0.01, `${speedBefore} before, ${speedAfter} after`);
  const original = tuning.jumpHeight;
  try {
    tuning.jumpHeight = 5;
    const tall = raceWithKart();
    assert.ok(flyOffJump(tall.race, tall.kart).seconds > 1.2, 'five units high is a longer flight');
  } finally {
    tuning.jumpHeight = original;
  }
});

test('the launch is a takeoff: Drift just after it tricks and boosts on landing, none does not', () => {
  const tricked = raceWithKart();
  flyOffJump(tricked.race, tricked.kart, (driver) => driver.sinceLip !== null && driver.sinceLip < 0.1);
  assert.equal(tricked.kart.boost?.kind, 'jump', 'trick boost after landing');
  const plain = raceWithKart();
  flyOffJump(plain.race, plain.kart);
  assert.equal(plain.kart.boost?.kind === 'jump', false, 'no trick, no boost');
  const early = raceWithKart();
  early.kart.sinceDriftPress = tuning.trickEarly / 2;
  ITEM_CATALOG[KART_ITEMS.JUMP].use(early.race, track, early.kart);
  assert.equal(early.kart.tricking, true, 'Drift pressed just before the Item press tricks');
  assert.equal(early.kart.lipTiming.trick, true, 'and the timing readout has it');
});

test('the item waits in the slot while the kart is in the air, and goes on the next press on the ground', () => {
  const { race, kart } = raceWithKart();
  kart.grounded = false;
  kart.item.button = true;
  stepItems(race, track, STEP);
  assert.equal(kart.item.held, KART_ITEMS.JUMP, 'kept while airborne');
  assert.equal(kart.item.jumpedAt, null);
  kart.grounded = true;
  kart.item.button = false;
  stepItems(race, track, STEP);
  kart.item.button = true;
  stepItems(race, track, STEP);
  assert.equal(kart.item.held, null, 'used on the ground');
  assert.equal(kart.item.jumpedAt, race.time, 'the launch time is kept for the puff');
  assert.equal(kart.grounded, false);
});

test('the item waits in the slot while the kart is held on a sticky wall, whose hold would stop the launch', () => {
  const { race, kart } = raceWithKart();
  kart.item.stuckLeft = 1;
  kart.item.button = true;
  stepItems(race, track, STEP);
  assert.equal(kart.item.held, KART_ITEMS.JUMP, 'kept while held');
  assert.equal(kart.item.jumpedAt, null);
  assert.equal(kart.grounded, true);
});

test('CPU rule: a jump on a straight with road ahead, not near the course gap or a corner', () => {
  const { race, kart } = raceWithKart(20);
  kart.cpu = {};
  Object.assign(kart.item, { landedAt: 0, cpuWait: 0 });
  assert.equal(cpuWantsItem(race, track, kart), true, 'a straight');
  kart.grounded = false;
  assert.equal(cpuWantsItem(race, track, kart), false, 'not in the air');
  const gapS = track.stations.findIndex((station) => station.gap) * (track.length / track.stations.length);
  const nearGap = raceWithKart(20);
  Object.assign(nearGap.kart, createKart(track, gapS - 12, 0));
  nearGap.kart.cpu = {};
  Object.assign(nearGap.kart.item, { held: KART_ITEMS.JUMP, landedAt: 0, cpuWait: 0 });
  assert.equal(cpuWantsItem(nearGap.race, track, nearGap.kart), false, 'a gap within 30 units');
  const bend = raceWithKart(10);
  Object.assign(bend.kart, createKart(track, 960, 0));
  bend.kart.cpu = {};
  Object.assign(bend.kart.item, { held: KART_ITEMS.JUMP, landedAt: 0, cpuWait: 0 });
  assert.equal(cpuWantsItem(bend.race, track, bend.kart), false, 'a corner ahead');
});
