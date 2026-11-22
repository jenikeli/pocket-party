// Unit tests for Spirefall's art (assets/arena/parts): every card and token has a rig.json whose parts exist as small
// SVG files, the draw orders only name real parts, and assets/manifest.json lists every file.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { CARDS, TOKENS } from '../../shared/arena-cards.js';

const assets = new URL('../../assets/', import.meta.url);
const MAX_SVG_BYTES = 6 * 1024;
const folders = [...CARDS, ...TOKENS].map((card) => card.id).concat(['tower-warden', 'tower-keep', 'team']);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', assets), 'utf8'));
const listed = new Set(manifest.assets.map((entry) => entry.path));

for (const folder of folders) {
  test(`arena art: ${folder} has a valid rig and small SVG parts, all in the manifest`, () => {
    const rigUrl = new URL(`arena/parts/${folder}/rig.json`, assets);
    assert.ok(existsSync(rigUrl), `${folder}/rig.json is missing`);
    const rig = JSON.parse(readFileSync(rigUrl, 'utf8'));
    assert.ok(rig.height >= 0 && ['walk', 'hover', 'glide', 'roll', 'still'].includes(rig.gait));
    assert.ok(listed.has(`arena/parts/${folder}/rig.json`), 'rig.json is not in the manifest');
    for (const [name, info] of Object.entries(rig.parts)) {
      const svgUrl = new URL(`arena/parts/${folder}/${name}.svg`, assets);
      assert.ok(existsSync(svgUrl), `${folder}/${name}.svg is missing`);
      assert.ok(statSync(svgUrl).size < MAX_SVG_BYTES, `${folder}/${name}.svg is over 6 KB`);
      assert.ok(info.w > 0 && info.h > 0 && info.pivot.length === 2 && info.at.length === 2, `${folder}/${name} has a bad size, pivot or position`);
      assert.ok(listed.has(`arena/parts/${folder}/${name}.svg`), `${folder}/${name}.svg is not in the manifest`);
    }
    for (const set of [rig.order.front, rig.order.back]) {
      set.forEach((name) => assert.ok(rig.parts[name], `${folder} draws a part it does not have: ${name}`));
    }
  });
}

test('arena art: every troop has a body, and fliers have no feet', () => {
  for (const card of [...CARDS, ...TOKENS].filter((entry) => entry.type !== 'spell')) {
    const rig = JSON.parse(readFileSync(new URL(`arena/parts/${card.id}/rig.json`, assets), 'utf8'));
    assert.ok(rig.parts.body, `${card.id} has no body`);
    if (card.flying) {
      assert.ok(!rig.parts.footA && !rig.parts.footB, `${card.id} flies but has feet`);
    }
  }
});
