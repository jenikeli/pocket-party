// The cover over everything once the host's socket has closed: "Room closed." after the host pressed Close room,
// "Lost connection to the server." otherwise, and a button that opens a new room. Used by host/lobby.js, which
// hears the closed socket from the room (through the game session while a game runs).

const cover = document.getElementById('connection-lost');

document.getElementById('new-room-button').addEventListener('click', () => location.reload());

// The room is gone with the socket (the server deletes it when the host leaves), so a new room means reloading.
// The cover takes every click, so nothing underneath can be pressed any more.
export function showConnectionLost(closedByHost) {
  const message = closedByHost ? 'Room closed.' : 'Lost connection to the server.';
  document.getElementById('connection-lost-message').textContent = message;
  cover.hidden = false;
}
