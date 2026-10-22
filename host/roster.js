// The host's player list: each player's color slot, name, phone, ready flag, and whether they are connected
// or in their grace period. Plain data and functions (no Phaser, no DOM), so it can be unit tested in Node.
// Used by host/room.js, host/lobby-rules.js and the scenes.

// One color per slot. MAX_PLAYERS in shared/protocol.js is 9, so 9 colors.
export const PLAYER_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22,
  0x1abc9c, 0xff79b0, 0xa3e048,
];

const MAX_NAME_LENGTH = 12;

// `players` is a Map(playerId -> player). A player is
// { playerId, colorIndex, name, device, ready, connected, graceEndsAt }, where name and device ('iPhone Safari')
// are '' until the controller sends them, and graceEndsAt is the Date.now() time their slot is freed, or null
// while they are connected.
export function addPlayer(players, playerId) {
  const player = {
    playerId,
    colorIndex: findFreeColorIndex(players),
    name: '',
    device: '',
    ready: false,
    connected: true,
    graceEndsAt: null,
  };
  players.set(playerId, player);
  return player;
}

// The lowest color nobody holds. Disconnected players keep theirs, so a rejoin gets the same color back.
function findFreeColorIndex(players) {
  const usedIndexes = new Set([...players.values()].map((player) => player.colorIndex));
  return PLAYER_COLORS.findIndex((color, index) => !usedIndexes.has(index));
}

// Names come straight from a phone, so drop control characters and keep them short enough for the screen.
export function cleanName(rawName) {
  return String(rawName ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export function displayName(player) {
  return player.name || `Player ${player.colorIndex + 1}`;
}

// The player's color as CSS text, e.g. '#e74c3c', for Phaser text styles and the controller.
export function colorText(player) {
  return `#${PLAYER_COLORS[player.colorIndex].toString(16).padStart(6, '0')}`;
}

// Players in slot order, which is the order the lobby lists them in.
export function playersInSlotOrder(players) {
  return [...players.values()].sort((first, second) => first.colorIndex - second.colorIndex);
}

// Whole seconds until a disconnected player's slot is freed, never below 0.
export function secondsUntilFreed(player, now) {
  return Math.max(0, Math.ceil((player.graceEndsAt - now) / 1000));
}

// 125 -> '2:05'.
export function formatMinutes(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
