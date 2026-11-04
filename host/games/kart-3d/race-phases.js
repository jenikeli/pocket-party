// The 3D race's phases, in their own file so the item rules (items/item-rules.js) can read them without
// importing race.js, which imports the item rules. race.js re-exports them for everyone else.

export const RACE_PHASES = Object.freeze({ COUNTDOWN: 'countdown', RACING: 'racing', RESULTS: 'results' });
