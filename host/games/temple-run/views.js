// What each phone is told in the temple run: small plain objects the controller's showView draws. No DOM. Used by
// index.js (relative imports only, so Node unit tests can load it).

import { downedRunners, livingRunners, turnPrompt, REVIVE_COST } from './rules.js';

// The result is { meters, seconds, coins } of the last round, or null.
export function lobbyView({ ready, readyCount, playerCount, result }) {
  return { phase: 'lobby', ready, readyCount, playerCount, result };
}

// A player who is in the room but not in the round (it started without them).
export function watchingView() {
  return { phase: 'run', role: 'runner', status: 'out', meters: 0, alive: 0, downed: [], countdown: 0, reviveLeft: 0, coins: 0, lives: 0, maxLives: 0, reviveCost: REVIVE_COST, power: null, turn: null };
}

// The longest-running powerup, as { kind, secs }, or null. Seconds are whole, so the view changes once a second.
function activePower(player) {
  const powers = [['boost', player.boostT], ['shield', player.shieldT], ['magnet', player.magnetT]];
  const [kind, seconds] = powers.reduce((best, power) => (power[1] > best[1] ? power : best));
  return seconds > 0 ? { kind, secs: Math.ceil(seconds) } : null;
}

// Metres are rounded to 10 so the view changes about twice a second, not every frame.
export function roundView(round, playerId, nameOf) {
  const player = round.players.get(playerId);
  const canRevive = player.role === 'runner' && player.status === 'alive';
  return {
    phase: round.phase === 'countdown' ? 'countdown' : 'run',
    role: player.role,
    status: player.status,
    countdown: Math.max(1, Math.ceil(round.countdown)),
    reviveLeft: Math.ceil(player.downT),
    downed: canRevive ? downedRunners(round).map((runner) => ({ id: runner.id, name: nameOf(runner.id) })) : [],
    meters: Math.floor(round.bestZ / 10) * 10,
    alive: livingRunners(round).length,
    coins: round.coins,
    lives: player.role === 'runner' ? player.lives : 0,
    maxLives: player.role === 'runner' ? round.settings.lives : 0,
    reviveCost: REVIVE_COST,
    power: player.role === 'runner' ? activePower(player) : null,
    turn: round.phase === 'run' ? turnPrompt(round, player) : null,
  };
}
