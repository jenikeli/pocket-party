// Reads server settings from environment variables (the only way to configure the server).
// Used by server/index.js and server/check.js.

const DEFAULT_PORT = 3000;
const MIN_PORT = 3000;

// The server always binds to every interface so phones on the hotspot or Wi-Fi can reach it.
// HOST_IP never changes this; it only picks which URL is printed (and later shown) first.
export const BIND_ADDRESS = '0.0.0.0';

export function readConfig(env = process.env) {
  const port = readPort(env.PORT);
  const certPath = env.CERT_PATH || null;
  const keyPath = env.KEY_PATH || null;

  // One without the other is almost certainly a typo; failing loudly beats silently serving HTTP.
  if (Boolean(certPath) !== Boolean(keyPath)) {
    throw new Error('CERT_PATH and KEY_PATH must be set together (or neither).');
  }

  return {
    port,
    certPath,
    keyPath,
    useHttps: Boolean(certPath),
    hostIp: env.HOST_IP || null,
  };
}

function readPort(rawPort) {
  if (rawPort === undefined || rawPort === '') {
    return DEFAULT_PORT;
  }
  const port = Number(rawPort);
  // Ports below 1024 need root, which Termux does not have; we keep 3000+ to stay well clear.
  if (!Number.isInteger(port) || port < MIN_PORT || port > 65535) {
    throw new Error(`PORT must be a whole number from ${MIN_PORT} to 65535, got "${rawPort}".`);
  }
  return port;
}
