// Integration tests for static file serving: pages, content types, caching headers, and what stays private.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startServer } from '../helpers/start-server.js';

let server;

before(async () => {
  server = await startServer();
});

after(() => server.stop());

// Sends the path exactly as written. fetch() would tidy up "../" before sending, which hides the
// path-traversal cases we want to test.
function request(path, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const outgoing = http.request({ host: '127.0.0.1', port: server.port, path, method, headers }, (response) => {
      let body = '';
      response.on('data', (chunk) => (body += chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    outgoing.on('error', reject);
    outgoing.end();
  });
}

const JAVASCRIPT = 'text/javascript; charset=utf-8';

for (const [path, contentType, bodyIncludes] of [
  ['/', 'text/html; charset=utf-8', 'controller/main.js'],
  ['/?room=ABCD', 'text/html; charset=utf-8', 'controller/main.js'],
  ['/host', 'text/html; charset=utf-8', 'host/main.js'],
  ['/host/', 'text/html; charset=utf-8', 'host/main.js'],
  ['/controller/main.js', JAVASCRIPT, 'MESSAGE_TYPES'],
  ['/controller/style.css', 'text/css; charset=utf-8', 'touch-action'],
  ['/shared/protocol.js', JAVASCRIPT, 'MESSAGE_TYPES'],
  // Browsers refuse to run a module served with a non-JavaScript type.
  ['/host/vendor/qrcode-generator-2.0.4.mjs', JAVASCRIPT, 'qrcode'],
  ['/host/vendor/phaser-3.90.0.esm.min.js', JAVASCRIPT, ''],
  ['/assets/manifest.json', 'application/json; charset=utf-8', '"assets"'],
  ['/saltline-fable-5.2/index.html', 'text/html; charset=utf-8', 'SALTLINE'],
]) {
  test(`GET ${path} serves ${contentType}`, async () => {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert.equal(response.headers['content-type'], contentType);
    assert.equal(response.headers['cache-control'], 'no-cache');
    assert.ok(response.body.includes(bodyIncludes));
  });
}

for (const path of [
  '/server/index.js',
  '/package.json',
  '/node_modules/ws/package.json',
  '/saltline-fable-5.2/index%20copy.html',
  '/controller/../server/config.js',
  '/controller/%2e%2e/server/config.js',
  '/controller/missing.js',
  '/controller',
  '/%E0%A4%A',
]) {
  test(`GET ${path} is 404`, async () => {
    assert.equal((await request(path)).status, 404);
  });
}

test('POST is refused with 405', async () => {
  assert.equal((await request('/', { method: 'POST' })).status, 405);
});

test('LAN address endpoint returns cache-free IPv4 candidates', async () => {
  const response = await request('/server/lan-addresses.json');
  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(response.headers['cache-control'], 'no-store');
  const { addresses } = JSON.parse(response.body);
  assert.ok(Array.isArray(addresses));
  assert.ok(addresses.every((entry) => (
    typeof entry.name === 'string'
    && typeof entry.address === 'string'
    && /^\d{1,3}(?:\.\d{1,3}){3}$/.test(entry.address)
  )));
});

test('HEAD sends headers without a body', async () => {
  const response = await request('/controller/main.js', { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], JAVASCRIPT);
  assert.ok(Number(response.headers['content-length']) > 0);
  assert.equal(response.body, '');
});

test('an unchanged file revalidates with 304', async () => {
  const first = await request('/controller/main.js');
  const lastModified = first.headers['last-modified'];
  assert.ok(lastModified);

  const second = await request('/controller/main.js', { headers: { 'If-Modified-Since': lastModified } });
  assert.equal(second.status, 304);
  assert.equal(second.body, '');
});
