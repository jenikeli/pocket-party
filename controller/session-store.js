// Remembers this phone's place in a game (room code, playerId, secret token) and the player's name in
// localStorage, so a reload or a reopened tab can rejoin as the same player. Used by controller/main.js.

const SESSION_KEY = 'pocket-party:session';
const NAME_KEY = 'pocket-party:name';

export function saveSession({ roomCode, playerId, token }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, playerId, token }));
}

// Returns { roomCode, playerId, token }, or null if there is none (or it is unreadable).
export function loadSession() {
  const saved = localStorage.getItem(SESSION_KEY);
  if (saved === null) {
    return null;
  }
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.warn('Ignoring a saved session that is not JSON:', saved, error);
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function saveName(name) {
  localStorage.setItem(NAME_KEY, name);
}

export function loadName() {
  return localStorage.getItem(NAME_KEY) || '';
}
