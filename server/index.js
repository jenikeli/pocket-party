// Server entry point (`npm start`): serves the game pages over HTTP, or HTTPS when certs are configured.
// WebSocket relaying is added in M1.

import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { readConfig, BIND_ADDRESS } from './config.js';
import { printUrls } from './addresses.js';
import { handleStaticRequest } from './static-files.js';

function createServer(config) {
  if (!config.useHttps) {
    return http.createServer(handleStaticRequest);
  }
  const tlsOptions = {
    cert: fs.readFileSync(config.certPath),
    key: fs.readFileSync(config.keyPath),
  };
  return https.createServer(tlsOptions, handleStaticRequest);
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
  });
}

main();
