// The order a game opens in: its code and assets load first, and only then is its room made, so a room code
// exists only for a game that is ready and a load that fails leaves no room behind. A plain function with its
// steps passed in, so the unit tests can check the order with fakes. Used by host/game-session.js.

// `loadGame(gameId, onProgress)` resolves to the loaded game (host/games/index.js); `createRoom()` returns a new
// room (host/room.js) whose connect() resolves to its code. Resolves to { game, room, roomCode }, or to
// { problem } with the sentence the picker shows when the load or the server failed.
export async function loadThenOpenRoom({ gameInfo, loadGame, createRoom, onProgress }) {
  let game;
  try {
    game = await loadGame(gameInfo.id, onProgress);
  } catch (error) {
    console.error(`Could not load ${gameInfo.title}`, error);
    return { problem: `Could not load ${gameInfo.title} (details in the browser console).` };
  }
  const room = createRoom();
  let roomCode;
  try {
    roomCode = await room.connect();
  } catch (error) {
    // The game was loaded but never started, so it holds nothing that needs stopping; it is just dropped.
    console.error(`Could not open a room for ${gameInfo.title}`, error);
    return { problem: 'Could not reach the server.' };
  }
  // Sent first thing, before the code is shown anywhere, so nobody past the game's maximum can get in.
  room.setPlayerLimit(gameInfo.maxPlayers);
  return { game, room, roomCode };
}
