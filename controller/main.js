// Controller entry point: joins a room, shows the lobby or the input lab as the host says, and shows
// "Reconnecting..." while controller/connection.js gets the player back into their slot.
// Loaded by controller/index.html.

import { MESSAGE_TYPES, JOIN_FAILURE_REASONS, CONTROLLER_SCREENS } from '/shared/protocol.js';
import { keepScreenAwake } from '/shared/wake-lock.js';
import { createConnection, ROOM_CLOSED, UNREACHABLE } from '/controller/connection.js';
import { saveSession, loadSession, clearSession, saveName, loadName } from '/controller/session-store.js';
import { detectPlatform, detectBrowser, listDeviceInfo } from '/controller/device-info.js';
import { showLobbyState, showConnectedPlaceholder, onReadyChange } from '/controller/lobby-screen.js';
import { startInputLab, stopInputLab } from '/controller/input-lab.js';

const joinScreen = document.getElementById('join-screen');
const joinForm = document.getElementById('join-form');
const nameInput = document.getElementById('player-name');
const roomCodeInput = document.getElementById('room-code');
const joinButton = document.getElementById('join-button');
const joinStatus = document.getElementById('join-status');
const lobbyScreen = document.getElementById('lobby-screen');
const lobbyRoom = document.getElementById('lobby-room');
const padScreen = document.getElementById('pad-screen');
const padStatus = document.getElementById('pad-status');
const reconnectOverlay = document.getElementById('reconnect-overlay');
const reconnectText = document.getElementById('reconnect-text');
const reconnectButton = document.getElementById('reconnect-button');

const END_TEXT = {
  [JOIN_FAILURE_REASONS.NO_SUCH_ROOM]: 'No room with that code. Check the code on the big screen.',
  [JOIN_FAILURE_REASONS.ROOM_FULL]: 'That room is full.',
  [JOIN_FAILURE_REASONS.REJOIN_REFUSED]: 'You were away too long, so your place was given up. Join again.',
  [ROOM_CLOSED]: 'The host left the game.',
  [UNREACHABLE]: 'Could not reach the server.',
};

let isLabRunning = false;

const connection = createConnection({
  onJoined: (session) => {
    saveSession(session);
    reconnectOverlay.hidden = true;
    lobbyRoom.textContent = `Room ${session.roomCode}`;
    padStatus.textContent = `In room ${session.roomCode}`;
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
    showJoinScreen(END_TEXT[reason] || `Could not join (${reason}).`);
  },
});

function handleHostMessage(message) {
  if (message.type !== MESSAGE_TYPES.CONTROLLER_STATE) {
    console.warn('Controller ignoring unexpected message:', message);
    return;
  }
  if (message.screen === CONTROLLER_SCREENS.INPUT_LAB) {
    showInputLab();
  } else {
    stopLab();
    showLobbyState(message);
    showScreen(lobbyScreen);
  }
}

// After a rejoin the host sends the lab screen again; a lab that is still running just carries on.
function showInputLab() {
  showScreen(padScreen);
  if (!isLabRunning) {
    isLabRunning = true;
    startInputLab((message) => connection.send(message));
  }
}

function stopLab() {
  if (isLabRunning) {
    isLabRunning = false;
    stopInputLab();
  }
}

function showScreen(screen) {
  for (const each of [joinScreen, lobbyScreen, padScreen]) {
    each.hidden = each !== screen;
  }
}

function showJoinScreen(statusText) {
  stopLab();
  showScreen(joinScreen);
  joinButton.disabled = false;
  joinStatus.textContent = statusText;
}

function showReconnectOverlay(text, offerButton) {
  reconnectText.textContent = text;
  reconnectButton.hidden = !offerButton;
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
