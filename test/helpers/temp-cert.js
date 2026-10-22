// Makes throwaway self-signed certs in a temp folder for the HTTPS tests, using the same code as `npm run gen-cert`.
// Needs openssl on the dev box (it is there by default on most Linux installs).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateCertificate } from '../../server/certificate.js';

// Returns { certPath, keyPath, certPem, remove() }. Call remove() in t.after() or after().
export function makeTempCert(ipAddresses) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'pocket-party-cert-'));
  const certPath = path.join(folder, 'cert.pem');
  const keyPath = path.join(folder, 'key.pem');
  generateCertificate({ certPath, keyPath, ipAddresses });
  return {
    certPath,
    keyPath,
    certPem: fs.readFileSync(certPath),
    remove: () => fs.rmSync(folder, { recursive: true, force: true }),
  };
}
