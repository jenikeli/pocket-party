// Controller entry point: joins a room, shows the lobby or the host's current game as the host says, and shows
// "Reconnecting..." while controller/connection.js gets the player back into their slot.
// Loaded by controller/index.html.

import { MESSAGE_TYPES, JOIN_FAILURE_REASONS, CONTROLLER_SCREENS } from '/shared/protocol.js';
import { keepScreenAwake } from '/shared/wake-lock.js';
import { createConnection, ROOM_CLOSED, UNREACHABLE, KICKED, LEFT } from '/controller/connection.js';
import { saveSession, loadSession, clearSession, saveName, loadName } from '/controller/session-store.js';
import { detectPlatform, detectBrowser, listDeviceInfo } from '/controller/device-info.js';
import { showLobbyState, showConnectedPlaceholder, onReadyChange } from '/controller/lobby-screen.js';
import { showGame, stopGame } from '/controller/game-screen.js';

const joinScreen = document.getElementById('join-screen');
const joinForm = document.getElementById('join-form');
const nameInput = document.getElementById('player-name');
const roomCodeInput = document.getElementById('room-code');
const joinButton = document.getElementById('join-button');
const joinStatus = document.getElementById('join-status');
const lobbyScreen = document.getElementById('lobby-screen');
const lobbyRoom = document.getElementById('lobby-room');
const gameScreen = document.getElementById('game-screen');
const gameStatus = document.getElementById('game-status');
const reconnectOverlay = document.getElementById('reconnect-overlay');
const reconnectText = document.getElementById('reconnect-text');
const reconnectButton = document.getElementById('reconnect-button');
const overlayLeaveButton = document.getElementById('overlay-leave-button');

const END_TEXT = {
  [JOIN_FAILURE_REASONS.NO_SUCH_ROOM]: 'No room with that code. Check the code on the big screen.',
  [JOIN_FAILURE_REASONS.ROOM_FULL]: 'That room is full.',
  [JOIN_FAILURE_REASONS.GAME_IN_PROGRESS]: 'That game has already started.',
  [JOIN_FAILURE_REASONS.REJOIN_REFUSED]: 'Your place in the game is gone (away too long, or removed). Join again.',
  [ROOM_CLOSED]: 'The host left the game.',
  [UNREACHABLE]: 'Could not reach the server.',
  [KICKED]: 'The host removed you from the game.',
  [LEFT]: 'You left the game.',
};

// The room no longer exists after these, so its code is cleared from the page and the address bar.
const ROOM_GONE_REASONS = new Set([JOIN_FAILURE_REASONS.NO_SUCH_ROOM, ROOM_CLOSED]);

const connection = createConnection({
  onJoined: (session) => {
    saveSession(session);
    showRoomCodeInUrl(session.roomCode);
    reconnectOverlay.hidden = true;
    lobbyRoom.textContent = `Room ${session.roomCode}`;
    gameStatus.textContent = `In room ${session.roomCode}`;
    // After a rejoin the current screen stays up; the host's CONTROLLER_STATE follows right away either way.
    if (!joinScreen.hidden) {
      showConnectedPlaceholder();
      showScreen(lobbyScreen);
    }
    // Sent after every join and rejoin: the page may have reloaded, and the host simply keeps the latest.
    connection.send({ type: MESSAGE_TYPES.DEVICE_INFO, platform: detectPlatform(), browser: detectBrowser() });
    connection.send({ type: MESSAGE_TYPES.PLAYER_NAME, name: loadName() });
  },
  onMessage: handleHostMessage,
  onReconnecting: () => showReconnectOverlay('Reconnecting...', false),
  onOffline: () => showReconnectOverlay('Could not reconnect.', true),
  onEnded: (reason) => {
    clearSession();
    reconnectOverlay.hidden = true;
    if (ROOM_GONE_REASONS.has(reason)) {
      showRoomCodeInUrl('');
    }
    showJoinScreen(END_TEXT[reason] || `Could not join (${reason}).`);
  },
});

