// Unit tests for the order a game opens in (host/game-opening.js): the game loads first and only then is its room
// made, with fakes for the load and the room that write down every call.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadThenOpenRoom } from '../../host/game-opening.js';

const GAME_INFO = { id: 'kart-3d', title: 'Kartwheel', minPlayers: 0, maxPlayers: 4 };

// The fakes share one list of calls, so the test can check their order. `loadFails` and `connectFails` make
// that step reject, as a missing file or a server that cannot be reached would.
function fakes({ loadFails = false, connectFails = false } = {}) {
  const calls = [];
  const game = { name: 'the loaded game' };
  const room = {
    connect: async () => {
      calls.push('connect');
      if (connectFails) {
        throw new Error('closed before the room was made');
      }
      return 'KXQP';
    },
    setPlayerLimit: (maxPlayers) => calls.push(`setPlayerLimit ${maxPlayers}`),
  };
  return {
    calls,
    game,
    room,
    loadGame: async (gameId, onProgress) => {
      calls.push(`load ${gameId}`);
      onProgress(0.5);
      if (loadFails) {
        throw new Error('missing file');
      }
      return game;
    },
    createRoom: () => {
      calls.push('createRoom');
      return room;
    },
  };
}

test('the room is made only after the game has loaded, and takes the game\'s maximum at once', async () => {
  const { calls, game, room, loadGame, createRoom } = fakes();
  const progress = [];
  const opened = await loadThenOpenRoom({
    gameInfo: GAME_INFO,
    loadGame,
    createRoom,
    onProgress: (fraction) => progress.push(fraction),
  });
  assert.deepEqual(calls, ['load kart-3d', 'createRoom', 'connect', 'setPlayerLimit 4']);
  assert.deepEqual(opened, { game, room, roomCode: 'KXQP' });
  assert.deepEqual(progress, [0.5], 'the load reports its progress through');
});

test('a game that fails to load leaves no room behind', async (t) => {
  t.mock.method(console, 'error', () => {});
  const { calls, loadGame, createRoom } = fakes({ loadFails: true });
  const opened = await loadThenOpenRoom({ gameInfo: GAME_INFO, loadGame, createRoom, onProgress: () => {} });
  assert.deepEqual(calls, ['load kart-3d']);
  assert.deepEqual(opened, { problem: 'Could not load Kartwheel (details in the browser console).' });
});

test('a server that cannot be reached is a problem to show, and no limit is sent', async (t) => {
  t.mock.method(console, 'error', () => {});
  const { calls, loadGame, createRoom } = fakes({ connectFails: true });
  const opened = await loadThenOpenRoom({ gameInfo: GAME_INFO, loadGame, createRoom, onProgress: () => {} });
  assert.deepEqual(calls, ['load kart-3d', 'createRoom', 'connect']);
  assert.deepEqual(opened, { problem: 'Could not reach the server.' });
});
