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
  // The ramp (M8b): how fast it throws a kart up. With the game's gravity, 6.5 keeps a top-speed kart in the air
  // about 0.5 s, 16 units, a little over the course's jump gap (14).
  { key: 'rampLaunchSpeed', group: 'Items', label: 'Ramp, launch', unit: 'units/s', min: 2, max: 14, step: 0.5, value: 6.5 },
  // Teleport (M8c): how far along the road, forward or back, each kart may hop.
  { key: 'teleportReach', group: 'Items', label: 'Teleport, reach', unit: 'units', min: 10, max: 80, step: 1, value: 40 },
  // Magnet (M8c): karts ahead within the reach are pulled back, by up to the pull (units/s^2, falling to 0 at
  // the reach's edge). With the karts' acceleration, a pull of 7.5 holds a kart 10 ahead at about three
  // quarters of its top speed.
  { key: 'magnetReach', group: 'Items', label: 'Magnet, reach', unit: 'units', min: 10, max: 60, step: 1, value: 30 },
  { key: 'magnetPull', group: 'Items', label: 'Magnet, pull', unit: 'units/s2', min: 0, max: 30, step: 0.5, value: 7.5 },
  // Push (M8c): karts within the reach are pushed away, by up to the push (units/s^2, falling to 0 at the
  // reach's edge), with loose grip, so a kart alongside slides about a lane (4 units) aside in half a second.
  { key: 'pushReach', group: 'Items', label: 'Push, reach', unit: 'units', min: 4, max: 30, step: 0.5, value: 12 },
  { key: 'pushStrength', group: 'Items', label: 'Push, strength', unit: 'units/s2', min: 0, max: 150, step: 1, value: 60 },
  // Sticky walls (M8c): how long a kart touching a wall is held, and how fast it is pushed off it after.
  { key: 'stickyHoldSeconds', group: 'Items', label: 'Sticky walls, hold', unit: 's', min: 0.2, max: 4, step: 0.1, value: 1.5 },
  { key: 'stickyPushOffSpeed', group: 'Items', label: 'Sticky walls, push off', unit: 'units/s', min: 0, max: 15, step: 0.5, value: 6 },
]);
