// Creates and inspects the self-signed TLS certificate that makes the game pages a secure context on the LAN.
// Used by server/gen-cert.js (to create it) and by server/index.js and server/check.js (to warn about it).

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Apple caps certificates at 825 days (and at 398 for ones from public CAs). A year stays under both, and in
// practice the cert is regenerated far sooner, whenever the hotspot IP changes after a phone restart.
export const CERT_VALIDITY_DAYS = 365;

// OID for "TLS server authentication". iPhone Safari refused a cert without it in the spike.
const SERVER_AUTH_USAGE = '1.3.6.1.5.5.7.3.1';

// Runs openssl to write a new key and self-signed cert covering every address in `ipAddresses`.
// Node can read certificates but has no built-in way to create one, so this shells out to openssl
// (`pkg install openssl-tool` in Termux). execFile passes arguments directly, with no shell involved.
export function generateCertificate({ certPath, keyPath, ipAddresses, days = CERT_VALIDITY_DAYS }) {
  fs.mkdirSync(path.dirname(certPath), { recursive: true });
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  const subjectAltName = ipAddresses.map((address) => `IP:${address}`).join(',');
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', keyPath,
    '-out', certPath,
    '-days', String(days),
    '-subj', `/CN=${ipAddresses[0]}`,
    // Browsers ignore the CN; they only match the page's address against these subjectAltName entries.
    '-addext', `subjectAltName=${subjectAltName}`,
    // The two lines below are what made iPhone Safari accept the cert in the spike.
    '-addext', 'extendedKeyUsage=serverAuth',
    '-addext', 'keyUsage=digitalSignature,keyEncipherment',
  ], { stdio: 'pipe' }); // openssl prints progress dots; keep them out of the output unless it fails
}

// Parses a PEM cert. Throws with a readable message if the file is not a certificate.
export function readCertificate(certPath) {
  return new crypto.X509Certificate(fs.readFileSync(certPath));
}

// Problems that break the cert on every address: expired, not valid yet, or missing serverAuth.
// Returns a list of sentences (empty when fine).
export function findCertificateErrors(certificate, now = new Date()) {
  const errors = [];
  if (now > certificate.validToDate) {
    errors.push(`The certificate expired on ${certificate.validToDate.toDateString()}.`);
  }
  if (now < certificate.validFromDate) {
    errors.push(`The certificate is not valid until ${certificate.validFromDate.toDateString()} (check the clock).`);
  }
  if (!(certificate.keyUsage || []).includes(SERVER_AUTH_USAGE)) {
    errors.push('The certificate lacks extendedKeyUsage=serverAuth, so iPhone Safari will refuse it.');
  }
  return errors;
}

// Returns the { name, address } entries the cert does not list. Phones opening those URLs get a
// certificate error that names the wrong address, so they should use a covered address or regenerate.
export function findUncoveredAddresses(certificate, addresses) {
  return addresses.filter((entry) => certificate.checkIP(entry.address) === undefined);
}
