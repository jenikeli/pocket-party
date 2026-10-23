// The lobby's rules: the room settings and their limits, and when the chosen game may start.
// Plain functions (no Phaser, no DOM), so they can be unit tested. Used by host/room.js and the lobby scene.

import { MAX_PLAYERS } from '../shared/protocol.js';

// The lowest the max players setting goes. Each game has its own minimum too (host/games/index.js).
export const MIN_PLAYERS = 2;

export const DEFAULT_SETTINGS = Object.freeze({
  maxPlayers: 6,
  // How long a dropped player's slot is held for them. Short, so a phone that is really gone does not hold
  // the game up for long; the host can raise it, or remove a player at once.
  graceSeconds: 30,
});

const GRACE_STEP_SECONDS = 30;
const MIN_GRACE_SECONDS = 30;
const MAX_GRACE_SECONDS = 600;

// The player limit after pressing - or + (`step` is -1 or 1). It never goes below the players already in
// the room (the server would not remove them, so the setting would lie) or outside MIN_PLAYERS..MAX_PLAYERS.
export function stepMaxPlayers(maxPlayers, step, playerCount) {
  const lowest = Math.max(MIN_PLAYERS, playerCount);
  return Math.min(Math.max(maxPlayers + step, lowest), MAX_PLAYERS);
}

export function stepGraceSeconds(graceSeconds, step) {
  const next = graceSeconds + step * GRACE_STEP_SECONDS;
  return Math.min(Math.max(next, MIN_GRACE_SECONDS), MAX_GRACE_SECONDS);
}

// The game starts once the number of players fits the chosen game (`game` is its registry entry from
// host/games/index.js: { title, minPlayers, maxPlayers }) and every player is connected and ready. A player in
// their grace period holds the start up, because starting without them would leave them out of the game.
export function canStartGame(players, game) {
  const all = [...players.values()];
  return (
    all.length >= game.minPlayers &&
    all.length <= game.maxPlayers &&
    all.every((player) => player.connected && player.ready)
  );
}

// One line for the lobby saying what the game is waiting for.
export function describeWaitingFor(players, game) {
  const all = [...players.values()];
  if (all.length < game.minPlayers) {
    return `Waiting for players (at least ${game.minPlayers})`;
  }
  if (all.length > game.maxPlayers) {
    return `${game.title} takes at most ${game.maxPlayers} players`;
  }
  if (all.some((player) => !player.connected)) {
    return 'Waiting for a player to reconnect';
  }
  const notReady = all.filter((player) => !player.ready).length;
  return notReady === 1 ? 'Waiting for 1 player to be ready' : `Waiting for ${notReady} players to be ready`;
}
