// Integration tests for M4 on the real server: held slots, rejoining with the token, freeing slots (grace period
// over, kicked by the host, left on purpose), the lobby's player limit and open/closed room, and the lobby's
// messages both ways.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../helpers/start-server.js';
import { connectClient, createHost, joinRoom, rejoinRoom } from '../helpers/socket-client.js';
import { MESSAGE_TYPES, JOIN_FAILURE_REASONS, MAX_PLAYERS } from '../../shared/protocol.js';

let server;
let port;

before(async () => {
  server = await startServer();
  port = server.port;
});

after(() => server.stop());

// A room with one joined player who has since dropped. Returns { host, roomCode, joined } (joined = JOINED reply).
async function roomWithDroppedPlayer() {
  const { host, roomCode } = await createHost(port);
  const { controller, reply } = await joinRoom(port, roomCode);
  await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
  controller.close();
  await host.nextOfType(MESSAGE_TYPES.PLAYER_DISCONNECTED);
  return { host, roomCode, joined: reply };
}

describe('rejoining', () => {
  test('a dropped player rejoins with their token, keeps their playerId, and the host is told', async () => {
    const { host, joined } = await roomWithDroppedPlayer();

    const { controller, reply } = await rejoinRoom(port, joined);
    assert.deepEqual(reply, joined);
    assert.deepEqual(await host.next(), { type: MESSAGE_TYPES.PLAYER_RECONNECTED, playerId: joined.playerId });

    controller.send({ type: MESSAGE_TYPES.INPUT, input: { kind: 'tap' }, sentAt: 5 });
    assert.equal((await host.next()).playerId, joined.playerId);
    controller.close();
    host.close();
  });

  test('a wrong or missing token, or an unknown playerId, is refused; the real owner still gets in', async () => {
    const { host, joined } = await roomWithDroppedPlayer();
    const attempts = [
      { ...joined, token: 'f'.repeat(32) },
      { ...joined, token: joined.token.slice(0, 31) },
      { ...joined, token: undefined },
      { ...joined, playerId: 'deadbeef' },
    ];
    for (const attempt of attempts) {
      const { controller, reply } = await rejoinRoom(port, attempt);
      assert.deepEqual(reply, { type: MESSAGE_TYPES.JOIN_FAILED, reason: JOIN_FAILURE_REASONS.REJOIN_REFUSED });
      await controller.closed;
    }
    assert.deepEqual(await host.collectFor(150), []);

    const owner = await rejoinRoom(port, joined);
    assert.equal(owner.reply.type, MESSAGE_TYPES.JOINED);
    owner.controller.close();
    host.close();
  });

  test('rejoining a room that does not exist says so', async () => {
    const { controller, reply } = await rejoinRoom(port, { roomCode: 'QQQQ', playerId: 'deadbeef', token: 'x' });
    assert.deepEqual(reply, { type: MESSAGE_TYPES.JOIN_FAILED, reason: JOIN_FAILURE_REASONS.NO_SUCH_ROOM });
    await controller.closed;
  });

  test('a rejoin while the old socket still looks open replaces it, and the old close is not a disconnect', async () => {
    const { host, roomCode } = await createHost(port);
    const first = await joinRoom(port, roomCode);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    // As when a phone's Wi-Fi dropped: the phone knows the old socket is dead, the server does not yet.
    const second = await rejoinRoom(port, first.reply);
    assert.equal(second.reply.type, MESSAGE_TYPES.JOINED);
    await first.controller.closed;
    assert.deepEqual(await host.next(), { type: MESSAGE_TYPES.PLAYER_RECONNECTED, playerId: first.reply.playerId });
    assert.deepEqual(await host.collectFor(150), []);

    host.send({ type: MESSAGE_TYPES.PING, playerId: first.reply.playerId, sentAt: 7 });
    assert.deepEqual(await second.controller.next(), { type: MESSAGE_TYPES.PING, sentAt: 7 });
    second.controller.close();
    host.close();
  });
});

describe('freeing slots', () => {
  test('the host frees a dropped player\'s slot; the server confirms and the token stops working', async () => {
    const { host, joined } = await roomWithDroppedPlayer();

    host.send({ type: MESSAGE_TYPES.REMOVE_PLAYER, playerId: joined.playerId });
    assert.deepEqual(await host.next(), { type: MESSAGE_TYPES.PLAYER_LEFT, playerId: joined.playerId });

    const { controller, reply } = await rejoinRoom(port, joined);
    assert.equal(reply.reason, JOIN_FAILURE_REASONS.REJOIN_REFUSED);
    await controller.closed;
    host.close();
  });

  test('a player who rejoined just before the timer ran out is not removed', async () => {
    const { host, joined } = await roomWithDroppedPlayer();
    const { controller } = await rejoinRoom(port, joined);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_RECONNECTED);

    host.send({ type: MESSAGE_TYPES.REMOVE_PLAYER, playerId: joined.playerId });
    assert.deepEqual(await host.collectFor(150), []);
    controller.send({ type: MESSAGE_TYPES.INPUT, input: { kind: 'tap' }, sentAt: 1 });
    assert.equal((await host.next()).type, MESSAGE_TYPES.INPUT);
    controller.close();
    host.close();
  });

  test('when the host leaves, connected players get room_closed and held slots cannot be rejoined', async () => {
    const { host, roomCode, joined } = await roomWithDroppedPlayer();
    const other = await joinRoom(port, roomCode);

    host.close();
    assert.deepEqual(await other.controller.next(), { type: MESSAGE_TYPES.ROOM_CLOSED });
    const { reply } = await rejoinRoom(port, joined);
    assert.equal(reply.reason, JOIN_FAILURE_REASONS.NO_SUCH_ROOM);
  });
});

