// Integration tests for the WebSocket relay: the real server, driven by scripted host and controller clients.
// Covers rooms, joining, input forwarding and leaving, as built in M1.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../helpers/start-server.js';
import { connectClient, createHost, joinRoom } from '../helpers/socket-client.js';
import { MESSAGE_TYPES, JOIN_FAILURE_REASONS, MAX_PLAYERS } from '../../shared/protocol.js';

let server;
let port;

before(async () => {
  server = await startServer();
  port = server.port;
});

after(() => server.stop());

describe('rooms and joining', () => {
  test('a host gets a 4-letter room code', async () => {
    const { host, roomCode } = await createHost(port);
    assert.match(roomCode, /^[A-HJ-NP-Z]{4}$/);
    host.close();
  });

  test('a controller joins and gets a playerId and token; the host is told', async () => {
    const { host, roomCode } = await createHost(port);
    const { controller, reply } = await joinRoom(port, roomCode);

    assert.equal(reply.type, MESSAGE_TYPES.JOINED);
    assert.equal(reply.roomCode, roomCode);
    assert.match(reply.playerId, /^[0-9a-f]{8}$/);
    assert.match(reply.token, /^[0-9a-f]{32}$/);

    const joined = await host.next();
    // The token is the controller's secret, so the host must not receive it.
    assert.deepEqual(joined, { type: MESSAGE_TYPES.PLAYER_JOINED, playerId: reply.playerId });
    controller.close();
    host.close();
  });

  test('room codes are not case sensitive', async () => {
    const { host, roomCode } = await createHost(port);
    const { controller, reply } = await joinRoom(port, roomCode.toLowerCase());
    assert.equal(reply.type, MESSAGE_TYPES.JOINED);
    assert.equal(reply.roomCode, roomCode);
    controller.close();
    host.close();
  });

  test('a wrong code is refused and the socket closed', async () => {
    const { host } = await createHost(port);
    const { controller, reply } = await joinRoom(port, 'QQQQ');
    assert.deepEqual(reply, { type: MESSAGE_TYPES.JOIN_FAILED, reason: JOIN_FAILURE_REASONS.NO_SUCH_ROOM });
    await controller.closed;
    host.close();
  });

  test(`a full room (${MAX_PLAYERS} players) refuses the next one, and takes them once a slot frees`, async () => {
    const { host, roomCode } = await createHost(port);
    const controllers = [];
    for (let i = 0; i < MAX_PLAYERS; i += 1) {
      const { controller, reply } = await joinRoom(port, roomCode);
      assert.equal(reply.type, MESSAGE_TYPES.JOINED, `player ${i + 1} should get in`);
      controllers.push(controller);
    }

    const extra = await joinRoom(port, roomCode);
    assert.deepEqual(extra.reply, { type: MESSAGE_TYPES.JOIN_FAILED, reason: JOIN_FAILURE_REASONS.ROOM_FULL });
    await extra.controller.closed;

    controllers[0].close();
    await host.nextOfType(MESSAGE_TYPES.PLAYER_LEFT);
    const late = await joinRoom(port, roomCode);
    assert.equal(late.reply.type, MESSAGE_TYPES.JOINED);

    for (const controller of [...controllers, late.controller]) {
      controller.close();
    }
    host.close();
  });
});

describe('inputs', () => {
  test('the host receives inputs with the playerId added by the server', async () => {
    const { host, roomCode } = await createHost(port);
    const { controller, reply } = await joinRoom(port, roomCode);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    const input = { kind: 'drag', x: 0.5, y: -1 };
    controller.send({ type: MESSAGE_TYPES.INPUT, input, sentAt: 1234 });
    assert.deepEqual(await host.next(), {
      type: MESSAGE_TYPES.INPUT,
      playerId: reply.playerId,
      input,
      sentAt: 1234,
    });
    controller.close();
    host.close();
  });

  test('a playerId inside the message is ignored, so nobody can send as someone else', async () => {
    const { host, roomCode } = await createHost(port);
    const victim = await joinRoom(port, roomCode);
    const cheater = await joinRoom(port, roomCode);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    cheater.controller.send({
      type: MESSAGE_TYPES.INPUT,
      playerId: victim.reply.playerId,
      input: { kind: 'drag', x: 1, y: 0 },
      sentAt: 1,
    });
    const forwarded = await host.next();
    assert.equal(forwarded.playerId, cheater.reply.playerId);

    victim.controller.close();
    cheater.controller.close();
    host.close();
  });

  test('inputs only reach the host of the controller\'s own room', async () => {
    const roomA = await createHost(port);
    const roomB = await createHost(port);
    const { controller } = await joinRoom(port, roomA.roomCode);
    await roomA.host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    controller.send({ type: MESSAGE_TYPES.INPUT, input: { kind: 'drag', x: 0, y: 0 }, sentAt: 1 });
    assert.equal((await roomA.host.next()).type, MESSAGE_TYPES.INPUT);
    assert.deepEqual(await roomB.host.collectFor(150), []);

    controller.close();
    roomA.host.close();
    roomB.host.close();
  });

  test('bad messages are ignored and the connection keeps working', async () => {
    const { host, roomCode } = await createHost(port);
    const controller = await connectClient(port);

    controller.sendRaw('not json');
    controller.sendRaw('{"no":"type"}');
    // An input before joining has no room to go to.
    controller.send({ type: MESSAGE_TYPES.INPUT, input: {}, sentAt: 1 });
    controller.send({ type: MESSAGE_TYPES.JOIN, roomCode });
    assert.equal((await controller.next()).type, MESSAGE_TYPES.JOINED);

    // Messages the host is not supposed to send are dropped, not relayed anywhere.
    host.send({ type: MESSAGE_TYPES.INPUT, input: {}, sentAt: 1 });
    assert.deepEqual(await controller.collectFor(150), []);

    controller.close();
    host.close();
  });
});

