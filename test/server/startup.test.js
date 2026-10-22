// Integration tests for starting the server and for `npm run check`: config errors, busy ports, printed URLs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { startServer, findFreePort, runScript, waitForExit } from '../helpers/start-server.js';
import { listLanAddresses } from '../../server/addresses.js';

// Holds a port open for the rest of test `t`, so the code under test finds it busy.
// t.after runs even when an assertion fails, so nothing is left listening.
async function occupyPort(t) {
  const port = await findFreePort();
  const blocker = net.createServer();
  await new Promise((resolve) => blocker.listen(port, '0.0.0.0', resolve));
  t.after(() => new Promise((resolve) => blocker.close(resolve)));
  return port;
}

test('the server prints a URL for every LAN address', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  await new Promise((resolve) => setTimeout(resolve, 100)); // the URLs print right after "listening"
  for (const { name, address } of listLanAddresses()) {
    assert.ok(server.output().includes(`http://${address}:${server.port}  (${name})`), `missing ${address}`);
  }
});

test('the server refuses a port below 3000', async () => {
  const { code, output } = await waitForExit(runScript('server/index.js', { env: { PORT: '80' } }));
  assert.equal(code, 1);
  assert.match(output, /Config error: PORT must be/);
});

test('the server explains a port that is already in use', async (t) => {
  const port = await occupyPort(t);
  const { code, output } = await waitForExit(runScript('server/index.js', { env: { PORT: String(port) } }));
  assert.equal(code, 1);
  assert.match(output, /already in use/);
});

test('check passes on a free port', async () => {
  const port = await findFreePort();
  const { code, output } = await waitForExit(runScript('server/check.js', { env: { PORT: String(port) } }));
  assert.equal(code, 0, output);
  assert.match(output, /All checks passed/);
});

test('check fails on a busy port', async (t) => {
  const port = await occupyPort(t);
  const { code, output } = await waitForExit(runScript('server/check.js', { env: { PORT: String(port) } }));
  assert.equal(code, 1);
  assert.match(output, /FAIL {2}Cannot bind/);
});

test('check fails when only CERT_PATH is set', async () => {
  const { code, output } = await waitForExit(runScript('server/check.js', { env: { CERT_PATH: 'cert.pem' } }));
  assert.equal(code, 1);
  assert.match(output, /must be set together/);
});

test('check fails when the cert files cannot be read', async () => {
  const port = await findFreePort();
  const env = { PORT: String(port), CERT_PATH: 'missing-cert.pem', KEY_PATH: 'missing-key.pem' };
  const { code, output } = await waitForExit(runScript('server/check.js', { env }));
  assert.equal(code, 1);
  assert.match(output, /FAIL {2}CERT_PATH not readable/);
  assert.match(output, /https:\/\//);
});
