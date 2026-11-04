// The items' tuned numbers (M8), in the same shape as tuning.js's TUNABLES, which spreads them into its list so
// the tuning panel shows them in the group Items and the rules read them from `tuning` like every other number.
// The values are plan.md's M8 guesses, to be tuned on the device run.

export const ITEM_TUNABLES = Object.freeze([
  // How long a timed item lasts (big, small, bouncy, magnet, push, the blocker, the ramp, sticky walls).
  { key: 'itemEffectSeconds', group: 'Items', label: 'Effect time', unit: 's', min: 1, max: 15, step: 0.5, value: 5 },
  // The roulette after a pickup, before the item lands.
  { key: 'itemRouletteSeconds', group: 'Items', label: 'Roulette time', unit: 's', min: 0.5, max: 5, step: 0.1, value: 2 },
  // How long a broken item box takes to come back.
  { key: 'itemBoxReturnSeconds', group: 'Items', label: 'Box comes back after', unit: 's', min: 0.5, max: 10, step: 0.5, value: 3 },
  // Big and slow: its size, top speed and mass, as shares of a normal kart's.
  { key: 'bigSize', group: 'Items', label: 'Big, size', unit: 'x', min: 1, max: 2.5, step: 0.05, value: 1.6 },
  { key: 'bigSpeedShare', group: 'Items', label: 'Big, top speed', unit: 'x top', min: 0.5, max: 1, step: 0.01, value: 0.8 },
  { key: 'bigMassShare', group: 'Items', label: 'Big, mass', unit: 'x', min: 1, max: 10, step: 0.5, value: 4 },
  // Small and fast-turning: its size, turning (steering and drift) and mass.
  { key: 'smallSize', group: 'Items', label: 'Small, size', unit: 'x', min: 0.3, max: 1, step: 0.05, value: 0.6 },
  { key: 'smallTurnShare', group: 'Items', label: 'Small, turning', unit: 'x', min: 1, max: 2.5, step: 0.05, value: 1.6 },
  { key: 'smallMassShare', group: 'Items', label: 'Small, mass', unit: 'x', min: 0.1, max: 1, step: 0.05, value: 0.5 },
  // Bouncy: a kart bumping it parts at this many times the usual parting speed.
  { key: 'bouncyBounceShare', group: 'Items', label: 'Bouncy, bounce', unit: 'x', min: 1, max: 6, step: 0.1, value: 3 },
]);
