// The phone side of Spirefall, a game module: the setup screen (team, deck, Ready) and the match screen (hand, elixir,
// deploy pad), switched by the phase of the host's view. Loaded and started by controller/game-screen.js.

import { mountSetupScreen } from './setup-screen.js';
import { mountMatchScreen } from './match-screen.js';

let container = null;
let sendMessage = null;
// The screen on show: { kind: 'setup' | 'match', screen }.
let current = null;

export function start(gameContainer, send) {
  container = gameContainer;
  sendMessage = send;
}

export function stop() {
  current?.screen.unmount();
  current = null;
}

// `view` is what host/games/arena/views.js made for this player; null until the host's first step after joining.
export function showView(view) {
  if (!view) {
    container.textContent = 'Joining';
    return;
  }
  const kind = view.phase === 'match' ? 'match' : 'setup';
  if (current?.kind !== kind) {
    current?.screen.unmount();
    current = { kind, screen: (kind === 'match' ? mountMatchScreen : mountSetupScreen)(container, sendMessage) };
  }
  current.screen.show(view);
}
