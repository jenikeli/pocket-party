// Unit tests for the 3D race's field items (M8c, host/games/kart-3d/items/): the teleport (warning, hops along
// the road clear of gaps and karts, laps kept right, the banner), the magnet and the push (who they act on and
// how they feel), sticky walls (held, let go, not again at once, the effect in every view), the CPU karts'
// rules for them, and a race with them staying plain data that repeats exactly.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { pointAt, progressBetween } from '../../host/games/kart-3d/track.js';
import { scale, addScaled, subtract, length, dot } from '../../host/games/kart-3d/vector.js';
import { createRace, stepRace, playerKart, RACE_PHASES } from '../../host/games/kart-3d/race.js';
import { viewHud, BANNERS } from '../../host/games/kart-3d/race-views.js';
import { createKart, stepKart, forwardSpeed } from '../../host/games/kart-3d/kart-physics.js';
import { recoveryControls } from '../../host/games/kart-3d/cpu-recovery.js';
import { stepItems, startEffect } from '../../host/games/kart-3d/items/item-rules.js';
import { ITEM_CATALOG } from '../../host/games/kart-3d/items/item-catalog.js';
import { itemHud, itemPhoneView } from '../../host/games/kart-3d/items/item-views.js';
import { cpuWantsItem } from '../../host/games/kart-3d/items/cpu-items.js';
import { TELEPORT_WARNING_SECONDS, TELEPORT_AFTER_SECONDS } from '../../host/games/kart-3d/items/teleport.js';
import { fieldTargets, applyFieldForces } from '../../host/games/kart-3d/items/field-forces.js';
import { STICK_AGAIN_SECONDS, isHeldOnWall } from '../../host/games/kart-3d/items/sticky-walls.js';
import { GO_AT } from '../../host/games/kart-3d/rocket-start.js';
import { tuning } from '../../host/games/kart-3d/tuning.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';
import { laneControls } from '../helpers/lane-driver.js';
import { KART_ITEMS } from '../../shared/protocol.js';

const STEP = 1 / 60;
const track = buildTrack(SEASIDE_SKYWAY);
const FIELD_ITEMS = [KART_ITEMS.TELEPORT, KART_ITEMS.MAGNET, KART_ITEMS.PUSH, KART_ITEMS.STICKY];
const DRIVE = { ...NEUTRAL_CONTROLS, accelerate: true };
const TOP_SPEED = tuning.topSpeed;

// A race past GO with one player 'p1' and the field items allowed; every kart parked apart further round.
function racingRace() {
  const race = createRace(track, ['p1'], 3, 150, 'normal', FIELD_ITEMS);
  race.phase = RACE_PHASES.RACING;
  race.time = GO_AT;
  race.karts.forEach((kart, index) => place(kart, 300 + index * 20, 0));
  return race;
}

// Puts `kart` on the road at `s`, `lateral`, driving along it at `speed`, with its race distance on lap 1.
function place(kart, s, lateral, speed = 0) {
  Object.assign(kart, createKart(track, s, lateral, kart.weight, kart.engineClassShare));
  kart.velocity = scale(kart.forward, speed);
  kart.distance = kart.s - track.startLine;
}

function stepItemsFor(race, seconds) {
  for (let step = 0; step < Math.round(seconds / STEP); step += 1) {
    stepItems(race, track, STEP);
    race.time += STEP;
  }
}

// How far the kart's race distance is from its spot on the road, whole laps aside. It never changes as the kart
// drives (a grid kart starts with a part of a station's length, createKart placing it on a station).
function lapOffset(kart) {
  const offset = kart.distance - (kart.s - track.startLine);
  return offset - Math.round(offset / track.length) * track.length;
}

