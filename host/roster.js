// The host's player list: each player's color slot, name, phone, and whether they are connected or in their
// grace period. Plain data and functions (no DOM), so it can be unit tested in Node. Used by host/room.js,
// the join window (host/join-window.js) and the games.

// One color per slot. MAX_PLAYERS in shared/protocol.js is 9, so 9 colors.
export const PLAYER_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22,
  0x1abc9c, 0xff79b0, 0xa3e048,
];

// The colours' names, in slot order. A player with no name is called by theirs, so the name matches their dot.
export const PLAYER_COLOR_NAMES = [
  'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Teal', 'Pink', 'Lime',
];

const MAX_NAME_LENGTH = 12;

// `players` is a Map(playerId -> player). A player is
// { playerId, colorIndex, name, device, connected, graceEndsAt }, where name and device ('iPhone Safari')
// are '' until the controller sends them, and graceEndsAt is the Date.now() time their slot is freed, or null
// while they are connected.
export function addPlayer(players, playerId) {
  const player = {
    playerId,
    colorIndex: findFreeColorIndex(players),
    name: '',
    device: '',
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
  return player.name || PLAYER_COLOR_NAMES[player.colorIndex];
}

// Gives the player the color in slot `colorIndex`. Returns true when they now hold it (also when it was theirs
// already), false when there is no such player, the index is not a slot, or another player holds it. A dropped
// player in their grace period still holds theirs, so it cannot be taken while they may come back.
export function changeColor(players, playerId, colorIndex) {
  const player = players.get(playerId);
  if (!player || !Number.isInteger(colorIndex) || colorIndex < 0 || colorIndex >= PLAYER_COLORS.length) {
    return false;
  }
  const holder = [...players.values()].find((other) => other.colorIndex === colorIndex);
  if (holder && holder !== player) {
    return false;
  }
  player.colorIndex = colorIndex;
  return true;
}

// What `playerId`'s phone shows to pick from, one per slot in order: { color, name, takenBy }. color is CSS text,
// takenBy the holder's display name, or null when the color is free or the player's own.
export function colorChoices(players, playerId) {
  return PLAYER_COLORS.map((color, index) => {
    const holder = [...players.values()].find((player) => player.colorIndex === index);
    const takenBy = holder && holder.playerId !== playerId ? displayName(holder) : null;
    return { color: colorText({ colorIndex: index }), name: PLAYER_COLOR_NAMES[index], takenBy };
  });
}

// The player's color as CSS text, e.g. '#e74c3c', for the host's pages and Phaser text, and the controller.
export function colorText(player) {
  return `#${PLAYER_COLORS[player.colorIndex].toString(16).padStart(6, '0')}`;
}

// Players in slot order, which is the order every list of them follows.
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
