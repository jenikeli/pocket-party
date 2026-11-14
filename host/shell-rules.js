// The shell's rules: how long a dropped player's slot is held (a setting the host keeps in its own storage, since
// no room outlives its game), the player range the game picker shows and the note on a player's chip in the join
// window. Plain functions (no DOM), so they can be unit tested. Used by host/room.js, host/settings.js,
// host/game-picker.js and host/join-window.js.

import { secondsUntilFreed, formatMinutes } from './roster.js';

// How long a dropped player's slot is held for them. Short, so a phone that is really gone does not hold the
// game up for long; the host can raise it, or remove a player at once.
export const DEFAULT_GRACE_SECONDS = 30;

const GRACE_STEP_SECONDS = 30;
const MIN_GRACE_SECONDS = 30;
const MAX_GRACE_SECONDS = 600;
const GRACE_STORAGE_KEY = 'pocket-party-grace-seconds';

export function stepGraceSeconds(graceSeconds, step) {
  const next = graceSeconds + step * GRACE_STEP_SECONDS;
  return Math.min(Math.max(next, MIN_GRACE_SECONDS), MAX_GRACE_SECONDS);
}

// The page's localStorage, or null where there is none: even reading the name throws when site data is blocked.
export function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// `storage` is browserStorage() or, in the tests, a localStorage-shaped fake. With no storage, when it throws
// (private windows) and for anything stored that is not one of the steps, the default holds.
export function readGraceSeconds(storage) {
  let stored;
  try {
    stored = Number(storage?.getItem(GRACE_STORAGE_KEY));
  } catch (error) {
    console.warn('Could not read the stored hold time:', error);
    return DEFAULT_GRACE_SECONDS;
  }
  const isStep =
    Number.isInteger(stored) &&
    stored >= MIN_GRACE_SECONDS &&
    stored <= MAX_GRACE_SECONDS &&
    stored % GRACE_STEP_SECONDS === 0;
  return isStep ? stored : DEFAULT_GRACE_SECONDS;
}

export function storeGraceSeconds(storage, graceSeconds) {
  try {
    storage?.setItem(GRACE_STORAGE_KEY, String(graceSeconds));
  } catch (error) {
    console.warn('Could not save the hold time:', error);
  }
}

// How many play a game, from its registry entry (host/games/index.js): '1 to 4'. A game that can start with
// nobody (the 3D race, for Watch) still reads from 1: a range from 0 players means nothing to whoever reads it.
export function playerRangeText(game) {
  return `${Math.max(game.minPlayers, 1)} to ${game.maxPlayers}`;
}

// The note beside a player's name in the join window: how long a dropped player's slot is still held
// ('back in 0:24'), empty for one who is connected.
export function chipStatusText(player, now) {
  if (player.connected) {
    return '';
  }
  return `back in ${formatMinutes(secondsUntilFreed(player, now))}`;
}
