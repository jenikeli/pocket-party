// `npm run blender -- <model> [--preview]`: a dev-only tool (M7d4c2 spike). Runs Blender headless on
// tools/blender/<model>.py, which builds the model and writes assets/models/<model>.glb, then lists the file in
// assets/manifest.json. With --preview the script also renders pictures into test-results/blender/. Blender is
// found from the BLENDER env var, else `blender` on the PATH. Never used by the server or `npm start`.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT_DIR } from '../test/helpers/start-server.js';

const USAGE = 'Usage: npm run blender -- <model> [--preview]   (model: a script in tools/blender/, such as palm)';
const MANIFEST_FILE = path.join(ROOT_DIR, 'assets', 'manifest.json');
const PREVIEW_DIR = path.join(ROOT_DIR, 'test-results', 'blender');

// Reads the command line (without node and the script): one model name and an optional --preview.
export function parseArguments(args) {
  const models = args.filter((arg) => arg !== '--preview');
  if (models.length !== 1 || !/^[a-z0-9-]+$/.test(models[0])) {
    throw new Error(USAGE);
  }
  return { model: models[0], preview: args.includes('--preview') };
}

export function blenderCommand(env) {
  return env.BLENDER || 'blender';
}

// The manifest entry for a built model: its path relative to assets/, hash and size, and where it comes from.
export function modelEntry(model, contents) {
  return {
    path: `models/${model}.glb`,
    sha256: crypto.createHash('sha256').update(contents).digest('hex'),
    bytes: contents.length,
    source: `tools/blender/${model}.py`,
    licence: 'own work',
    usedBy: 'host/kit-shots (M7d4c2 spike)',
  };
}

// The manifest with `entry` added at the end, or, if an asset with its path is listed, with that asset's hash
// and size updated (its other fields may have been edited by hand since, so they are kept).
export function withAsset(manifest, entry) {
  const assets = [...manifest.assets];
  const index = assets.findIndex((asset) => asset.path === entry.path);
  if (index === -1) {
    assets.push(entry);
  } else {
    assets[index] = { ...assets[index], sha256: entry.sha256, bytes: entry.bytes };
  }
  return { ...manifest, assets };
}

function runBlender(model, glbFile, preview) {
  const blender = blenderCommand(process.env);
  // Without --python-exit-code, Blender exits 0 even when the script raises.
  const args = ['--background', '--factory-startup', '--python-exit-code', '1',
    '--python', path.join(ROOT_DIR, 'tools', 'blender', `${model}.py`), '--', '--out', glbFile];
  if (preview) {
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
    args.push('--preview', PREVIEW_DIR);
  }
  const result = spawnSync(blender, args, { stdio: 'inherit' });
  if (result.error?.code === 'ENOENT') {
    throw new Error(`Blender not found (tried "${blender}"). Install Blender 5.2 and set BLENDER to its path, `
      + `for example: BLENDER=~/opt/blender-5.2.3-linux-x64/blender npm run blender -- ${model}`);
  }
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Blender failed on tools/blender/${model}.py (exit code ${result.status})`);
  }
}

function main() {
  const { model, preview } = parseArguments(process.argv.slice(2));
  if (!fs.existsSync(path.join(ROOT_DIR, 'tools', 'blender', `${model}.py`))) {
    throw new Error(`There is no tools/blender/${model}.py. ${USAGE}`);
  }
  const glbFile = path.join(ROOT_DIR, 'assets', 'models', `${model}.glb`);
  runBlender(model, glbFile, preview);
  const entry = modelEntry(model, fs.readFileSync(glbFile));
  const manifest = withAsset(JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')), entry);
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote assets/${entry.path} (${entry.bytes} bytes) and its manifest entry.`);
}

// Run only when started as a script, so the tests can import the pure parts.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
