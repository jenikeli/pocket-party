// The CPU drivers' levels (M7e), chosen on the host's setup screen like MK8DX's CPU setting in versus races: how
// close to the limit they corner, which spark level they drift for, how often they rocket start and trick, and
// how far they wander from the racing line. Plain data. Used by cpu-driver.js, race.js and panels.js.

// label: what the setup screen shows. rocketStartChance: the share of CPU karts that rocket start (race.js).
export const CPU_LEVELS = Object.freeze({
  easy: Object.freeze({ label: 'Easy', rocketStartChance: 0.1 }),
  normal: Object.freeze({ label: 'Normal', rocketStartChance: 0.4 }),
  hard: Object.freeze({ label: 'Hard', rocketStartChance: 0.8 }),
});
export const DEFAULT_CPU_LEVEL = 'normal';
