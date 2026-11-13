// The grace period of the host's roster: how long a player whose phone dropped keeps their slot before the host
// asks the server to free it. Used by host/room.js.

// `graceSeconds()` is the lobby setting's current length and `removePlayer(playerId)` asks the server to free the
// slot. Returns { start(player), end(player) }.
export function createGracePeriods({ graceSeconds, removePlayer }) {
  // playerId -> setTimeout id, for players in their grace period.
  const graceTimers = new Map();

  // The host times the grace period because its length is a lobby setting. When it runs out the host asks the
  // server to free the slot, and removes the player only when PLAYER_LEFT confirms it. So if a rejoin reaches the
  // server first, the server refuses the removal and both sides still agree.
  function start(player) {
    const graceMs = graceSeconds() * 1000;
    player.connected = false;
    player.graceEndsAt = Date.now() + graceMs;
    clearTimeout(graceTimers.get(player.playerId));
    const timer = setTimeout(() => removePlayer(player.playerId), graceMs);
    graceTimers.set(player.playerId, timer);
  }

  function end(player) {
    clearTimeout(graceTimers.get(player.playerId));
    graceTimers.delete(player.playerId);
    player.connected = true;
    player.graceEndsAt = null;
  }

  return { start, end };
}
