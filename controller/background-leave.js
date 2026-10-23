// Tells the server a player left when the phone's own socket was down at the time ("Leave game" on the
// reconnect screen). Used by controller/connection.js, which has already ended the session on the phone.

import { MESSAGE_TYPES } from '/shared/protocol.js';
import { openSocket } from '/shared/socket.js';

// Wi-Fi may take a while to come back, so keep trying for a bit. If it never does, the host's grace period
// frees the slot anyway; this only frees it sooner.
const LEAVE_ATTEMPTS = 8;
const LEAVE_RETRY_DELAY_MS = 2000;
// A socket that cannot reach the server may hang instead of failing, so each attempt gets this long.
const ATTEMPT_TIMEOUT_MS = 5000;

// Opens a short-lived socket whose first message is LEAVE with the token, and retries until the server answers
// LEFT. Opening a socket is not proof the message arrived, so only that answer stops the retries.
export function sendLeaveInBackground(session, attemptsLeft = LEAVE_ATTEMPTS) {
  let answered = false;
  const leaveSocket = openSocket({
    onOpen: () => leaveSocket.send({ type: MESSAGE_TYPES.LEAVE, ...session }),
    onMessage: (message) => {
      if (message.type === MESSAGE_TYPES.LEFT) {
        answered = true;
      }
    },
    onClose: () => {
      clearTimeout(attemptTimer);
      if (answered) {
        return;
      }
      if (attemptsLeft > 1) {
        setTimeout(() => sendLeaveInBackground(session, attemptsLeft - 1), LEAVE_RETRY_DELAY_MS);
      } else {
        console.warn('Could not tell the server we left; the host frees the slot when the grace period ends');
      }
    },
  });
  // Closing a socket that is still connecting fires its close event, which starts the next attempt.
  const attemptTimer = setTimeout(() => leaveSocket.close(), ATTEMPT_TIMEOUT_MS);
}