describe('kicking and leaving', () => {
  test('the host kicks a connected player: they are told, their socket closes, and the token stops working', async () => {
    const { host, roomCode } = await createHost(port);
    const { controller, reply } = await joinRoom(port, roomCode);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    host.send({ type: MESSAGE_TYPES.KICK_PLAYER, playerId: reply.playerId });
    assert.deepEqual(await controller.next(), { type: MESSAGE_TYPES.KICKED });
    await controller.closed;
    // Only PLAYER_LEFT: the socket closing is not also reported as a disconnect.
    assert.deepEqual(await host.next(), { type: MESSAGE_TYPES.PLAYER_LEFT, playerId: reply.playerId });
    assert.deepEqual(await host.collectFor(150), []);

    const again = await rejoinRoom(port, reply);
    assert.equal(again.reply.reason, JOIN_FAILURE_REASONS.REJOIN_REFUSED);
    host.close();
  });

  test('the host can kick a player who is waiting to reconnect', async () => {
    const { host, joined } = await roomWithDroppedPlayer();
    host.send({ type: MESSAGE_TYPES.KICK_PLAYER, playerId: joined.playerId });
    assert.deepEqual(await host.next(), { type: MESSAGE_TYPES.PLAYER_LEFT, playerId: joined.playerId });
    host.close();
  });

  test('a player who leaves frees the slot at once, without a disconnect first', async () => {
    const { host, roomCode } = await createHost(port);
    host.send({ type: MESSAGE_TYPES.SET_PLAYER_LIMIT, maxPlayers: 1 });
    const { controller, reply } = await joinRoom(port, roomCode);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    controller.send({ ...reply, type: MESSAGE_TYPES.LEAVE });
    await controller.closed;
    assert.deepEqual(await host.next(), { type: MESSAGE_TYPES.PLAYER_LEFT, playerId: reply.playerId });
    assert.deepEqual(await host.collectFor(150), []);

    // The one slot is free again for someone new, and the old token no longer works.
    const next = await joinRoom(port, roomCode);
    assert.equal(next.reply.type, MESSAGE_TYPES.JOINED);
    assert.equal((await rejoinRoom(port, reply)).reply.reason, JOIN_FAILURE_REASONS.REJOIN_REFUSED);
    next.controller.close();
    host.close();
  });
});

describe('leaving from a new socket', () => {
  // As when the player tapped Leave on the reconnect screen: their own socket is down, so the phone opens a new one.
  async function sendLeave(credentials) {
    const socket = await connectClient(port);
    socket.send({ ...credentials, type: MESSAGE_TYPES.LEAVE });
    const reply = await socket.next();
    await socket.closed;
    return reply;
  }

  test('a LEAVE with the token frees a dropped player\'s slot, and the phone is told it worked', async () => {
    const { host, joined } = await roomWithDroppedPlayer();
    assert.deepEqual(await sendLeave(joined), { type: MESSAGE_TYPES.LEFT });
    assert.deepEqual(await host.next(), { type: MESSAGE_TYPES.PLAYER_LEFT, playerId: joined.playerId });
    assert.equal((await rejoinRoom(port, joined)).reply.reason, JOIN_FAILURE_REASONS.REJOIN_REFUSED);
    host.close();
  });

  test('a wrong token frees nothing, but still gets LEFT so the phone stops retrying', async () => {
    const { host, joined } = await roomWithDroppedPlayer();
    assert.deepEqual(await sendLeave({ ...joined, token: 'f'.repeat(32) }), { type: MESSAGE_TYPES.LEFT });
    assert.deepEqual(await sendLeave({ ...joined, roomCode: 'QQQQ' }), { type: MESSAGE_TYPES.LEFT });
    assert.deepEqual(await host.collectFor(150), []);
    assert.equal((await rejoinRoom(port, joined)).reply.type, MESSAGE_TYPES.JOINED);
    host.close();
  });

  test('a LEAVE while the old socket still looks open cuts that socket, with no disconnect reported', async () => {
    const { host, roomCode } = await createHost(port);
    const { controller, reply } = await joinRoom(port, roomCode);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    assert.deepEqual(await sendLeave(reply), { type: MESSAGE_TYPES.LEFT });
    await controller.closed;
    assert.deepEqual(await host.next(), { type: MESSAGE_TYPES.PLAYER_LEFT, playerId: reply.playerId });
    assert.deepEqual(await host.collectFor(150), []);
    host.close();
  });
});

