// Integration tests for HTTPS on the LAN (M2): `npm run gen-cert`, serving pages and wss with a cert,
// and the warnings `npm start` and `npm run check` give when the cert is wrong.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { startServer, findFreePort, runScript, waitForExit } from '../helpers/start-server.js';
import { connectClient } from '../helpers/socket-client.js';
import { makeTempCert } from '../helpers/temp-cert.js';
import { listLanAddresses } from '../../server/addresses.js';
import { readCertificate } from '../../server/certificate.js';
import { MESSAGE_TYPES } from '../../shared/protocol.js';

const lanAddresses = listLanAddresses();
const NO_LAN = lanAddresses.length === 0 ? 'this machine has no LAN address' : false;

// A cert that covers every address of this machine, like the one `npm run gen-cert` writes.
function makeFullCert(t) {
  const cert = makeTempCert([...lanAddresses.map((entry) => entry.address), '127.0.0.1']);
  t.after(() => cert.remove());
  return cert;
}

// GETs a path over https, trusting only `ca`, so the handshake is checked for real.
function httpsGet(port, urlPath, ca) {
  return new Promise((resolve, reject) => {
    https.get({ host: '127.0.0.1', port, path: urlPath, ca }, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    }).on('error', reject);
  });
}

// The cert warnings print just after "listening", which is when startServer returns.
async function startAndWaitForWarnings(env) {
  const server = await startServer({ env });
  await new Promise((resolve) => setTimeout(resolve, 200));
  return server;
}

test('gen-cert writes a cert for every LAN address plus 127.0.0.1 to CERT_PATH and KEY_PATH', { skip: NO_LAN }, async (t) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'pocket-party-cert-'));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  const env = { CERT_PATH: path.join(folder, 'new', 'cert.pem'), KEY_PATH: path.join(folder, 'new', 'key.pem') };

  const { code, output } = await waitForExit(runScript('server/gen-cert.js', { env }));
  assert.equal(code, 0, output);
  const certificate = readCertificate(env.CERT_PATH);
  for (const { name, address } of lanAddresses) {
    assert.equal(certificate.checkIP(address), address);
    assert.ok(output.includes(`${address}  (${name})`), `output should list ${address}`);
  }
  assert.equal(certificate.checkIP('127.0.0.1'), '127.0.0.1');
  assert.ok(fs.existsSync(env.KEY_PATH));
  assert.ok(output.includes(`CERT_PATH=${env.CERT_PATH} KEY_PATH=${env.KEY_PATH} npm start`));
});

test('with a cert, pages are served over https and the socket works over wss', async (t) => {
  const cert = makeTempCert(['127.0.0.1']);
  t.after(() => cert.remove());
  const server = await startServer({ env: { CERT_PATH: cert.certPath, KEY_PATH: cert.keyPath } });
  t.after(() => server.stop());

  assert.equal(await httpsGet(server.port, '/', cert.certPem), 200);
  assert.equal(await httpsGet(server.port, '/host', cert.certPem), 200);

  const host = await connectClient(server.port, { ca: cert.certPem });
  host.send({ type: MESSAGE_TYPES.CREATE_ROOM });
  assert.equal((await host.next()).type, MESSAGE_TYPES.ROOM_CREATED);
  host.close();
});

test('the server starts quietly with a cert that covers every address', { skip: NO_LAN }, async (t) => {
  const cert = makeFullCert(t);
  const server = await startAndWaitForWarnings({ CERT_PATH: cert.certPath, KEY_PATH: cert.keyPath });
  t.after(() => server.stop());
  assert.doesNotMatch(server.output(), /WARNING/);
  assert.ok(server.output().includes(`https://${lanAddresses[0].address}:${server.port}`));
});

test('the server warns about each LAN address the cert does not cover, but still starts', { skip: NO_LAN }, async (t) => {
  const cert = makeTempCert(['127.0.0.1']);
  t.after(() => cert.remove());
  const server = await startAndWaitForWarnings({ CERT_PATH: cert.certPath, KEY_PATH: cert.keyPath });
  t.after(() => server.stop());

  const output = server.output();
  assert.match(output, /WARNING: certificate problems/);
  for (const { name, address } of lanAddresses) {
    assert.ok(output.includes(`does not cover ${address} (${name})`), `should warn about ${address}`);
  }
  assert.match(output, /run `npm run gen-cert`/);
});

test('the server exits with a hint when the cert file is missing', async () => {
  const env = { CERT_PATH: 'missing-cert.pem', KEY_PATH: 'missing-key.pem' };
  const { code, output } = await waitForExit(runScript('server/index.js', { env }));
  assert.equal(code, 1);
  assert.match(output, /Could not load the certificate or key/);
  assert.match(output, /npm run gen-cert/);
});

test('check passes with a cert that covers every address', { skip: NO_LAN }, async (t) => {
  const cert = makeFullCert(t);
  const env = { PORT: String(await findFreePort()), CERT_PATH: cert.certPath, KEY_PATH: cert.keyPath };
  const { code, output } = await waitForExit(runScript('server/check.js', { env }));
  assert.equal(code, 0, output);
  assert.match(output, /ok {4}Certificate valid until .* and covers every LAN address/);
});

test('check warns (without failing) about addresses the cert does not cover', { skip: NO_LAN }, async (t) => {
  const cert = makeTempCert(['127.0.0.1']);
  t.after(() => cert.remove());
  const env = { PORT: String(await findFreePort()), CERT_PATH: cert.certPath, KEY_PATH: cert.keyPath };
  const { code, output } = await waitForExit(runScript('server/check.js', { env }));
  assert.equal(code, 0, output);
  assert.match(output, new RegExp(`WARN {2}Certificate does not cover ${lanAddresses[0].address.replaceAll('.', '\\.')}`));
});

test('check fails when the key belongs to a different cert', async (t) => {
  const first = makeTempCert(['127.0.0.1']);
  const second = makeTempCert(['127.0.0.1']);
  t.after(() => first.remove());
  t.after(() => second.remove());
  const env = { PORT: String(await findFreePort()), CERT_PATH: first.certPath, KEY_PATH: second.keyPath };
  const { code, output } = await waitForExit(runScript('server/check.js', { env }));
  assert.equal(code, 1);
  assert.match(output, /FAIL {2}Certificate or key cannot be used/);
});
