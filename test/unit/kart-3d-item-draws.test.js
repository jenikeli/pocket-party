// Unit tests for how the 3D race draws items (M8d): every allowed item equally likely at every place, the item
// drawn when the roulette stops (not at the pickup), a different sequence for each seed, and the item list with
// big, small and bouncy gone and the jump in. The race is plain data, stepped by hand as in kart-3d-items.test.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { pointAt } from '../../host/games/kart-3d/track.js';
import { createRace, playerKart, RACE_PHASES } from '../../host/games/kart-3d/race.js';
import { GO_AT } from '../../host/games/kart-3d/rocket-start.js';
import { tuning } from '../../host/games/kart-3d/tuning.js';
import { KART_ITEMS } from '../../shared/protocol.js';
import { stepItems, drawItem, freshItemSeed } from '../../host/games/kart-3d/items/item-rules.js';
import { BUILT_ITEMS } from '../../host/games/kart-3d/items/item-catalog.js';
import { runningEffect } from '../../host/games/kart-3d/items/effect-rules.js';
import { ITEM_ICONS } from '../../shared/item-icons.js';

const STEP = 1 / 60;
const track = buildTrack(SEASIDE_SKYWAY);

// A one-player race past GO with every built item allowed, drawing from `seed`.
function racingRace(seed) {
  const race = createRace(track, ['p1'], 3, 150, 'normal', BUILT_ITEMS, seed);
  race.phase = RACE_PHASES.RACING;
  race.time = GO_AT;
  return race;
}

function stepItemsFor(race, seconds) {
  for (let step = 0; step < Math.round(seconds / STEP); step += 1) {
    stepItems(race, track, STEP);
    race.time += STEP;
  }
}

// Puts the player's kart on the first box so it breaks and the roulette starts.
function startRoulette(race) {
  const kart = playerKart(race, 'p1');
  const box = race.items.boxes[0];
  kart.position = pointAt(track, box.s, box.lateral).position;
  kart.s = box.s;
  stepItems(race, track, STEP);
}

// Breaks a box, runs the roulette out and returns the item held.
function pickUpAndWait(race) {
  startRoulette(race);
  stepItemsFor(race, tuning.itemRouletteSeconds + 0.1);
  return playerKart(race, 'p1').item.held;
}

test('big, small and bouncy are gone; the built items are the other six, the jump among them, each with an icon', () => {
  const six = ['blocker', 'jump', 'magnet', 'push', 'sticky', 'teleport'];
  assert.deepEqual([...BUILT_ITEMS].sort(), six);
  assert.deepEqual(Object.keys(ITEM_ICONS).sort(), six);
  assert.deepEqual(Object.values(KART_ITEMS).sort(), six);
});

test('drawItem: every allowed item is equally likely, whatever the list', () => {
  for (const allowed of [BUILT_ITEMS, BUILT_ITEMS.slice(0, 3), [KART_ITEMS.PUSH]]) {
    const counts = Object.fromEntries(allowed.map((id) => [id, 0]));
    const draws = 6000;
    for (let index = 0; index < draws; index += 1) {
      counts[drawItem(allowed, index / draws)] += 1;
    }
    Object.values(counts).forEach((count) => assert.ok(Math.abs(count - draws / allowed.length) <= 1, JSON.stringify(counts)));
  }
  assert.equal(drawItem([KART_ITEMS.PUSH], 0.999999), KART_ITEMS.PUSH, 'one allowed item always comes up');
});

test('the odds do not depend on the place: first and last draw the same item from the same seed', () => {
  const [first, last] = [1, 12].map((place) => {
    const race = racingRace(5);
    playerKart(race, 'p1').place = place;
    return pickUpAndWait(race);
  });
  assert.equal(first, last);
});

test('the item is drawn when the roulette stops, not at the pickup', () => {
  const heldWith = (seedAtStop) => {
    const race = racingRace(1);
    startRoulette(race);
    race.items.random = seedAtStop;
    stepItemsFor(race, tuning.itemRouletteSeconds + 0.1);
    return playerKart(race, 'p1').item.held;
  };
  const held = new Set(Array.from({ length: 20 }, (unused, seed) => heldWith(seed)));
  assert.ok(held.size > 1, `changing the seed after the pickup changes the item (${[...held]})`);
  assert.equal('landing' in racingRace(1).karts[0].item, false, 'nothing is drawn at the pickup');
});

test('two seeds give different first items over a field of pickups, and one seed repeats', () => {
  const firstItems = (seed) => Array.from({ length: 12 }, (unused, index) => pickUpAndWait(racingRace(seed * 100 + index)));
  assert.notDeepEqual(firstItems(1), firstItems(2));
  assert.deepEqual(firstItems(1), firstItems(1));
  assert.ok(new Set(firstItems(1)).size >= 3, 'a field draws a spread of items');
});

test('freshItemSeed gives a whole number, different from one call to the next', () => {
  const seeds = Array.from({ length: 5 }, freshItemSeed);
  seeds.forEach((seed) => assert.ok(Number.isInteger(seed) && seed >= 0));
  assert.ok(new Set(seeds).size > 1);
});

test('runningEffect reads a kart\'s effect, null with none or with no item at all', () => {
  assert.equal(runningEffect({}), null);
  assert.equal(runningEffect({ item: { effect: null } }), null);
  assert.equal(runningEffect({ item: { effect: { item: KART_ITEMS.MAGNET, left: 1 } } }), KART_ITEMS.MAGNET);
});
