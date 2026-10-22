// Unit tests for server/config.js: how environment variables become server settings.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfig, BIND_ADDRESS } from '../../server/config.js';

test('binds to every interface, never localhost', () => {
  assert.equal(BIND_ADDRESS, '0.0.0.0');
});

test('defaults to plain HTTP on port 3000', () => {
  assert.deepEqual(readConfig({}), {
    port: 3000,
    certPath: null,
    keyPath: null,
    useHttps: false,
    hostIp: null,
  });
});

test('treats empty variables as unset', () => {
  const config = readConfig({ PORT: '', CERT_PATH: '', KEY_PATH: '', HOST_IP: '' });
  assert.equal(config.port, 3000);
  assert.equal(config.useHttps, false);
  assert.equal(config.hostIp, null);
});

test('reads PORT', () => {
  assert.equal(readConfig({ PORT: '3456' }).port, 3456);
  assert.equal(readConfig({ PORT: '65535' }).port, 65535);
});

test('rejects ports below 3000, above 65535, or not whole numbers', () => {
  for (const port of ['80', '2999', '65536', 'abc', '3000.5', '-1']) {
    assert.throws(() => readConfig({ PORT: port }), /PORT must be/, `PORT=${port}`);
  }
});

test('switches to HTTPS when both cert paths are set', () => {
  const config = readConfig({ CERT_PATH: 'cert.pem', KEY_PATH: 'key.pem' });
  assert.equal(config.useHttps, true);
  assert.equal(config.certPath, 'cert.pem');
  assert.equal(config.keyPath, 'key.pem');
});

test('refuses only one of CERT_PATH and KEY_PATH', () => {
  assert.throws(() => readConfig({ CERT_PATH: 'cert.pem' }), /must be set together/);
  assert.throws(() => readConfig({ KEY_PATH: 'key.pem' }), /must be set together/);
});

test('reads HOST_IP', () => {
  assert.equal(readConfig({ HOST_IP: '10.60.55.71' }).hostIp, '10.60.55.71');
});
