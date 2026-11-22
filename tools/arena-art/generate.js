// Writes Spirefall's puppet parts: assets/arena/parts/<id>/<part>.svg and rig.json for every character in the
// cast-*.js files, and lists them in assets/manifest.json. Run `node tools/arena-art/generate.js` after changing a cast file; the output is committed.

import { mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cast as troopsOne } from './cast-troops-1.js';
import { cast as troopsTwo } from './cast-troops-2.js';
import { cast as troopsThree } from './cast-troops-3.js';
import { cast as buildings } from './cast-buildings.js';
import { cast as spells } from './cast-spells.js';
import { cast as towers } from './cast-towers.js';

const assets = join(dirname(fileURLToPath(import.meta.url)), '../../assets');
const root = join(assets, 'arena/parts');
const everything = { ...troopsOne, ...troopsTwo, ...troopsThree, ...buildings, ...spells, ...towers };
let total = 0;
rmSync(root, { recursive: true, force: true });
for (const [id, { parts, config }] of Object.entries(everything)) {
  mkdirSync(join(root, id), { recursive: true });
  const described = {};
  for (const entry of parts) {
    writeFileSync(join(root, id, `${entry.name}.svg`), entry.svg);
    total += entry.svg.length;
    described[entry.name] = { w: entry.size[0], h: entry.size[1], pivot: entry.pivot, at: entry.at };
  }
  writeFileSync(join(root, id, 'rig.json'), `${JSON.stringify({ ...config, parts: described }, null, 1)}\n`);
}
console.log(`${Object.keys(everything).length} rigs, ${total} bytes of SVG`);

// Replaces the arena entries of assets/manifest.json with one per file written above.
const manifestPath = join(assets, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const arenaEntries = [];
for (const folder of readdirSync(root).sort()) {
  for (const file of readdirSync(join(root, folder)).sort()) {
    const bytes = readFileSync(join(root, folder, file));
    arenaEntries.push({
      path: `arena/parts/${folder}/${file}`,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length,
      source: 'drawn for Spirefall (our own)',
      licence: 'our own',
      usedBy: 'host/games/arena/atlas.js (puppet parts packed into one texture)',
    });
  }
}
manifest.assets = [...manifest.assets.filter((entry) => !entry.path.startsWith('arena/')), ...arenaEntries];
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
