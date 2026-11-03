// Unit tests for the CPU drivers' part of the 3D race's rules (host/games/kart-3d/race-cpus.js, through race.js):
// every CPU kart driven at the race's level, rocket starts by level, and the catch-up to the leading player.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { createRace, stepRace, playerKart, RACE_PHASES } from '../../host/games/kart-3d/race.js';
import { updateCpuPaces } from '../../host/games/kart-3d/race-cpus.js';
import { BOOST_KINDS } from '../../host/games/kart-3d/kart-boosts.js';
import { GO_AT } from '../../host/games/kart-3d/rocket-start.js';
import { tuning, resetTuning } from '../../host/games/kart-3d/tuning.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';

const STEP = 1 / 60;
const track = buildTrack(SEASIDE_SKYWAY);

function runTo(race, time) {
  while (race.time < time) {
    stepRace(race, track, () => NEUTRAL_CONTROLS, STEP);
  }
}

function rocketStarts(level) {
  const race = createRace(track, ['p1'], 3, 150, level);
  runTo(race, GO_AT + STEP);
  return race.karts.filter((kart) => kart.playerId === null && kart.boost?.kind === BOOST_KINDS.ROCKET_START).length;
}

test('every CPU kart has a driver of the race\'s level, each its own; players drive themselves', () => {
  const race = createRace(track, ['p1', 'p2'], 3, 150, 'hard');
  const cpuKarts = race.karts.filter((kart) => kart.playerId === null);
  assert.equal(race.cpuLevel, 'hard');
  assert.ok(cpuKarts.every((kart) => kart.cpu.level === 'hard'));
  assert.equal(new Set(cpuKarts.map((kart) => kart.cpu.offset)).size, cpuKarts.length);
  assert.equal(playerKart(race, 'p1').cpu, null);
});

test('CPU karts rocket start, more of them the higher the level, the same ones every race', () => {
  const counts = ['easy', 'normal', 'hard'].map(rocketStarts);
  assert.ok(counts[0] < counts[1] && counts[1] < counts[2], `rocket starts by level: ${counts}`);
  assert.equal(rocketStarts('normal'), counts[1]);
});

test('the catch-up: a CPU kart behind the leading player is faster, one ahead slower, none once no player is left', () => {
  const race = createRace(track, ['p1'], 3, 150, 'normal');
  const player = playerKart(race, 'p1');
  const [ahead, behind] = race.karts.filter((kart) => kart.playerId === null);
  player.distance = 500;
  ahead.distance = 500 + tuning.cpuCatchUpRange;
  behind.distance = 500 - tuning.cpuCatchUpRange;
  updateCpuPaces(race);
  assert.ok(Math.abs(ahead.paceShare - (1 - tuning.cpuCatchUp)) < 1e-9);
  assert.ok(Math.abs(behind.paceShare - (1 + tuning.cpuCatchUp)) < 1e-9);
  assert.equal(player.paceShare, 1, 'players are never caught up');
  race.karts = race.karts.filter((kart) => kart !== player);
  updateCpuPaces(race);
  assert.equal(ahead.paceShare, 1);
});

test('the catch-up off (strength 0): CPU karts keep their own top speed through a race', (t) => {
  t.after(resetTuning);
  tuning.cpuCatchUp = 0;
  const race = createRace(track, ['p1'], 3, 150, 'normal');
  runTo(race, GO_AT + 10);
  assert.equal(race.phase, RACE_PHASES.RACING);
  assert.ok(race.karts.every((kart) => kart.paceShare === 1));
});
