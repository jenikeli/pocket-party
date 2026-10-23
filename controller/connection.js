// Keeps this phone in its room: the first join, rejoining with the saved token after the socket drops, and
// the "is my socket really alive?" check when the tab comes back. Used by controller/main.js.

import { MESSAGE_TYPES } from '/shared/protocol.js';
import { openSocket } from '/shared/socket.js';
import { sendLeaveInBackground } from '/controller/background-leave.js';

// What onEnded(reason) can get besides the JOIN_FAILURE_REASONS values.
export const ROOM_CLOSED = 'room_closed';
export const UNREACHABLE = 'unreachable';
export const KICKED = 'kicked';
export const LEFT = 'left';

// After a locked screen a socket can still read "open" when the OS has already killed it (seen in the spike),
// so on resume we ping the server and treat the socket as dead if no pong comes back within this time.
const RESUME_PONG_TIMEOUT_MS = 2000;
// A socket that cannot reach the server (Wi-Fi still coming back) may hang for a long time before it fails,
// so each attempt gives up after this long without a JOINED.
const JOIN_TIMEOUT_MS = 5000;
// Automatic rejoin attempts before the controller shows "Tap to reconnect", and the pause between them.
const REJOIN_ATTEMPTS = 3;
const REJOIN_DELAY_MS = 1500;

// The callbacks: onJoined(session) after every JOINED; onMessage(message) for messages from the host;
// onReconnecting() when a rejoin starts; onOffline() when the automatic attempts ran out; onEnded(reason) when
// the slot is gone for good (the host left or removed us, the slot was freed, we left, or the first join failed).
// Returns { join(roomCode), rejoin(session), reconnect(), checkAfterResume(), send(message), disconnect(), leave() }.
export function createConnection({ onJoined, onMessage, onReconnecting, onOffline, onEnded }) {
  let socket = null; // the current socket ({ send, close } from openSocket), or null
  let session = null; // { roomCode, playerId, token } once the server has given us a slot
  let state = 'idle'; // 'joining', 'connected', 'reconnecting', 'offline' or 'ended'
  let endReason = null; // set by a server message saying this socket's slot is over
  let attemptsLeft = 0;
  let joinTimer = null;
  let pongTimer = null;
  let retryTimer = null;

  function connect(firstMessage) {
    abandonSocket();
    endReason = null;
    // Events from a socket we already gave up on are ignored, so it cannot undo a newer connection.
    const isCurrent = () => thisSocket === socket;
    const thisSocket = openSocket({
      onOpen: () => thisSocket.send(firstMessage),
      onMessage: (message) => {
        if (isCurrent()) {
          handleMessage(message);
        }
      },
      onClose: () => {
        if (isCurrent()) {
          handleSocketLost();
        }
      },
    });
    socket = thisSocket;
    joinTimer = setTimeout(() => {
      console.warn(`No JOINED within ${JOIN_TIMEOUT_MS} ms; giving up on this socket`);
      handleSocketLost();
    }, JOIN_TIMEOUT_MS);
  }

  // Stops listening to the current socket and closes it. Its close event then never reaches us.
  function abandonSocket() {
    clearTimeout(joinTimer);
    clearTimeout(pongTimer);
    clearTimeout(retryTimer);
    const oldSocket = socket;
    socket = null;
    oldSocket?.close();
  }

  function handleMessage(message) {
    switch (message.type) {
      case MESSAGE_TYPES.JOINED:
        clearTimeout(joinTimer);
        session = { roomCode: message.roomCode, playerId: message.playerId, token: message.token };
        state = 'connected';
        onJoined(session);
        break;
      case MESSAGE_TYPES.JOIN_FAILED:
        // The server closes the socket next; handleSocketLost() then ends the session with this reason.
        endReason = message.reason;
        break;
      case MESSAGE_TYPES.ROOM_CLOSED:
        endReason = ROOM_CLOSED;
        break;
      case MESSAGE_TYPES.KICKED:
        endReason = KICKED;
        break;
      case MESSAGE_TYPES.PING:
        // The host's latency ping. Answer at once and unchanged: the host times the round trip on its own clock.
        socket.send({ type: MESSAGE_TYPES.PONG, sentAt: message.sentAt });
        break;
      case MESSAGE_TYPES.PONG:
        // The server answered our resume check, so this socket works.
        clearTimeout(pongTimer);
        break;
      default:
        onMessage(message);
    }
  }

  // The socket closed, or an attempt timed out. Decide between giving up, rejoining, and trying again.
  function handleSocketLost() {
    abandonSocket();
    if (endReason !== null) {
      end(endReason);
    } else if (session === null) {
      end(UNREACHABLE);
    } else if (state === 'connected') {
      // A normal drop (Wi-Fi blip, server heartbeat cut a suspended socket): get the slot back.
      startRejoining();
    } else if (attemptsLeft > 0) {
      retryTimer = setTimeout(tryRejoin, REJOIN_DELAY_MS);
    } else {
      state = 'offline';
      onOffline();
    }
  }

  function startRejoining() {
    state = 'reconnecting';
    attemptsLeft = REJOIN_ATTEMPTS;
    onReconnecting();
    tryRejoin();
  }

  function tryRejoin() {
    attemptsLeft -= 1;
    connect({ type: MESSAGE_TYPES.REJOIN, ...session });
  }

  function end(reason) {
    state = 'ended';
    session = null;
    onEnded(reason);
  }

  function join(roomCode) {
    session = null;
    state = 'joining';
    connect({ type: MESSAGE_TYPES.JOIN, roomCode });
  }

  // For a session saved by an earlier page (reload, or the tab was closed and opened again).
  function rejoin(savedSession) {
    session = savedSession;
    startRejoining();
  }

  // The "Tap to reconnect" button.
  function reconnect() {
    if (state === 'offline') {
      startRejoining();
    }
  }

  // Call when the tab becomes visible again. A phone that was locked may have lost its socket without any
  // close event, so ask the server and only trust the socket if it answers.
  function checkAfterResume() {
    if (state === 'offline') {
      startRejoining();
      return;
    }
    if (state !== 'connected') {
      return;
    }
    socket.send({ type: MESSAGE_TYPES.PING, sentAt: Date.now() });
    clearTimeout(pongTimer);
    pongTimer = setTimeout(() => {
      console.warn(`No pong within ${RESUME_PONG_TIMEOUT_MS} ms of coming back; the socket is dead, rejoining`);
      startRejoining();
    }, RESUME_PONG_TIMEOUT_MS);
  }

  // Messages are only sent while we hold the slot. Inputs made while rejoining are stale by the time the
  // socket is back, so they are dropped on purpose rather than queued.
  function send(message) {
    if (state === 'connected') {
      socket.send(message);
    }
  }

  // For pagehide: close the socket so the server notices at once, and rejoin if the page comes back
  // (a page restored from the back-forward cache becomes visible again, which calls checkAfterResume).
  function disconnect() {
    abandonSocket();
    if (session !== null) {
      state = 'offline';
    }
  }

  // "Leave game": the phone ends the session at once and never tries to rejoin. On a working socket the LEAVE goes
  // there, and closing straight after is safe because a browser sends queued messages before the close frame.
  // Without one (reconnecting or offline), a separate socket delivers it once the network is back.
  function leave() {
    if (session === null) {
      return;
    }
    const leftSession = session;
    if (state === 'connected') {
      socket.send({ type: MESSAGE_TYPES.LEAVE, ...leftSession });
    } else {
      sendLeaveInBackground(leftSession);
    }
    abandonSocket();
    end(LEFT);
  }

  return { join, rejoin, reconnect, checkAfterResume, send, disconnect, leave };
}
