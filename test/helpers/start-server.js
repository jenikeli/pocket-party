// Starts the real server (`node server/index.js`) as a child process on a free port, for integration
// and browser tests. Running the actual entry point means the tests cover exactly what `npm start` runs.

import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const STARTUP_TIMEOUT_MS = 5000;

// Asks the OS for an unused port by binding port 0, then releases it for the server to take.
// Linux hands out ports from 32768 up, so this always satisfies the server's "3000 or above" rule.
export function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '0.0.0.0', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// Runs a server script with a clean config (no certs, no HOST_IP) plus any overrides in `env`.
export function runScript(script, { args = [], env = {} } = {}) {
  return spawn(process.execPath, [script, ...args], {
    cwd: ROOT_DIR,
    env: { ...process.env, CERT_PATH: '', KEY_PATH: '', HOST_IP: '', ...env },
  });
}

// Resolves with the child's exit code and everything it printed.
export function waitForExit(child) {
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  return new Promise((resolve) => child.on('exit', (code) => resolve({ code, output })));
}

// Starts the server and resolves once it prints its "listening" line.
// Returns { port, baseUrl, output(), stop() }. Pass args: ['--dev'] for dev mode.
export async function startServer({ args = [] } = {}) {
  const port = await findFreePort();
  const child = runScript('server/index.js', { args, env: { PORT: String(port) } });
  let output = '';

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server did not start:\n${output}`)), STARTUP_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.includes('listening on')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('exit', (code) => reject(new Error(`Server exited with code ${code}:\n${output}`)));
  });

  async function stop() {
    if (child.exitCode !== null) {
      return;
    }
    const exited = new Promise((resolve) => child.on('exit', resolve));
    child.kill();
    await exited;
  }

  return { port, baseUrl: `http://127.0.0.1:${port}`, output: () => output, stop };
}
