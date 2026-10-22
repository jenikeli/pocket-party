// `npm run gen-cert`: writes a self-signed cert for every current LAN address, so phones get HTTPS
// (needed for tilt and Wake Lock) after tapping through one browser warning. Rerun when the IP changes.

import path from 'node:path';
import { readConfig } from './config.js';
import { listLanAddresses } from './addresses.js';
import { generateCertificate, CERT_VALIDITY_DAYS } from './certificate.js';

// Used only when CERT_PATH/KEY_PATH are not set. Like those, they are relative to the folder npm runs in
// (the repo root). certs/ is gitignored and never served, since it is not a public folder.
const DEFAULT_CERT_PATH = path.join('certs', 'cert.pem');
const DEFAULT_KEY_PATH = path.join('certs', 'key.pem');

function main() {
  let config;
  try {
    config = readConfig();
  } catch (error) {
    console.error(`Config error: ${error.message}`);
    process.exit(1);
  }
  const certPath = config.certPath || DEFAULT_CERT_PATH;
  const keyPath = config.keyPath || DEFAULT_KEY_PATH;

  const addresses = listLanAddresses();
  if (addresses.length === 0) {
    console.error('No LAN addresses found. Turn on the hotspot or join Wi-Fi first, then run this again.');
    process.exit(1);
  }
  // 127.0.0.1 too, so a host display on the server machine itself can open https://127.0.0.1.
  const ipAddresses = [...addresses.map((entry) => entry.address), '127.0.0.1'];

  try {
    generateCertificate({ certPath, keyPath, ipAddresses });
  } catch (error) {
    explainOpensslFailure(error);
    process.exit(1);
  }

  console.log(`Wrote ${certPath} and ${keyPath}, valid for ${CERT_VALIDITY_DAYS} days, covering:`);
  for (const entry of addresses) {
    console.log(`  ${entry.address}  (${entry.name})`);
  }
  console.log('  127.0.0.1');
  console.log('Every player sees the browser warning again for this new cert. Start the server with:');
  console.log(`  CERT_PATH=${certPath} KEY_PATH=${keyPath} npm start`);
}

function explainOpensslFailure(error) {
  if (error.code === 'ENOENT') {
    console.error('openssl was not found. Install it (Termux: pkg install openssl-tool), then run this again.');
    return;
  }
  console.error('openssl failed:');
  console.error(error.stderr ? error.stderr.toString() : error.message);
}

main();
