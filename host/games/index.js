// The game registry: every game the lobby can start, with its player range, and loading a game's code on
// demand. Used by the lobby (host/scenes/lobby-scene.js) and host/game-session.js. The shell never imports a
// game directly, only through here.

import { MAX_PLAYERS } from '/shared/protocol.js';

// In the order the lobby offers them; the first is the default. `id` is also the folder name, under
// host/games/ and controller/games/.
export const GAMES = Object.freeze([
  Object.freeze({ id: 'input-lab', title: 'Input lab', minPlayers: 2, maxPlayers: MAX_PLAYERS }),
  Object.freeze({ id: 'kart-2d', title: 'Kart race 2D', minPlayers: 2, maxPlayers: MAX_PLAYERS }),
  // Split screen, one view per player, so at most 4 (M6). For now a test drive, which one player can try alone;
  // M7 makes it the race, "Kart race 3D" (a longer title does not fit the lobby's game picker).
  Object.freeze({ id: 'kart-3d', title: '3D test drive', minPlayers: 1, maxPlayers: 4 }),
  // A developer tool that measures the host device, so it needs no phones (M6a; M7 removes it).
  Object.freeze({ id: 'spike-3d', title: '3D spike (dev)', minPlayers: 0, maxPlayers: MAX_PLAYERS }),
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
