// Unit tests for the 3D race's stand-ins (stand-ins.js): the self-driving karts in the players' places that the
// setup screen's Watch (1 to 4 views, no phones) and the Measure tool race.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStandInRace, MAX_STAND_INS } from '../../host/games/kart-3d/stand-ins.js';
import { stepRace, FIELD_SIZE, DEFAULT_ENGINE_CLASS } from '../../host/games/kart-3d/race.js';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { TEST_TRACK } from '../../host/games/kart-3d/test-track.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';

const track = buildTrack(TEST_TRACK);

test('1 to 4 stand-ins race as players, in their colours, with CPU karts filling the field', () => {
  for (let count = 1; count <= MAX_STAND_INS; count += 1) {
    const { race, players } = createStandInRace(track, count, 2, DEFAULT_ENGINE_CLASS, 'normal');
    assert.equal(players.size, count);
    assert.deepEqual([...players.values()].map((player) => player.colorIndex), [...Array(count).keys()]);
    assert.ok([...players.values()].every((player) => player.connected && player.name.startsWith('View ')));
    assert.equal(race.karts.length, FIELD_SIZE);
    assert.equal(race.laps, 2);
    const standInKarts = race.karts.filter((kart) => kart.playerId !== null);
    assert.deepEqual(standInKarts.map((kart) => kart.playerId).sort(), [...players.keys()].sort());
  }
});

test('the stand-ins drive themselves, each with a CPU driver of its own', () => {
  const { race, players } = createStandInRace(track, MAX_STAND_INS, 3, DEFAULT_ENGINE_CLASS, 'normal');
  const drivers = race.karts.filter((kart) => players.has(kart.playerId)).map((kart) => kart.cpu);
  assert.ok(drivers.every((cpu) => cpu !== null));
  assert.equal(new Set(drivers.map((cpu) => cpu.offset)).size, drivers.length, 'each keeps its own offset from the line');
  // Given only neutral controls (the race asks for a player's Go button during the countdown), they still drive:
  // a kart with a CPU driver drives itself.
  for (let step = 0; step < 60 * 15; step += 1) {
    stepRace(race, track, () => NEUTRAL_CONTROLS, 1 / 60);
  }
  for (const kart of race.karts.filter((each) => players.has(each.playerId))) {
    assert.ok(kart.distance > 50, `${kart.playerId} drove on (${kart.distance.toFixed(0)} units)`);
  }
});

test('the stand-ins race with the allowed items, and with none by default', () => {
  assert.deepEqual(createStandInRace(track, 1, 2, DEFAULT_ENGINE_CLASS, 'normal').race.items.allowed, []);
  const { race } = createStandInRace(track, 2, 2, DEFAULT_ENGINE_CLASS, 'normal', ['magnet', 'push'], 77);
  assert.deepEqual(race.items.allowed, ['magnet', 'push']);
  assert.equal(race.items.random, 77, 'the item seed is passed on');
});

test('a race takes 1 to 4 stand-ins', () => {
  assert.throws(() => createStandInRace(track, 0, 3, DEFAULT_ENGINE_CLASS, 'normal'), /1 to 4/);
  assert.throws(() => createStandInRace(track, MAX_STAND_INS + 1, 3, DEFAULT_ENGINE_CLASS, 'normal'), /1 to 4/);
});
