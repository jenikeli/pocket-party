// Setup checker (`npm run check`): confirms Node version, config, cert files and the port, then prints URLs.
// Run it on a new machine (dev box or Termux phone) before `npm start`.

import fs from 'node:fs';
import net from 'node:net';
import { readConfig, BIND_ADDRESS } from './config.js';
import { printUrls } from './addresses.js';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

let problems = 0;

function pass(message) {
  console.log(`  ok    ${message}`);
}

function fail(message) {
  console.log(`  FAIL  ${message}`);
  problems += 1;
}

function checkNodeVersion() {
  // engines looks like ">=26 <27"; the first number is the major version we pin.
  const wantedMajor = Number(packageJson.engines.node.match(/\d+/)[0]);
  const actualMajor = Number(process.versions.node.split('.')[0]);
  if (actualMajor === wantedMajor) {
    pass(`Node ${process.versions.node} (want major ${wantedMajor})`);
  } else {
    fail(`Node ${process.versions.node}, but this project expects major ${wantedMajor} (see .nvmrc)`);
  }
}

function checkCertFiles(config) {
  if (!config.useHttps) {
    pass('No CERT_PATH/KEY_PATH set: will serve plain HTTP (tilt and Wake Lock need HTTPS)');
    return;
  }
  for (const [name, filePath] of [['CERT_PATH', config.certPath], ['KEY_PATH', config.keyPath]]) {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      pass(`${name} readable: ${filePath}`);
    } catch (error) {
      fail(`${name} not readable: ${filePath} (${error.code})`);
    }
  }
}

// Opens and immediately closes a listener, to prove the port is free and we are allowed to bind it.
function checkPortCanBind(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', (error) => {
      fail(`Cannot bind ${BIND_ADDRESS}:${port} (${error.code})`);
      resolve();
    });
    probe.listen(port, BIND_ADDRESS, () => {
      pass(`Port ${port} is free on ${BIND_ADDRESS}`);
      probe.close(resolve);
    });
  });
}

async function main() {
  console.log('Pocket Party setup check');
  checkNodeVersion();

  let config;
  try {
    config = readConfig();
    pass('Environment variables parsed');
  } catch (error) {
    fail(error.message);
    process.exit(1);
  }

  checkCertFiles(config);
  await checkPortCanBind(config.port);

  console.log();
  printUrls(config);
  console.log();
  console.log(problems === 0 ? 'All checks passed.' : `${problems} problem(s) found.`);
  process.exit(problems === 0 ? 0 : 1);
}

main();
