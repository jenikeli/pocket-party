// The kart races' setup screen rules: the number of laps (the host's choice), each player's control style,
// hand and ready (their phone's choices), and when the host may start the race. Plain data and functions,
// unit tested in Node. Shared by host/games/kart-2d/ and host/games/kart-3d/ (whose engine class is its own,
// in its index.js); the settings last for as long as the game runs.

import { KART_CHOICES, KART_STEERING } from '../../shared/protocol.js';
import { displayName } from '../roster.js';

export const DEFAULT_LAPS = 3;
export const MIN_LAPS = 1;
export const MAX_LAPS = 9;

// What a player has until they choose: the stick, accelerating with Go.
const DEFAULT_STYLE = Object.freeze({ steering: KART_STEERING.STICK, autoAccelerate: false, leftHanded: false });

// Returns the setup: { laps, players }, where players maps playerId ->
// { steering, autoAccelerate, leftHanded, ready } for everyone who has chosen anything.
export function createSetup() {
  return { laps: DEFAULT_LAPS, players: {} };
}

// The laps after the host presses - or + (`step` is -1 or 1).
export function stepLaps(setup, step) {
  setup.laps = Math.min(Math.max(setup.laps + step, MIN_LAPS), MAX_LAPS);
}

// { steering, autoAccelerate, leftHanded, ready } for that player.
export function playerSetup(setup, playerId) {
  return setup.players[playerId] ?? { ...DEFAULT_STYLE, ready: false };
}

// `input` is an INPUT of kind choice from that player's phone: { choice, value }. Anything not allowed is
// ignored, since it comes straight from a phone. Steering, auto-accelerate and left-handed count at any time (a
// phone whose tilt stops working mid-race switches to the stick); ready and color only while `onSetupScreen`.
// `pickColor(playerId, colorIndex)` is the shell's, which keeps colors unique.
export function applyChoice(setup, playerId, input, onSetupScreen, pickColor) {
  const current = playerSetup(setup, playerId);
  if (input.choice === KART_CHOICES.STEERING && Object.values(KART_STEERING).includes(input.value)) {
    setup.players[playerId] = { ...current, steering: input.value };
  } else if (input.choice === KART_CHOICES.AUTO_ACCELERATE && typeof input.value === 'boolean') {
    setup.players[playerId] = { ...current, autoAccelerate: input.value };
  } else if (input.choice === KART_CHOICES.LEFT_HANDED && typeof input.value === 'boolean') {
    setup.players[playerId] = { ...current, leftHanded: input.value };
  } else if (input.choice === KART_CHOICES.COLOR && onSetupScreen) {
    pickColor(playerId, input.value);
  } else if (input.choice === KART_CHOICES.READY && typeof input.value === 'boolean' && onSetupScreen) {
    setup.players[playerId] = { ...current, ready: input.value };
  }
}

// Before every race everyone confirms again; their control styles stay.
export function clearReady(setup) {
  for (const player of Object.values(setup.players)) {
    player.ready = false;
  }
}

export function forgetPlayer(setup, playerId) {
  delete setup.players[playerId];
}

// The players (roster entries, from the list `players`) the host is waiting for: anyone not ready, and anyone
// waiting to reconnect. A dropped player holds the start up, so nobody's kart starts without
// them; the grace period frees their slot if they never come back.
export function playersHoldingUpStart(setup, players) {
  return players.filter((player) => !player.connected || !playerSetup(setup, player.playerId).ready);
}

// Why the host cannot start yet, as the line shown above Start race, or '' when they can: too few players
// (`minPlayers`: the 2D race needs 2, the 3D race races alone with CPU karts) or someone still being waited for.
export function startBlocker(setup, players, minPlayers = 1) {
  if (players.length < minPlayers) {
    return minPlayers === 1 ? 'Needs a player' : `Needs ${minPlayers} players`;
  }
  const waitingFor = playersHoldingUpStart(setup, players).map(displayName);
  return waitingFor.length > 0 ? `Waiting for ${waitingFor.join(', ')}` : '';
}

// True when the host may start: enough players, and nobody holding the start up.
export function canStartRace(setup, players, minPlayers = 1) {
  return startBlocker(setup, players, minPlayers) === '';
}
