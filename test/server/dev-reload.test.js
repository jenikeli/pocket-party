// Integration tests for `npm run dev`: a file change pushes RELOAD to hosts (and only hosts), and
// plain `npm start` never watches files.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, ROOT_DIR } from '../helpers/start-server.js';
import { createHost, joinRoom } from '../helpers/socket-client.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

// Touching a file's timestamps counts as a change for the watcher, without editing any content.
const WATCHED_FILE = path.join(ROOT_DIR, 'assets', 'manifest.json');

async function touchWatchedFile() {
  const { atime, mtime } = fs.statSync(WATCHED_FILE);
  fs.utimesSync(WATCHED_FILE, new Date(), new Date());
  // Give the watcher time to notice before putting the original times back.
  await new Promise((resolve) => setTimeout(resolve, 50));
  fs.utimesSync(WATCHED_FILE, atime, mtime);
}

// t.after runs even when an assertion fails, so a failing test never leaves a server running.
test('dev mode tells hosts to reload when a public file changes', async (t) => {
  const server = await startServer({ args: ['--dev'] });
  t.after(() => server.stop());
  const { host, roomCode } = await createHost(server.port);
  const { controller } = await joinRoom(server.port, roomCode);
  await host.nextOfType(MESSAGE_TYPES.PLAYER_JOINED);

  await touchWatchedFile();
  assert.deepEqual(await host.next(), { type: MESSAGE_TYPES.RELOAD });
  // Controllers keep their state; only the host page reloads.
  assert.deepEqual(await controller.collectFor(300), []);
});

test('npm start does not watch files', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  const { host } = await createHost(server.port);

  await touchWatchedFile();
  assert.deepEqual(await host.collectFor(400), []);
});
