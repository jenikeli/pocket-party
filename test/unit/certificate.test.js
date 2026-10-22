// Unit tests for server/certificate.js: what the generated cert contains, and the checks that warn about it.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readCertificate, findCertificateErrors, findUncoveredAddresses, CERT_VALIDITY_DAYS } from '../../server/certificate.js';
import { makeTempCert } from '../helpers/temp-cert.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const cert = makeTempCert(['10.60.55.71', '192.168.1.20', '127.0.0.1']);
after(() => cert.remove());
const certificate = readCertificate(cert.certPath);

test('the generated cert lists every address it was given, and no others', () => {
  assert.equal(certificate.subjectAltName, 'IP Address:10.60.55.71, IP Address:192.168.1.20, IP Address:127.0.0.1');
  assert.equal(certificate.checkIP('10.60.55.71'), '10.60.55.71');
  assert.equal(certificate.checkIP('10.60.55.72'), undefined);
});

test('the generated cert has the key usages iPhone Safari needs', () => {
  const text = execFileSync('openssl', ['x509', '-in', cert.certPath, '-noout', '-text']).toString();
  assert.match(text, /X509v3 Extended Key Usage:\s*\n\s*TLS Web Server Authentication/);
  assert.match(text, /X509v3 Key Usage:\s*\n\s*Digital Signature, Key Encipherment/);
});

test(`the generated cert is valid from now for ${CERT_VALIDITY_DAYS} days, under the iOS 825-day cap`, () => {
  const lifetimeDays = (certificate.validToDate - certificate.validFromDate) / DAY_MS;
  assert.equal(Math.round(lifetimeDays), CERT_VALIDITY_DAYS);
  assert.ok(CERT_VALIDITY_DAYS < 825);
  assert.ok(Math.abs(Date.now() - certificate.validFromDate) < 60 * 1000);
});

test('a fresh cert has no errors', () => {
  assert.deepEqual(findCertificateErrors(certificate), []);
});

test('an expired cert is reported', () => {
  const afterExpiry = new Date(certificate.validToDate.getTime() + DAY_MS);
  const errors = findCertificateErrors(certificate, afterExpiry);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /expired/);
});

test('a cert that is not valid yet is reported (a wrong clock looks like this)', () => {
  const beforeStart = new Date(certificate.validFromDate.getTime() - DAY_MS);
  const errors = findCertificateErrors(certificate, beforeStart);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /not valid until/);
});

test('a cert without serverAuth is reported, like the first spike cert', (t) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'pocket-party-cert-'));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  const certPath = path.join(folder, 'cert.pem');
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(folder, 'key.pem'), '-out', certPath,
    '-days', '30', '-subj', '/CN=10.60.55.71', '-addext', 'subjectAltName=IP:10.60.55.71',
  ], { stdio: 'pipe' });

  const errors = findCertificateErrors(readCertificate(certPath));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /serverAuth/);
});

test('addresses the cert does not list are returned with their interface names', () => {
  const addresses = [
    { name: 'swlan0', address: '10.60.55.71' },
    { name: 'wlan0', address: '10.213.249.252' },
  ];
  assert.deepEqual(findUncoveredAddresses(certificate, addresses), [{ name: 'wlan0', address: '10.213.249.252' }]);
});

test('reading a file that is not a certificate throws', (t) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'pocket-party-cert-'));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  const notACert = path.join(folder, 'cert.pem');
  fs.writeFileSync(notACert, 'hello');
  assert.throws(() => readCertificate(notACert));
});
