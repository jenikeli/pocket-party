// Dev only (`npm run dev`): watches the public folders and calls back when a file changes,
// so server/index.js can tell host pages to reload.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WATCHED_FOLDERS = ['controller', 'host', 'shared', 'assets'];

// Editors often write a file in several steps (truncate, write, rename), which fires several events.
// Waiting for a short quiet period turns that burst into a single reload.
const QUIET_PERIOD_MS = 150;

export function watchPublicFiles(onChange) {
  let timer = null;

  function scheduleChange() {
    clearTimeout(timer);
    timer = setTimeout(onChange, QUIET_PERIOD_MS);
  }

  for (const folder of WATCHED_FOLDERS) {
    const folderPath = path.join(ROOT_DIR, folder);
    // recursive watching works on Linux (and so in Termux) since Node 20.
    const watcher = fs.watch(folderPath, { recursive: true }, scheduleChange);
    watcher.on('error', (error) => {
      console.error(`Stopped watching ${folder}/:`, error.message);
    });
  }
  console.log(`Dev mode: watching ${WATCHED_FOLDERS.join('/, ')}/ and reloading host pages on change`);
}
