// The join window (#join-window), the one way into a game: the big QR code, the room code, the link and the
// players so far, over the running game. Opened by the game session when a game's room opens and by the top
// bar's Add players button; Done or a click outside the panel closes it. Used by host/game-session.js.

import { qrCodeSvg, joinUrl } from '/host/qr-code.js';
import { displayName, colorText, playersInSlotOrder } from '/host/roster.js';
import { chipStatusText } from '/host/shell-rules.js';

// Often enough that a phone joining shows up at once and the "back in 0:24" countdowns tick smoothly.
const REFRESH_MS = 250;

const joinWindow = document.getElementById('join-window');
const panel = joinWindow.querySelector('.join-panel');
const playerList = document.getElementById('join-players');
// The room whose players the open window shows; null while it is closed.
let shownRoom = null;
let refreshTimer = null;

document.getElementById('join-done-button').addEventListener('click', closeJoinWindow);
joinWindow.addEventListener('click', (event) => {
  if (!panel.contains(event.target)) {
    closeJoinWindow();
  }
});

// Called for each game's room, once the server has given it its code. The QR holds the whole join link, so a
// phone that scans it lands on the join screen with the code filled in; the text shows only the address, short
// enough to type, and the code above it.
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

// The players as chips (dot and name) in slot order, a dropped one dimmed with "back in 0:24" beside its name.
// Redrawn whole: nothing in the list is clicked, so nothing is lost by it.
function refresh() {
  const now = Date.now();
  const chips = playersInSlotOrder(shownRoom.players).map((player) => {
    const chip = document.createElement('span');
    chip.className = 'pp-chip';
    chip.classList.toggle('away', !player.connected);
    chip.dataset.playerId = player.playerId;
    const dot = document.createElement('span');
    dot.className = 'pp-dot';
    dot.style.setProperty('--pp-dot-color', colorText(player));
    const name = document.createElement('span');
    // Names come from phones, so they only ever go in as text.
    name.textContent = displayName(player);
    // Empty for a connected player, which the chip's CSS hides.
    const status = document.createElement('span');
    status.className = 'pp-muted';
    status.textContent = chipStatusText(player, now);
    chip.append(dot, name, status);
    return chip;
  });
  playerList.replaceChildren(...chips);
}