test('teleport: a warning with a banner, then every kart still racing hops along the road, clear of the others', () => {
  const race = racingRace();
  race.karts.forEach((kart, index) => place(kart, 60 + index * 6, index % 2 === 0 ? -3 : 3, 20));
  const [falling, finished] = race.karts;
  falling.respawnIn = 0.5;
  finished.finishTime = 10;
  const player = playerKart(race, 'p1');
  const cpu = race.karts[2];
  const before = race.karts.map((kart) => ({ position: kart.position, s: kart.s, distance: kart.distance }));
  ITEM_CATALOG[KART_ITEMS.TELEPORT].use(race, track, player);
  assert.deepEqual(race.items.teleport, { warningLeft: TELEPORT_WARNING_SECONDS, afterLeft: TELEPORT_AFTER_SECONDS, hops: [] });
  assert.equal(viewHud(race, player).banner, BANNERS.TELEPORT);
  assert.equal(viewHud(race, cpu).banner, BANNERS.TELEPORT, 'a view following a CPU kart shows it too');
  stepItemsFor(race, TELEPORT_WARNING_SECONDS - 0.05);
  assert.deepEqual(race.karts.map((kart) => kart.position), before.map((each) => each.position), 'nobody hops during the warning');
  stepItemsFor(race, 0.1);
  const hops = race.items.teleport.hops;
  assert.ok(hops.length >= race.karts.length - 3, `most karts hopped (${hops.length})`);
  assert.deepEqual([falling.position, finished.position], [before[0].position, before[1].position], 'falling and finished karts stay');
  for (const [index, kart] of race.karts.entries()) {
    const hop = progressBetween(track, before[index].s, kart.s);
    assert.ok(Math.abs(hop) <= tuning.teleportReach + 1e-9, `within reach (${hop})`);
    assert.ok(Math.abs(kart.distance - before[index].distance - hop) < 1e-6 && Math.abs(lapOffset(kart)) < 1e-6, 'the race distance moved by the hop');
    assert.equal(track.stations[kart.trackIndex].gap, false);
    assert.ok(Math.abs(kart.lateral) <= track.stations[kart.trackIndex].halfWidth);
    assert.deepEqual(kart.previousPosition, kart.position, 'not drawn sweeping across');
    const nearest = Math.min(...race.karts.filter((other) => other !== kart).map((other) => length(subtract(other.position, kart.position))));
    assert.ok(index < 2 || nearest >= 3 - 1e-9, `clear of the others (${nearest})`);
  }
  const moved = race.karts.filter((kart, index) => kart.position !== before[index].position);
  assert.deepEqual(hops.map((hop) => hop.to), moved.map((kart) => kart.position));
  assert.ok(moved.every((kart) => Math.abs(forwardSpeed(kart) - 20) < 1e-6), 'each kept its speed along its new heading');
  assert.ok(moved.filter((kart) => kart.cpu !== null).every((kart) => kart.cpu.started === false), 'CPU drivers rejoin their line');
  stepItemsFor(race, TELEPORT_AFTER_SECONDS);
  assert.equal(race.items.teleport, null);
  assert.equal(viewHud(race, player).banner, null);
});

// Every kart near the start of the jump's gap teleports `times` times; returns every spot they landed on.
function teleportsNearTheGap(times) {
  const race = racingRace();
  const gapStart = track.stations.find((station) => station.gap).s;
  race.karts.forEach((kart, index) => place(kart, gapStart - 60 + index * 4, index % 2 === 0 ? -4 : 4, 20));
  const spots = [];
  for (let time = 0; time < times; time += 1) {
    ITEM_CATALOG[KART_ITEMS.TELEPORT].use(race, track, race.karts[0]);
    stepItemsFor(race, TELEPORT_WARNING_SECONDS + TELEPORT_AFTER_SECONDS + 0.1);
    spots.push(...race.karts.map((kart) => ({ s: kart.s, lateral: kart.lateral, index: kart.trackIndex })));
  }
  return spots;
}

test('teleport: never onto a gap, and the same race hops the same way', () => {
  const spots = teleportsNearTheGap(15);
  assert.ok(spots.every((spot) => !track.stations[spot.index].gap));
  assert.deepEqual(teleportsNearTheGap(15), spots);
});

test('field targets: a magnet pulls karts ahead in reach only; a push acts all round in its reach', () => {
  const race = racingRace();
  const [holder, ahead, behind, far, beside] = race.karts;
  place(holder, 60, 0);
  place(ahead, 70, 0);
  place(behind, 50, 0);
  place(far, 60 + tuning.magnetReach + 5, 0);
  place(beside, 60, 4);
  assert.deepEqual(fieldTargets(race, holder), [], 'nothing without the effect');
  startEffect(holder, KART_ITEMS.MAGNET);
  assert.deepEqual(fieldTargets(race, holder), [ahead]);
  startEffect(holder, KART_ITEMS.PUSH);
  assert.deepEqual(fieldTargets(race, holder), [ahead, behind, beside]);
});

