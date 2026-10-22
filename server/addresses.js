// Lists the LAN addresses the server can be reached on, so players know which URL to open.
// Used by server/index.js and server/check.js at startup.

import os from 'node:os';

// Returns [{ name, address }] for every non-internal IPv4 address, e.g. { name: 'swlan0', address: '10.60.55.71' }.
// The phone can be on its hotspot and home Wi-Fi at once, so there may be several.
export function listLanAddresses() {
  // On some Android versions the OS blocks the call Node uses to read interfaces,
  // and os.networkInterfaces() throws. Catch it so the server still starts.
  let interfaces;
  try {
    interfaces = os.networkInterfaces();
  } catch (error) {
    console.error('Could not read network interfaces:', error.message);
    return [];
  }

  const addresses = [];
  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries) {
      if (entry.family === 'IPv4' && !entry.internal) {
        addresses.push({ name, address: entry.address });
      }
    }
  }
  return addresses;
}

// Prints one URL per address. If HOST_IP is set, that one goes first and is marked as the main URL.
export function printUrls(config) {
  const protocol = config.useHttps ? 'https' : 'http';
  const addresses = listLanAddresses();

  if (config.hostIp) {
    const isKnown = addresses.some((entry) => entry.address === config.hostIp);
    console.log(`Main URL: ${protocol}://${config.hostIp}:${config.port}  (HOST_IP)`);
    if (!isKnown) {
      console.warn(`  Warning: HOST_IP ${config.hostIp} is not one of this machine's addresses.`);
    }
  }

  if (addresses.length === 0) {
    console.log('No LAN addresses found. Find the IP in your network settings, then open');
    console.log(`  ${protocol}://<that-ip>:${config.port}`);
    return;
  }

  console.log('Reachable on:');
  for (const entry of addresses) {
    console.log(`  ${protocol}://${entry.address}:${config.port}  (${entry.name})`);
  }
  console.log('Controllers open /   Host display opens /host');
}