// The address bar always names the room this phone is in, so a reload (which rejoins only when the saved
// session's room matches ?room=) never meets a stale code. replaceState changes the URL without a reload or a
// new history entry. An empty code removes ?room= and empties the field.
function showRoomCodeInUrl(roomCode) {
  const url = new URL(location.href);
  if (roomCode === '') {
    url.searchParams.delete('room');
  } else {
    url.searchParams.set('room', roomCode);
  }
  history.replaceState(null, '', url);
  roomCodeInput.value = roomCode;
}

function handleHostMessage(message) {
  if (message.type !== MESSAGE_TYPES.CONTROLLER_STATE) {
    console.warn('Controller ignoring unexpected message:', message);
    return;
  }
  if (message.screen === CONTROLLER_SCREENS.GAME) {
    // After a rejoin the host sends the game again; a game that is still running just gets the view.
    showScreen(gameScreen);
    showGame(message.gameId, message.view, (gameMessage) => connection.send(gameMessage));
  } else {
    stopGame();
    showLobbyState(message);
    showScreen(lobbyScreen);
  }
}

function showScreen(screen) {
  for (const each of [joinScreen, lobbyScreen, gameScreen]) {
    each.hidden = each !== screen;
  }
}

function showJoinScreen(statusText) {
  stopGame();
  showScreen(joinScreen);
  joinButton.disabled = false;
  joinStatus.textContent = statusText;
}

// `offerButtons` adds "Tap to reconnect" and "Leave game", once the automatic attempts have run out.
function showReconnectOverlay(text, offerButtons) {
  reconnectText.textContent = text;
  reconnectButton.hidden = !offerButtons;
  overlayLeaveButton.hidden = !offerButtons;
  reconnectOverlay.hidden = false;
}

function showDeviceInfo() {
  const list = document.getElementById('device-info');
  for (const [label, value] of Object.entries(listDeviceInfo())) {
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    list.append(term, detail);
  }
}

joinForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const roomCode = roomCodeInput.value.trim().toUpperCase();
  if (roomCode === '') {
    joinStatus.textContent = 'Type the code shown on the big screen.';
    return;
  }
  saveName(nameInput.value.trim());
  // Closes the on-screen keyboard.
  nameInput.blur();
  roomCodeInput.blur();
  joinButton.disabled = true;
  joinStatus.textContent = 'Joining...';
  connection.join(roomCode);
});

onReadyChange((wantsReady) => connection.send({ type: MESSAGE_TYPES.SET_READY, ready: wantsReady }));
reconnectButton.addEventListener('click', () => connection.reconnect());
// A native confirm dialog is plain, but works the same on iOS and Android and cannot be tapped by accident.
for (const leaveButton of document.querySelectorAll('.leave-button')) {
  leaveButton.addEventListener('click', () => {
    if (confirm('Leave the game? Your place will be given to someone else.')) {
      connection.leave();
    }
  });
}

// Phones suspend hidden tabs, and their sockets may die without a close event, so check on the way back.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    connection.checkAfterResume();
  }
});

// pagehide fires when the tab is closed, reloaded or navigated away. Closing the socket here sends a proper
// close frame, so the host shows "waiting to reconnect" at once; without it, Chrome kept the socket open
// after the tab closed. The slot itself is kept for the grace period, because a reload looks the same.
window.addEventListener('pagehide', () => connection.disconnect());

// The host's QR code links to /?room=CODE, so scanning players only need to tap Join.
const linkRoomCode = (new URLSearchParams(location.search).get('room') || '').toUpperCase();
roomCodeInput.value = linkRoomCode;
nameInput.value = loadName();
showDeviceInfo();
keepScreenAwake((status) => (document.getElementById('wake-status').textContent = `Screen awake: ${status}`));

// A saved place in the same room (a reload, or the tab was closed and the link opened again): take it back.
// A link to a different room means a new game, so that player joins normally.
const savedSession = loadSession();
if (savedSession && (linkRoomCode === '' || linkRoomCode === savedSession.roomCode)) {
  connection.rejoin(savedSession);
}