// A kart driving at top speed down the start straight with a kart running `item` kept `ahead` behind it (or
// beside it) the whole time; returns it after `seconds`. 
function underField(item, ahead, lateral, seconds) {
  const race = racingRace();
  const [holder, target] = race.karts;
  place(target, 2 + ahead, lateral, TOP_SPEED);
  startEffect(holder, item);
  for (let step = 0; step < Math.round(seconds / STEP); step += 1) {
    stepKart(track, target, DRIVE, STEP);
    target.distance = target.s;
    place(holder, target.s - ahead, 0, TOP_SPEED);
    holder.distance = holder.s;
    applyFieldForces(race, STEP);
  }
  return target;
}

test('magnet: a kart 10 ahead loses about a quarter of its speed, one at the reach edge hardly any', () => {
  const near = forwardSpeed(underField(KART_ITEMS.MAGNET, 10, 0, 5)) / TOP_SPEED;
  assert.ok(near > 0.7 && near < 0.8, `10 ahead: ${near.toFixed(2)} of top speed`);
  const edge = forwardSpeed(underField(KART_ITEMS.MAGNET, tuning.magnetReach - 1, 0, 3)) / TOP_SPEED;
  assert.ok(edge > 0.97, `at the edge: ${edge.toFixed(2)}`);
});

test('push: a kart alongside is shoved about a lane aside in half a second, sliding loose', () => {
  const target = underField(KART_ITEMS.PUSH, 0, 3, 0.5);
  assert.ok(target.lateral - 3 > 3 && target.lateral - 3 < 5, `shoved ${(target.lateral - 3).toFixed(2)}`);
  assert.ok(target.slideLeft > 0);
});

// The player's kart driving at the right wall of the start straight; steps the kart and the items until `until`
// is true (at most `seconds`), returning the seconds it took (Infinity if never).
function driveIntoWall(race, kart, until, seconds) {
  for (let step = 1; step <= Math.round(seconds / STEP); step += 1) {
    kart.velocity = isHeldOnWall(kart) ? kart.velocity : addScaled(scale(kart.forward, 15), pointAt(track, kart.s).right, 8);
    stepKart(track, kart, DRIVE, STEP);
    stepItems(race, track, STEP);
    if (until(kart)) {
      return step * STEP;
    }
  }
  return Infinity;
}

test('sticky walls: shown to everyone; a kart touching a wall is held, let go off it, and does not stick again at once', () => {
  const race = racingRace();
  const kart = playerKart(race, 'p1');
  place(kart, 60, 6, 15);
  ITEM_CATALOG[KART_ITEMS.STICKY].use(race, track, race.karts[0]);
  assert.equal(race.items.stickyLeft, tuning.itemEffectSeconds);
  assert.deepEqual(itemHud(race, race.karts[3]).effects, [{ item: KART_ITEMS.STICKY, share: 1 }]);
  assert.deepEqual(itemPhoneView(race, kart).effects, [{ item: KART_ITEMS.STICKY, secondsLeft: Math.ceil(tuning.itemEffectSeconds) }]);
  assert.ok(driveIntoWall(race, kart, isHeldOnWall, 1) < 1, 'stuck to the wall');
  const heldAt = kart.position;
  assert.equal(length(kart.velocity), 0);
  const free = driveIntoWall(race, kart, (each) => !isHeldOnWall(each), 3);
  assert.ok(Math.abs(free - tuning.stickyHoldSeconds) < 2 * STEP, `held ${free} s`);
  assert.ok(length(subtract(kart.previousPosition, heldAt)) < 1e-9, 'held still until let go');
  assert.ok(dot(kart.velocity, pointAt(track, kart.s).right) < 0, 'pushed off the wall');
  assert.equal(kart.item.stickAgainIn > 0, true);
  const again = driveIntoWall(race, kart, isHeldOnWall, 2);
  assert.ok(again >= STICK_AGAIN_SECONDS - STEP && again < 2, `stuck again after ${again} s`);
});

