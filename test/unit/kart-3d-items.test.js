// Unit tests for the 3D race's item rules (M8a, host/games/kart-3d/items/): the boxes' rows on both courses,
// pickup, break and return, the roulette, one press per item, the effects' time, the odds by place, items off,
// the settings, CPU karts using items, and the race staying plain data that repeats exactly.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { COURSES } from '../../host/games/kart-3d/courses.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { locate, pointAt, surfaceAt, turnAhead, progressBetween, SURFACES } from '../../host/games/kart-3d/track.js';
import { createRace, stepRace, playerKart, RACE_PHASES } from '../../host/games/kart-3d/race.js';
import { raceView, viewHud } from '../../host/games/kart-3d/race-views.js';
import { createSetup } from '../../host/kart/setup.js';
import { GO_AT } from '../../host/games/kart-3d/rocket-start.js';
import { tuning } from '../../host/games/kart-3d/tuning.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';
import { laneControls } from '../helpers/lane-driver.js';
import { KART_ITEMS } from '../../shared/protocol.js';
import { itemBoxSpots, PICKUP_REACH } from '../../host/games/kart-3d/items/item-boxes.js';
import { stepItems, startEffect } from '../../host/games/kart-3d/items/item-rules.js';
import { BUILT_ITEMS, ITEM_ROLES } from '../../host/games/kart-3d/items/item-catalog.js';
import { drawItem, itemChances, roleWeight } from '../../host/games/kart-3d/items/item-odds.js';
import { itemHud, itemPhoneView } from '../../host/games/kart-3d/items/item-views.js';
import { createItemSettings, toggleItems, toggleItem, allowedItems } from '../../host/games/kart-3d/items/item-settings.js';

const STEP = 1 / 60;
const track = buildTrack(SEASIDE_SKYWAY);

// A race already past GO, so stepItems may hand out and use items, with one player, 'p1'.
function racingRace(allowed) {
  const race = createRace(track, ['p1'], 3, 150, 'normal', allowed);
  race.phase = RACE_PHASES.RACING;
  race.time = GO_AT;
  return race;
}

// Puts `kart` at a spot on the road, for stepItems only (the kart is not stepped).
function placeAt(kart, s, lateral) {
  kart.position = pointAt(track, s, lateral).position;
  kart.s = s;
}

function stepItemsFor(race, seconds) {
  for (let step = 0; step < Math.round(seconds / STEP); step += 1) {
    stepItems(race, track, STEP);
    race.time += STEP;
  }
}

// A player driving steadily in the middle of the road, never drifting or using an item.
function steadyDriver(race) {
  return (playerId) => {
    if (race.phase === RACE_PHASES.COUNTDOWN) {
      return NEUTRAL_CONTROLS;
    }
    return { ...NEUTRAL_CONTROLS, ...laneControls(track, playerKart(race, playerId), 0) };
  };
}

test('boxes: rows across the whole road on straight, level road on both courses, none off it', () => {
  for (const course of COURSES) {
    const courseTrack = buildTrack(course);
    const spots = itemBoxSpots(courseTrack);
    const rows = [...new Set(spots.map((spot) => spot.s))];
    assert.equal(rows.length, 2, `${course.id} has two rows`);
    for (const rowS of rows) {
      const row = spots.filter((spot) => spot.s === rowS);
      const at = pointAt(courseTrack, rowS, 0);
      const station = courseTrack.stations[at.index];
      assert.ok(Math.abs(turnAhead(courseTrack, at.index)) < 0.01 && at.normal.y > 0.999, `${course.id} row at ${rowS} is straight and level`);
      assert.ok(rowS > courseTrack.startLine + 5, `${course.id} row at ${rowS} is past the grid and the line`);
      assert.ok(courseTrack.dashPanels.every((panel) => Math.abs(progressBetween(courseTrack, panel.s, rowS)) > 10), 'clear of dash panels');
      row.slice(1).forEach((spot, index) => {
        const gap = spot.lateral - row[index].lateral;
        assert.ok(gap >= 3 && gap <= 4.5, `${course.id}: boxes about 4 apart (${gap.toFixed(2)})`);
      });
      for (const spot of row) {
        const point = pointAt(courseTrack, spot.s, spot.lateral);
        const contact = locate(courseTrack, point.position, point.index);
        assert.equal(surfaceAt(contact), SURFACES.ROAD, `${course.id}: box at ${spot.lateral.toFixed(2)} is on the road`);
        assert.ok(Math.abs(spot.lateral) <= contact.halfWidth - 1.5 + 0.05, 'at least 1.5 inside the edge');
      }
      const outer = Math.max(...row.map((spot) => Math.abs(spot.lateral)));
      assert.ok(outer + PICKUP_REACH >= station.halfWidth, `${course.id}: a kart by the edge still meets a box`);
    }
  }
});