describe('open and closed rooms', () => {
  test('a closed room refuses new players but takes rejoins, and takes new players again once reopened', async () => {
    const { host, joined, roomCode } = await roomWithDroppedPlayer();
    host.send({ type: MESSAGE_TYPES.SET_ROOM_OPEN, open: false });

    const late = await joinRoom(port, roomCode);
    assert.deepEqual(late.reply, { type: MESSAGE_TYPES.JOIN_FAILED, reason: JOIN_FAILURE_REASONS.GAME_IN_PROGRESS });
    await late.controller.closed;
    const back = await rejoinRoom(port, joined);
    assert.equal(back.reply.type, MESSAGE_TYPES.JOINED);

    host.send({ type: MESSAGE_TYPES.SET_ROOM_OPEN, open: true });
    const next = await joinRoom(port, roomCode);
    assert.equal(next.reply.type, MESSAGE_TYPES.JOINED);
    back.controller.close();
    next.controller.close();
    host.close();
  });
});

describe('player limit', () => {
  test('the host\'s limit refuses extra joins, but a held slot can always be rejoined', async () => {
    const { host, roomCode } = await createHost(port);
    host.send({ type: MESSAGE_TYPES.SET_PLAYER_LIMIT, maxPlayers: 2 });
    const first = await joinRoom(port, roomCode);
    const second = await joinRoom(port, roomCode);
    assert.equal(second.reply.type, MESSAGE_TYPES.JOINED);
    const third = await joinRoom(port, roomCode);
    assert.equal(third.reply.reason, JOIN_FAILURE_REASONS.ROOM_FULL);

    first.controller.close();
    await host.nextOfType(MESSAGE_TYPES.PLAYER_DISCONNECTED);
    const back = await rejoinRoom(port, first.reply);
    assert.equal(back.reply.type, MESSAGE_TYPES.JOINED);

    back.controller.close();
    second.controller.close();
    host.close();
  });

  test(`a limit above ${MAX_PLAYERS} is clamped, and one that is not a whole number is ignored`, async () => {
    const { host, roomCode } = await createHost(port);
    host.send({ type: MESSAGE_TYPES.SET_PLAYER_LIMIT, maxPlayers: 99 });
    const controllers = [];
    for (let i = 0; i < MAX_PLAYERS; i += 1) {
      controllers.push((await joinRoom(port, roomCode)).controller);
    }
    assert.equal((await joinRoom(port, roomCode)).reply.reason, JOIN_FAILURE_REASONS.ROOM_FULL);

    const { host: otherHost, roomCode: otherCode } = await createHost(port);
    otherHost.send({ type: MESSAGE_TYPES.SET_PLAYER_LIMIT, maxPlayers: 1 });
    otherHost.send({ type: MESSAGE_TYPES.SET_PLAYER_LIMIT, maxPlayers: 'lots' });
    controllers.push((await joinRoom(port, otherCode)).controller);
    assert.equal((await joinRoom(port, otherCode)).reply.reason, JOIN_FAILURE_REASONS.ROOM_FULL);

    for (const controller of controllers) {
      controller.close();
    }
    host.close();
    otherHost.close();
  });
});

describe('lobby messages', () => {
  test('player_name and set_ready reach the host with the server-added playerId', async () => {
    const { host, roomCode } = await createHost(port);
    const { controller, reply } = await joinRoom(port, roomCode);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    controller.send({ type: MESSAGE_TYPES.PLAYER_NAME, name: 'Ana', playerId: 'fake' });
    controller.send({ type: MESSAGE_TYPES.SET_READY, ready: true });
    assert.deepEqual(await host.next(), { type: MESSAGE_TYPES.PLAYER_NAME, name: 'Ana', playerId: reply.playerId });
    assert.deepEqual(await host.next(), { type: MESSAGE_TYPES.SET_READY, ready: true, playerId: reply.playerId });
    controller.close();
    host.close();
  });

  test('controller_state reaches only the named player, without the playerId', async () => {
    const { host, roomCode } = await createHost(port);
    const target = await joinRoom(port, roomCode);
    const other = await joinRoom(port, roomCode);

    const state = { screen: 'lobby', name: 'Ana', color: '#e74c3c', ready: false };
    host.send({ type: MESSAGE_TYPES.CONTROLLER_STATE, playerId: target.reply.playerId, ...state });
    assert.deepEqual(await target.controller.next(), { type: MESSAGE_TYPES.CONTROLLER_STATE, ...state });
    assert.deepEqual(await other.controller.collectFor(150), []);
    target.controller.close();
    other.controller.close();
    host.close();
  });

  test('a controller\'s own ping is answered by the server, and the host does not see it', async () => {
    const { host, roomCode } = await createHost(port);
    const { controller } = await joinRoom(port, roomCode);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    controller.send({ type: MESSAGE_TYPES.PING, sentAt: 42 });
    assert.deepEqual(await controller.next(), { type: MESSAGE_TYPES.PONG, sentAt: 42 });
    assert.deepEqual(await host.collectFor(150), []);
    controller.close();
    host.close();
  });
});
