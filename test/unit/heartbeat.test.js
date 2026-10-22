// Unit tests for server/heartbeat.js: sockets that answer pings stay, sockets that stop answering are cut.
// Uses fake sockets and Node's mock timers, so the 10 s rounds run instantly.

import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { startHeartbeat } from '../../server/heartbeat.js';

const ROUND_MS = 10000;

// Stands in for a ws WebSocketServer: an event emitter with the set of connected sockets.
function fakeSocketServer() {
  const server = new EventEmitter();
  server.clients = new Set();
  return server;
}

// A socket that answers pings like a browser does, until `alive` is set to false.
function fakeSocket(server) {
  const socket = new EventEmitter();
  socket.alive = true;
  socket.terminated = false;
  socket.ping = () => {
    if (socket.alive) {
      socket.emit('pong');
    }
  };
  socket.terminate = () => {
    socket.terminated = true;
    server.clients.delete(socket);
  };
  server.clients.add(socket);
  server.emit('connection', socket);
  return socket;
}

afterEach(() => mock.timers.reset());

test('a socket that keeps answering pings is never cut', () => {
  mock.timers.enable({ apis: ['setInterval'] });
  const server = fakeSocketServer();
  startHeartbeat(server);
  const socket = fakeSocket(server);

  mock.timers.tick(ROUND_MS * 5);
  assert.equal(socket.terminated, false);
  server.emit('close');
});

test('a socket that stops answering is cut on the round after its missed ping', () => {
  mock.timers.enable({ apis: ['setInterval'] });
  const server = fakeSocketServer();
  startHeartbeat(server);
  const dead = fakeSocket(server);
  const healthy = fakeSocket(server);

  mock.timers.tick(ROUND_MS);
  dead.alive = false;
  mock.timers.tick(ROUND_MS); // pinged, no answer
  assert.equal(dead.terminated, false);
  mock.timers.tick(ROUND_MS); // still no answer since the last ping
  assert.equal(dead.terminated, true);
  assert.equal(healthy.terminated, false);
  server.emit('close');
});

test('closing the server stops the rounds', () => {
  mock.timers.enable({ apis: ['setInterval'] });
  const server = fakeSocketServer();
  startHeartbeat(server);
  const socket = fakeSocket(server);
  let pings = 0;
  socket.ping = () => (pings += 1);

  server.emit('close');
  mock.timers.tick(ROUND_MS * 3);
  assert.equal(pings, 0);
});