test('pickup: a kart breaks the box, the roulette runs, then the item is held; the box comes back', () => {
  const race = racingRace([KART_ITEMS.BIG]);
  const kart = playerKart(race, 'p1');
  const box = race.items.boxes[2];
  placeAt(kart, box.s, box.lateral + 1);
  stepItems(race, track, STEP);
  assert.equal(box.returnLeft, tuning.itemBoxReturnSeconds, 'the box broke');
  assert.equal(race.items.boxes.filter((each) => each.returnLeft > 0).length, 1, 'only the box it touched');
  assert.equal(kart.item.rollLeft, tuning.itemRouletteSeconds);
  assert.deepEqual(itemHud(race, kart), { held: null, rolling: true, effects: [] });
  placeAt(kart, 300, 0);
  stepItemsFor(race, tuning.itemRouletteSeconds - 0.1);
  assert.equal(kart.item.held, null, 'still rolling');
  stepItemsFor(race, 0.2);
  assert.deepEqual(itemPhoneView(race, kart), { held: KART_ITEMS.BIG, rolling: false, effects: [] });
  stepItemsFor(race, tuning.itemBoxReturnSeconds - tuning.itemRouletteSeconds);
  assert.equal(box.returnLeft, 0, 'the box is back');
});

test('pickup: a box breaks for a kart that already holds an item, which keeps it; a finished kart gets nothing', () => {
  const race = racingRace([KART_ITEMS.BIG]);
  const kart = playerKart(race, 'p1');
  kart.item.held = KART_ITEMS.SMALL;
  const [first, second] = race.items.boxes;
  placeAt(kart, first.s, first.lateral);
  stepItems(race, track, STEP);
  assert.ok(first.returnLeft > 0, 'the box broke anyway');
  assert.deepEqual([kart.item.held, kart.item.rollLeft], [KART_ITEMS.SMALL, 0]);
  kart.item.held = null;
  kart.finishTime = 60;
  placeAt(kart, second.s, second.lateral);
  stepItems(race, track, STEP);
  assert.ok(second.returnLeft > 0);
  assert.equal(kart.item.rollLeft, 0, 'no roulette after finishing');
});

test('use: one press uses one item; holding the button does not use the next one; not while falling', () => {
  const race = racingRace(BUILT_ITEMS);
  const kart = playerKart(race, 'p1');
  kart.item.held = KART_ITEMS.BIG;
  kart.item.button = true;
  stepItems(race, track, STEP);
  assert.deepEqual([kart.item.held, kart.item.effect?.item], [null, KART_ITEMS.BIG]);
  kart.item.held = KART_ITEMS.SMALL;
  stepItemsFor(race, 1);
  assert.equal(kart.item.held, KART_ITEMS.SMALL, 'holding the button does nothing more');
  kart.item.button = false;
  stepItems(race, track, STEP);
  kart.respawnIn = 0.5;
  kart.item.button = true;
  stepItems(race, track, STEP);
  assert.equal(kart.item.held, KART_ITEMS.SMALL, 'a falling kart keeps its item');
  assert.equal(kart.item.effect.item, KART_ITEMS.BIG, 'and its effect');
});

test('use: the Item button pressed on the phone uses the item through stepRace', () => {
  const race = createRace(track, ['p1'], 3, 150, 'normal', BUILT_ITEMS);
  let item = false;
  const controlsFor = () => (race.phase === RACE_PHASES.COUNTDOWN ? NEUTRAL_CONTROLS : { ...NEUTRAL_CONTROLS, accelerate: true, item });
  while (race.phase === RACE_PHASES.COUNTDOWN) {
    stepRace(race, track, controlsFor, STEP);
  }
  const kart = playerKart(race, 'p1');
  kart.item.held = KART_ITEMS.BOUNCY;
  stepRace(race, track, controlsFor, STEP);
  assert.equal(kart.item.held, KART_ITEMS.BOUNCY, 'not without a press');
  item = true;
  stepRace(race, track, controlsFor, STEP);
  assert.deepEqual([kart.item.held, kart.item.effect.item], [null, KART_ITEMS.BOUNCY]);
  assert.deepEqual(raceView(race, createSetup(), 'p1').item.effects, [{ item: KART_ITEMS.BOUNCY, secondsLeft: Math.ceil(tuning.itemEffectSeconds) }]);
});

test('effects: last the tuned effect time, one at a time (a new one replaces the running one)', () => {
  const race = racingRace(BUILT_ITEMS);
  const kart = playerKart(race, 'p1');
  startEffect(kart, KART_ITEMS.BIG);
  stepItemsFor(race, 2);
  assert.ok(Math.abs(itemHud(race, kart).effects[0].share - (1 - 2 / tuning.itemEffectSeconds)) < 0.01, 'the share counts down');
  startEffect(kart, KART_ITEMS.SMALL);
  assert.deepEqual(kart.item.effect, { item: KART_ITEMS.SMALL, left: tuning.itemEffectSeconds });
  stepItemsFor(race, tuning.itemEffectSeconds - 0.1);
  assert.equal(kart.item.effect.item, KART_ITEMS.SMALL);
  assert.deepEqual(itemPhoneView(race, kart).effects, [{ item: KART_ITEMS.SMALL, secondsLeft: 1 }]);
  stepItemsFor(race, 0.2);
  assert.equal(kart.item.effect, null);
});