describe('leaving', () => {
  test('when a controller disconnects, the host gets player_left', async () => {
    const { host, roomCode } = await createHost(port);
    const { controller, reply } = await joinRoom(port, roomCode);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    controller.close();
    assert.deepEqual(await host.next(), { type: MESSAGE_TYPES.PLAYER_LEFT, playerId: reply.playerId });
    host.close();
  });

  test('when the host disconnects, controllers get room_closed and the code stops working', async () => {
    const { host, roomCode } = await createHost(port);
    const first = await joinRoom(port, roomCode);
    const second = await joinRoom(port, roomCode);

    host.close();
    for (const { controller } of [first, second]) {
      assert.deepEqual(await controller.next(), { type: MESSAGE_TYPES.ROOM_CLOSED });
      await controller.closed;
    }

    const late = await joinRoom(port, roomCode);
    assert.equal(late.reply.reason, JOIN_FAILURE_REASONS.NO_SUCH_ROOM);
  });
});

describe('input lab messages (M3)', () => {
  test('input_mode and device_info reach the host with the server-added playerId', async () => {
    const { host, roomCode } = await createHost(port);
    const { controller, reply } = await joinRoom(port, roomCode);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    controller.send({ type: MESSAGE_TYPES.DEVICE_INFO, platform: 'iPhone', browser: 'Safari', playerId: 'fake' });
    controller.send({ type: MESSAGE_TYPES.INPUT_MODE, mode: 'drag', fallbackFrom: 'tilt', reason: 'denied' });
    assert.deepEqual(await host.next(), {
      type: MESSAGE_TYPES.DEVICE_INFO,
      platform: 'iPhone',
      browser: 'Safari',
      playerId: reply.playerId,
    });
    assert.deepEqual(await host.next(), {
      type: MESSAGE_TYPES.INPUT_MODE,
      mode: 'drag',
      fallbackFrom: 'tilt',
      reason: 'denied',
      playerId: reply.playerId,
    });
    controller.close();
    host.close();
  });

  test('a host ping reaches only that controller, and its pong comes back with the playerId', async () => {
    const { host, roomCode } = await createHost(port);
    const pinged = await joinRoom(port, roomCode);
    const other = await joinRoom(port, roomCode);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);
    await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    host.send({ type: MESSAGE_TYPES.PING, playerId: pinged.reply.playerId, sentAt: 123.4 });
    // The controller does not need its own playerId in the ping, so the server leaves it out.
    assert.deepEqual(await pinged.controller.next(), { type: MESSAGE_TYPES.PING, sentAt: 123.4 });
    assert.deepEqual(await other.controller.collectFor(150), []);

    pinged.controller.send({ type: MESSAGE_TYPES.PONG, sentAt: 123.4 });
    assert.deepEqual(await host.next(), {
      type: MESSAGE_TYPES.PONG,
      sentAt: 123.4,
      playerId: pinged.reply.playerId,
    });
    pinged.controller.close();
    other.controller.close();
    host.close();
  });

  test('a host cannot ping a player in another room, and pinging a missing player is harmless', async () => {
    const roomA = await createHost(port);
    const roomB = await createHost(port);
    const { controller, reply } = await joinRoom(port, roomB.roomCode);
    await roomB.host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

    roomA.host.send({ type: MESSAGE_TYPES.PING, playerId: reply.playerId, sentAt: 1 });
    roomA.host.send({ type: MESSAGE_TYPES.PING, playerId: 'nobody', sentAt: 2 });
    assert.deepEqual(await controller.collectFor(150), []);

    // Room A's host is still connected and working.
    const late = await joinRoom(port, roomA.roomCode);
    assert.equal(late.reply.type, MESSAGE_TYPES.JOINED);

    controller.close();
    late.controller.close();
    roomA.host.close();
    roomB.host.close();
  });

  test('a controller cannot send pings to other players', async () => {
    const { host, roomCode } = await createHost(port);
    const sender = await joinRoom(port, roomCode);
    const target = await joinRoom(port, roomCode);

    sender.controller.send({ type: MESSAGE_TYPES.PING, playerId: target.reply.playerId, sentAt: 1 });
    assert.deepEqual(await target.controller.collectFor(150), []);

    sender.controller.close();
    target.controller.close();
    host.close();
  });
});
