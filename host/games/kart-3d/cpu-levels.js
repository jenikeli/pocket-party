// The CPU drivers' levels (M7e), chosen on the host's setup screen like MK8DX's CPU setting in versus races: how
// fast they drive and how close to the limit they corner, which spark level they drift for, how often they rocket
// start and trick, and how far they wander from the racing line. Plain data. Used by cpu-driver.js,
// cpu-drift.js, cpu-trick.js, race.js and panels.js.

// label: what the setup screen shows. rocketStartChance: the share of CPU karts that rocket start (race.js).
// throttleShare: the share of its top speed it drives at (at 150cc most corners are taken flat out, so how close
// to the limit it corners alone hardly tells the levels apart). cornerShare: the share of the tightest turn
// (steering, or a drift while drifting) it plans its corner speeds for: below 1, it brakes earlier and corners
// further from the limit. offsetRange: its own offset from the racing line is drawn from -offsetRange to
// +offsetRange units. skillRange: its corner share is moved by up to this share either way, so no two karts of a
// level are quite alike. driftTurnDegrees: it drifts a corner whose line turns at least this far. sparkTarget:
// the spark level it drifts for (1 blue, 2 orange, 3 purple): once there it lets go as the corner ends.
// overshootDegrees: if a corner ends before that level, it may turn in this much further than its line (still
// drifting) to reach it, room allowing. pumpsDrift: it pumps the stick in a drift to charge faster
// (cpu-drift.js). trickChance: the share of jumps it tricks off.
export const CPU_LEVELS = Object.freeze({
  easy: Object.freeze({
    label: 'Easy',
    rocketStartChance: 0.1,
    throttleShare: 0.95,
    cornerShare: 0.72,
    offsetRange: 1.6,
    skillRange: 0.04,
    driftTurnDegrees: 80,
    sparkTarget: 1,
    overshootDegrees: 0,
    pumpsDrift: false,
    trickChance: 0.3,
  }),
  normal: Object.freeze({
    label: 'Normal',
    rocketStartChance: 0.4,
    throttleShare: 0.98,
    cornerShare: 0.84,
    offsetRange: 1.1,
    skillRange: 0.03,
    driftTurnDegrees: 55,
    sparkTarget: 2,
    overshootDegrees: 15,
    pumpsDrift: true,
    trickChance: 0.7,
  }),
  hard: Object.freeze({
    label: 'Hard',
    rocketStartChance: 0.8,
    throttleShare: 1,
    cornerShare: 0.93,
    offsetRange: 0.7,
    skillRange: 0.02,
    driftTurnDegrees: 45,
    sparkTarget: 3,
    overshootDegrees: 30,
    pumpsDrift: true,
    trickChance: 0.95,
  }),
});
export const DEFAULT_CPU_LEVEL = 'normal';
