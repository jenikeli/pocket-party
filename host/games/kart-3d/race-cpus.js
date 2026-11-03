// The CPU drivers' part of the 3D race's rules (M7e): handing a kart to the CPU driver (cpu-driver.js), the CPU
// karts' rocket starts at GO, and their catch-up to the leading player every step (cpu-pace.js). Plain functions
// on the race's plain data, unit tested in Node through race.js, which calls them.

import { createCpu } from './cpu-driver.js';
import { cpuPaceShare } from './cpu-pace.js';
import { CPU_LEVELS } from './cpu-levels.js';
import { startBoost, BOOST_KINDS } from './kart-boosts.js';
import { rocketBoostSeconds } from './rocket-start.js';
import { createRandom, between } from './random.js';
import { tuning } from './tuning.js';

// The CPU karts' drivers take their seeds from their grid index; a kart handed over later (a finished player's,
// a stand-in's) takes one past the field's, so its driver differs from every CPU kart's.
const HANDED_OVER_SEED = 100;
// The rocket starts are drawn from their own seeds, apart from the drivers' own variety.
const START_SEED = 1000;

// From now on the CPU driver drives `kart`, at the race's CPU level. `seedIndex` tells the drivers apart: the
// grid index for a CPU kart, anything for one handed over.
export function driveByCpu(race, kart, seedIndex) {
  kart.cpu = createCpu(race.cpuLevel, seedIndex);
}

// A player's kart handed to the CPU driver (finished, at the results, or a stand-in).
export function handOver(race, kart) {
  driveByCpu(race, kart, HANDED_OVER_SEED + race.karts.indexOf(kart));
}

// At GO: each CPU kart rocket starts with its level's chance, timed somewhere in the window, so its boost is
// as long as a player's pressing then would be. CPU karts never stall.
export function startCpuKarts(race) {
  const { rocketStartChance } = CPU_LEVELS[race.cpuLevel];
  race.karts.filter((kart) => kart.playerId === null).forEach((kart, index) => {
    const random = createRandom(START_SEED + index);
    if (random() < rocketStartChance) {
      startBoost(kart, BOOST_KINDS.ROCKET_START, rocketBoostSeconds(between(random, tuning.rocketFrom, tuning.rocketTo)));
    }
  });
}

// Every step of the race: each CPU kart's top speed share from how far it is ahead of (or behind) the leading
// player's kart. With no player left, nobody is caught up to.
export function updateCpuPaces(race) {
  const players = race.karts.filter((kart) => kart.playerId !== null);
  const leadDistance = Math.max(...players.map((kart) => kart.distance));
  for (const kart of race.karts.filter((each) => each.playerId === null)) {
    kart.paceShare = players.length === 0 ? 1 : cpuPaceShare(kart.distance - leadDistance);
  }
}
