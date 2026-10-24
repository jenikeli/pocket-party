// The game registry: every game the lobby can start, with its player range, and loading a game's code on
// demand. Used by the lobby (host/scenes/lobby-scene.js) and host/game-session.js. The shell never imports a
// game directly, only through here.

import { MAX_PLAYERS } from '/shared/protocol.js';

// In the order the lobby offers them; the first is the default. `id` is also the folder name, under
// host/games/ and controller/games/.
export const GAMES = Object.freeze([
  Object.freeze({ id: 'input-lab', title: 'Input lab', minPlayers: 2, maxPlayers: MAX_PLAYERS }),
  Object.freeze({ id: 'kart-2d', title: 'Kart race 2D', minPlayers: 2, maxPlayers: MAX_PLAYERS }),
  // Split screen, one view per player, so at most 4 (M6). CPU karts fill the field, so one player can race alone,
  // as in MK8DX.
  Object.freeze({ id: 'kart-3d', title: 'Kart race 3D', minPlayers: 1, maxPlayers: 4 }),
]);

export function findGame(gameId) {
  return GAMES.find((game) => game.id === gameId);
}

// Fetches the game's code with a dynamic import(), the browser's own module loading, so a game's files are
// downloaded only when it is first played. Each game module exports createGame(), which returns a fresh game
// (see "Game module interface" in plan.md); its load() fetches the assets. Resolves to the loaded game.
export async function loadGame(gameId) {
  const module = await import(`/host/games/${gameId}/index.js`);
  const game = module.createGame();
  await game.load();
  return game;
}
