// Controller entry point: joins a room with a code, then sends drag input to the host.
// Loaded by controller/index.html.

import { MESSAGE_TYPES, JOIN_FAILURE_REASONS } from '/shared/protocol.js';
import { openSocket } from '/shared/socket.js';
import * as dragInput from '/controller/inputs/drag.js';

const joinScreen = document.getElementById('join-screen');
const joinForm = document.getElementById('join-form');
const roomCodeInput = document.getElementById('room-code');
const joinButton = document.getElementById('join-button');
const joinStatus = document.getElementById('join-status');
const padScreen = document.getElementById('pad-screen');
const padStatus = document.getElementById('pad-status');
const dragPad = document.getElementById('drag-pad');
const stickKnob = document.getElementById('stick-knob');

// How far the on-screen knob moves (CSS px) when the stick is pushed all the way.
const KNOB_TRAVEL_PX = 60;

const JOIN_FAILURE_TEXT = {
  [JOIN_FAILURE_REASONS.NO_SUCH_ROOM]: 'No room with that code. Check the code on the big screen.',
  [JOIN_FAILURE_REASONS.ROOM_FULL]: 'That room is full.',
};

let connection = null;

function joinRoom(roomCode) {
  joinButton.disabled = true;
  joinStatus.textContent = 'Joining...';
  // Shown when the socket closes. Messages that arrive before the close replace it with the real reason.
  let leaveReason = 'Could not reach the server.';

  connection = openSocket({
    onOpen: () => connection.send({ type: MESSAGE_TYPES.JOIN, roomCode }),
    onClose: () => showJoinScreen(leaveReason),
    onMessage: (message) => {
      switch (message.type) {
        case MESSAGE_TYPES.JOINED:
          leaveReason = 'Connection lost. Join again.';
          showPadScreen(message.roomCode);
          break;
        case MESSAGE_TYPES.JOIN_FAILED:
          leaveReason = JOIN_FAILURE_TEXT[message.reason] || `Could not join (${message.reason}).`;
          break;
        case MESSAGE_TYPES.ROOM_CLOSED:
          leaveReason = 'The host left the game.';
          break;
        default:
          console.warn('Controller ignoring unexpected message:', message);
      }
    },
  });
}

function sendDragInput(value) {
  connection.send({ type: MESSAGE_TYPES.INPUT, input: value, sentAt: Date.now() });
  moveKnob(value.x, value.y);
}

function moveKnob(x, y) {
  stickKnob.style.transform = `translate(${x * KNOB_TRAVEL_PX}px, ${y * KNOB_TRAVEL_PX}px)`;
}

function showPadScreen(roomCode) {
  padStatus.textContent = `In room ${roomCode}`;
  joinScreen.hidden = true;
  padScreen.hidden = false;
  dragInput.start(dragPad);
}

function showJoinScreen(statusText) {
  dragInput.stop();
  moveKnob(0, 0);
  padScreen.hidden = true;
  joinScreen.hidden = false;
  joinButton.disabled = false;
  joinStatus.textContent = statusText;
}

function listDeviceInfo() {
  return {
    'Secure context': String(window.isSecureContext),
    // Both are missing entirely over plain HTTP (measured in the spike); they appear once we serve HTTPS (M2).
    'Tilt API': 'DeviceOrientationEvent' in window ? 'present' : 'missing',
    'Wake Lock API': 'wakeLock' in navigator ? 'present' : 'missing',
  };
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
  roomCodeInput.blur(); // closes the on-screen keyboard
  joinRoom(roomCode);
});

dragInput.onInput(sendDragInput);

// pagehide fires when the tab is closed or navigated away. Closing the socket here sends a proper close
// frame, so the server frees the slot at once. Without it, Chrome kept the socket (and the square) alive
// after the tab closed until the whole browser quit.
window.addEventListener('pagehide', () => {
  if (connection) {
    connection.close();
  }
});

// The host's QR code links to /?room=CODE, so scanning players only need to tap Join.
roomCodeInput.value = (new URLSearchParams(location.search).get('room') || '').toUpperCase();
showDeviceInfo();
