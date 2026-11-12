// The lobby's rules: the room setting (how long a dropped player's slot is held) and when a game can be picked.
// Plain functions (no DOM), so they can be unit tested. Used by host/room.js, host/lobby.js and
// host/room-settings.js.

export const DEFAULT_SETTINGS = Object.freeze({
  // How long a dropped player's slot is held for them. Short, so a phone that is really gone does not hold
  // the game up for long; the host can raise it, or remove a player at once.
  graceSeconds: 30,
});

const GRACE_STEP_SECONDS = 30;
const MIN_GRACE_SECONDS = 30;
const MAX_GRACE_SECONDS = 600;

export function stepGraceSeconds(graceSeconds, step) {
  const next = graceSeconds + step * GRACE_STEP_SECONDS;
  return Math.min(Math.max(next, MIN_GRACE_SECONDS), MAX_GRACE_SECONDS);
}

// Whether Play may start `game` (its registry entry from host/games/index.js: { title, minPlayers, maxPlayers })
// with these players, from the count alone: there is no ready step in the lobby (each game's setup screen is
// where players get ready). A dropped player keeps their place, so they count and do not block: the game
// carries them until they rejoin or their slot is freed. Returns { ok, reason }, reason '' when ok.
export function canPickGame(players, game) {
  const count = players.size;
  if (count < game.minPlayers) {
    const noun = game.minPlayers === 1 ? 'player' : 'players';
    return { ok: false, reason: `${game.title} needs at least ${game.minPlayers} ${noun}` };
  }
  if (count > game.maxPlayers) {
    return { ok: false, reason: `${game.title} takes at most ${game.maxPlayers} players` };
  }
  return { ok: true, reason: '' };
}
