// Server entry point (`npm start`, or `npm run dev` with --dev): serves the game pages over HTTP, or HTTPS
// when certs are configured, and relays WebSocket messages on the same port.

import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { readConfig, BIND_ADDRESS } from './config.js';
import { printUrls, listLanAddresses } from './addresses.js';
import { readCertificate, findCertificateErrors, findUncoveredAddresses } from './certificate.js';
import { handleStaticRequest } from './static-files.js';
import { attachRelay, sendToAllHosts } from './relay.js';
import { watchPublicFiles } from './dev-reload.js';
import { MESSAGE_TYPES } from '../shared/protocol.js';

// A flag rather than an env var because it picks a mode (file watching), not a setting.
const isDevMode = process.argv.includes('--dev');

function createServer(config) {
  if (!config.useHttps) {
    return http.createServer(handleStaticRequest);
  }
  try {
    const tlsOptions = {
      cert: fs.readFileSync(config.certPath),
      key: fs.readFileSync(config.keyPath),
    };
    return https.createServer(tlsOptions, handleStaticRequest);
  } catch (error) {
    console.error(`Could not load the certificate or key: ${error.message}`);
    console.error('Run `npm run gen-cert` to make new ones, or fix CERT_PATH and KEY_PATH.');
    process.exit(1);
  }
}

// The server still starts with a bad cert (some addresses may work), but says loudly what will fail.
// A cert lists the IPs it is valid for, and the hotspot IP changes when the phone restarts.
function warnAboutCertificate(config) {
  const certificate = readCertificate(config.certPath);
  const warnings = findCertificateErrors(certificate);
  for (const entry of findUncoveredAddresses(certificate, listLanAddresses())) {
    warnings.push(`The certificate does not cover ${entry.address} (${entry.name}); phones there get a certificate error.`);
  }
  if (warnings.length === 0) {
    return;
  }
  console.warn('');
  console.warn('WARNING: certificate problems');
  for (const warning of warnings) {
    console.warn(`  - ${warning}`);
  }
  console.warn('  Fix: run `npm run gen-cert`, then restart the server.');
  console.warn('');
}

function main() {
  let config;
  try {
    config = readConfig();
  } catch (error) {
    console.error(`Config error: ${error.message}`);
    process.exit(1);
  }
  const server = createServer(config);
  attachRelay(server);
  if (isDevMode) {
    watchPublicFiles(() => sendToAllHosts({ type: MESSAGE_TYPES.RELOAD }));
  }

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${config.port} is already in use. Stop the other server or set PORT.`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });

  server.listen(config.port, BIND_ADDRESS, () => {
    console.log(`Pocket Party server listening on ${BIND_ADDRESS}:${config.port}`);
    printUrls(config);
    if (config.useHttps) {
      warnAboutCertificate(config);
    }
  });
}

main();