test('odds: catch-up items grow toward last place, defend items shrink, even items stay; draws are always allowed', () => {
  for (let place = 2; place <= 12; place += 1) {
    assert.ok(roleWeight(ITEM_ROLES.CATCH_UP, place, 12) > roleWeight(ITEM_ROLES.CATCH_UP, place - 1, 12));
    assert.ok(roleWeight(ITEM_ROLES.DEFEND, place, 12) < roleWeight(ITEM_ROLES.DEFEND, place - 1, 12));
    assert.equal(roleWeight(ITEM_ROLES.EVEN, place, 12), roleWeight(ITEM_ROLES.EVEN, 1, 12));
  }
  assert.ok(roleWeight(ITEM_ROLES.CATCH_UP, 1, 12) < 0.1, 'the leader gets almost no catch-up items');
  assert.ok(itemChances(BUILT_ITEMS, 1, 12)[KART_ITEMS.BOUNCY] > itemChances(BUILT_ITEMS, 12, 12)[KART_ITEMS.BOUNCY]);
  const randoms = Array.from({ length: 100 }, (unused, index) => index / 100);
  for (let place = 1; place <= 12; place += 1) {
    assert.ok(randoms.every((random) => BUILT_ITEMS.includes(drawItem(BUILT_ITEMS, place, 12, random))));
    assert.ok(randoms.every((random) => drawItem([KART_ITEMS.SMALL], place, 12, random) === KART_ITEMS.SMALL), 'one allowed item always comes up');
  }
  assert.equal(drawItem([KART_ITEMS.BIG], 1, 1, 0.999999), KART_ITEMS.BIG, 'a field of one');
});

test('items off: no boxes, null views; unbuilt ids are left out', () => {
  const race = createRace(track, ['p1'], 3, 150, 'normal');
  const kart = playerKart(race, 'p1');
  assert.deepEqual(race.items.boxes, []);
  assert.equal(itemHud(race, kart), null);
  assert.equal(viewHud(race, kart).item, null);
  assert.equal(raceView(race, createSetup(), 'p1').item, null);
  const notBuilt = createRace(track, ['p1'], 3, 150, 'normal', ['not-an-item']);
  assert.deepEqual([notBuilt.items.allowed, notBuilt.items.boxes], [[], []]);
});

test('settings: on with every built item; off allows none; each item toggles', () => {
  const settings = createItemSettings();
  assert.deepEqual(allowedItems(settings), BUILT_ITEMS);
  toggleItem(settings, KART_ITEMS.BIG);
  toggleItem(settings, 'not-an-item');
  assert.deepEqual(allowedItems(settings), BUILT_ITEMS.filter((id) => id !== KART_ITEMS.BIG));
  toggleItems(settings);
  assert.deepEqual(allowedItems(settings), []);
  toggleItems(settings);
  assert.equal(allowedItems(settings).includes(KART_ITEMS.BIG), false, 'each item keeps its switch');
});

// Drives a 1-player race with every built item allowed for `seconds` of race time. Returns the race and the
// items CPU karts were seen running as effects.
function raceWithItems(seconds) {
  const race = createRace(track, ['p1'], 3, 150, 'normal', BUILT_ITEMS);
  const controlsFor = steadyDriver(race);
  const cpuEffects = new Set();
  let boxesBroken = 0;
  for (let step = 0; step < seconds / STEP; step += 1) {
    stepRace(race, track, controlsFor, STEP);
    race.karts.filter((kart) => kart.playerId === null && kart.item.effect).forEach((kart) => cpuEffects.add(kart.item.effect.item));
    boxesBroken = Math.max(boxesBroken, race.items.boxes.filter((box) => box.returnLeft > 0).length);
  }
  return { race, cpuEffects, boxesBroken };
}

test('CPU karts pick up and use items; the items stay plain data and the race repeats exactly', () => {
  const { race, cpuEffects, boxesBroken } = raceWithItems(GO_AT + 45);
  assert.ok(boxesBroken > 0, 'karts broke boxes');
  assert.ok(cpuEffects.size >= 2, `CPU karts used items (${[...cpuEffects]})`);
  // The items' part of the race; the karts' own fields are not all JSON (an unpressed Drift's
  // sinceDriftPress is Infinity, kart-techniques.js).
  const itemState = { items: race.items, karts: race.karts.map((kart) => kart.item) };
  assert.deepEqual(JSON.parse(JSON.stringify(itemState)), itemState, 'the items are plain data');
  assert.equal(JSON.stringify(raceWithItems(GO_AT + 45).race), JSON.stringify(race), 'the same race twice');
});