test('sticky walls: they end after the effect time; karts without items never stick', () => {
  const race = racingRace();
  const kart = playerKart(race, 'p1');
  place(kart, 60, 6, 15);
  ITEM_CATALOG[KART_ITEMS.STICKY].use(race, track, kart);
  stepItemsFor(race, tuning.itemEffectSeconds + STEP);
  assert.deepEqual([race.items.stickyLeft, kart.item.stickyWalls, itemHud(race, kart).effects], [0, false, []]);
  assert.equal(driveIntoWall(race, kart, isHeldOnWall, 1), Infinity);
  const bare = createKart(track, 60, 6);
  bare.velocity = addScaled(scale(bare.forward, 15), pointAt(track, 60).right, 8);
  stepKart(track, bare, DRIVE, STEP);
  assert.equal(isHeldOnWall(bare), false);
});

test('a CPU kart held on a sticky wall is not stuck: it does not back off', () => {
  const race = racingRace();
  const kart = race.karts[0];
  kart.item.stuckLeft = tuning.stickyHoldSeconds;
  for (let step = 0; step < 90; step += 1) {
    assert.equal(recoveryControls(track, kart, kart.cpu, STEP), null);
  }
  assert.equal(kart.cpu.stuckFor, 0);
});

test('CPU rules: teleport from the back half, magnet with a kart ahead in reach, push with one close, sticky walls after a while', () => {
  const race = racingRace();
  const [kart, other] = race.karts;
  place(kart, 60, 0);
  kart.item.cpuWait = 0;
  const wants = (item, heldFor = 1) => {
    kart.item.held = item;
    kart.item.landedAt = race.time - heldFor;
    return cpuWantsItem(race, track, kart);
  };
  kart.place = 1;
  assert.equal(wants(KART_ITEMS.TELEPORT), false);
  kart.place = race.karts.length;
  assert.equal(wants(KART_ITEMS.TELEPORT), true);
  assert.deepEqual([wants(KART_ITEMS.MAGNET), wants(KART_ITEMS.PUSH)], [false, false], 'nobody near');
  place(other, 70, 0);
  assert.deepEqual([wants(KART_ITEMS.MAGNET), wants(KART_ITEMS.PUSH)], [true, false], 'a kart 10 ahead');
  place(other, 61, 3);
  assert.equal(wants(KART_ITEMS.PUSH), true);
  assert.deepEqual([wants(KART_ITEMS.STICKY, 1), wants(KART_ITEMS.STICKY, 3.5)], [false, true]);
});

// A 1-player race with only the field items allowed, driven for `seconds`; what the CPU karts did is noted.
function raceWithFieldItems(seconds) {
  const race = createRace(track, ['p1'], 3, 150, 'normal', FIELD_ITEMS);
  const offsets = race.karts.map(lapOffset);
  const controlsFor = (playerId) =>
    race.phase === RACE_PHASES.COUNTDOWN ? NEUTRAL_CONTROLS : { ...NEUTRAL_CONTROLS, ...laneControls(track, playerKart(race, playerId), 0) };
  const seen = new Set();
  for (let step = 0; step < seconds / STEP; step += 1) {
    stepRace(race, track, controlsFor, STEP);
    race.karts.filter((kart) => kart.item.effect).forEach((kart) => seen.add(kart.item.effect.item));
    if (race.items.teleport?.hops.length > 0) {
      seen.add(KART_ITEMS.TELEPORT);
    }
    if (race.items.stickyLeft > 0) {
      seen.add(KART_ITEMS.STICKY);
    }
  }
  return { race, seen, offsets };
}

test('a race with the field items: CPU karts use them, laps stay right, and the race repeats exactly', () => {
  const { race, seen, offsets } = raceWithFieldItems(GO_AT + 60);
  assert.ok(seen.size >= 3, `items used: ${[...seen]}`);
  assert.ok(race.karts.every((kart, index) => Math.abs(lapOffset(kart) - offsets[index]) < 1e-6), 'laps stay right');
  assert.ok(race.karts.every((kart) => Number.isFinite(kart.position.x)), 'nobody lost');
  const itemState = { items: race.items, karts: race.karts.map((kart) => kart.item) };
  assert.deepEqual(JSON.parse(JSON.stringify(itemState)), itemState, 'the items are plain data');
  assert.equal(JSON.stringify(raceWithFieldItems(GO_AT + 60).race), JSON.stringify(race), 'the same race twice');
});
