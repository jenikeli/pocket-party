// The game registry: every game the picker offers, with what the picker shows of it and its player range, and
// loading a game's code on demand. Used by the game picker (host/game-picker.js), host/main.js and
// host/game-session.js. The shell never imports a game directly, only through here.

import { MAX_PLAYERS } from '/shared/protocol.js';

// In the order the picker offers them; the first is the default. `id` is also the folder name, under
// host/games/ and controller/games/. `minPlayers` and `maxPlayers` are the range the picker shows ('1 to 4');
// the maximum is also the room's player limit, which the server holds to, and the minimum is the game's own to
// enforce. `cover` is the thumbnail (assets/covers/), `background` the wide picture that fills the picker while
// the game is chosen (null: a plain dark fade).
export const GAMES = Object.freeze([
  // Split screen, one view per player, so at most 4 (M6). CPU karts fill the field, so one player can race alone,
  // as in MK8DX. It starts with no players too, for the setup screen's Watch (self-driving karts, no phones);
  // a race itself still needs a player (canStartRace in host/kart/setup.js). The picture is the saved preview
  // of its first course (host/games/kart-3d/course-previews.js).
  Object.freeze({
    id: 'kart-3d',
    title: 'Kart race 3D',
    minPlayers: 0,
    maxPlayers: 4,
    cover: '/assets/covers/kart-3d.svg',
    background: '/assets/kart-3d/previews/palm-bay-airport.jpg',
  }),
  Object.freeze({
    id: 'kart-2d',
    title: 'Kart race 2D',
    minPlayers: 2,
    maxPlayers: MAX_PLAYERS,
    cover: '/assets/covers/kart-2d.svg',
    background: '/assets/covers/kart-2d-wide.jpg',
  }),
  Object.freeze({
    id: 'input-lab',
    title: 'Input lab',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    cover: '/assets/covers/input-lab.svg',
    background: null,
  }),
]);

export function findGame(gameId) {
  return GAMES.find((game) => game.id === gameId);
}

// Fetches the game's code with a dynamic import(), the browser's own module loading, so a game's files are
// downloaded only when it is first played. Each game module exports createGame(), which returns a fresh game
// (see "Game module interface" in plan.md); its load(onProgress) fetches the assets and may report how far it
// has got as a fraction 0..1. Resolves to the loaded game.
export async function loadGame(gameId, onProgress) {
  const module = await import(`/host/games/${gameId}/index.js`);
  const game = module.createGame();
  await game.load(onProgress);
  return game;
}
