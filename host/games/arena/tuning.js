// Every match number of Spirefall that is not a card's (cards are in shared/arena-cards.js): clock, elixir, deploy
// times, ranges and the two tower types. Tune here. Used by the rules (sim-*.js, match.js) and the CPU.

export const TUNING = Object.freeze({
  introSeconds: 3,
  regulationSeconds: 180,
  overtimeSeconds: 120,
  elixirSecondsPerPoint: 2.8,
  maxElixir: 10,
  startElixir: 5,
  deploySeconds: 1.0,
  spellCastSeconds: 0.4,
  // How far a troop notices enemies, edge to edge, and how often it looks again.
  sightRange: 5.5,
  retargetSeconds: 0.1,
  // The share of a hit time spent winding up before the first strike on a new target.
  windupShare: 0.35,
  projectileSpeed: 11,
  towerProjectileSpeed: 14,
  // Spells deal this share of their damage to towers.
  towerSpellFactor: 0.35,
  warden: Object.freeze({ hp: 1400, damage: 50, hit: 0.9, range: 7.5 }),
  keep: Object.freeze({ hp: 2400, damage: 70, hit: 1.0, range: 7, wakeSeconds: 0.5 }),
});

// The elixir speed multiplier: x2 in the last minute of regulation and the first of overtime, x3 in the last of overtime.
export function elixirMultiplier(phase, remainingSeconds) {
  if (phase === 'overtime') {
    return remainingSeconds <= 60 ? 3 : 2;
  }
  return phase === 'regulation' && remainingSeconds <= 60 ? 2 : 1;
}
