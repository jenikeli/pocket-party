// The join window: one big panel with the QR code, the room code, the link and the players so far, over the
// lobby or a running game. Opened by "Add players" (the lobby's and the game bar's) and by the lobby itself when
// it first shows an empty room; Done or a click outside the panel closes it. Used by host/lobby.js and
// host/game-session.js.

import { qrCodeSvg, joinUrl } from '/host/qr-code.js';
import { createPlayerChips } from '/host/lobby-players.js';
import { playRosterSounds, forgetRoster } from '/host/shell-sounds.js';

// Often enough for the "back in 0:24" countdowns to tick smoothly.
const REFRESH_MS = 250;

const joinWindow = document.getElementById('join-window');
const panel = joinWindow.querySelector('.join-panel');
const playerChips = createPlayerChips(document.getElementById('join-players'));
// The room whose players the open window shows; null while it is closed.
let shownRoom = null;
let refreshTimer = null;

document.getElementById('join-done-button').addEventListener('click', closeJoinWindow);
joinWindow.addEventListener('click', (event) => {
  if (!panel.contains(event.target)) {
    closeJoinWindow();
  }
});

// Called once, when the server has given the room its code. The QR holds the whole join link, so a phone that
// scans it lands on the join screen with the code filled in; the text shows only the address, short enough to
// type, and the code beside it.
export function setRoomCode(roomCode) {
  document.getElementById('join-qr').innerHTML = qrCodeSvg(joinUrl(location.origin, roomCode));
  document.getElementById('join-code').textContent = roomCode;
  document.getElementById('join-url').textContent = location.origin;
  // The QR uses this page's own address, and "localhost" only works on this machine, not on the phones.
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  document.getElementById('join-lan-warning').hidden = !isLocal;
}

export function openJoinWindow(room) {
  shownRoom = room;
  // Over a running game nobody watched the players, so what changed before now is not news.
  forgetRoster();
  joinWindow.hidden = false;
  refresh();
  clearInterval(refreshTimer);
  refreshTimer = setInterval(refresh, REFRESH_MS);
}

export function closeJoinWindow() {
  joinWindow.hidden = true;
  shownRoom = null;
  clearInterval(refreshTimer);
  refreshTimer = null;
}

function refresh() {
  playerChips.show(shownRoom.players, Date.now());
  playRosterSounds(shownRoom.players);
}
