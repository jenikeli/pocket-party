// Unit test for the item icons (shared/item-icons.js): every item id has a name and a safe, sized SVG.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_ICONS } from '../../shared/item-icons.js';
import { KART_ITEMS } from '../../shared/protocol.js';

test('every item id has an icon, and no icon is for an unknown id', () => {
  assert.deepEqual(Object.keys(ITEM_ICONS).sort(), Object.values(KART_ITEMS).sort());
});

test('each icon has a name and an svg with a viewBox, no script and no event attributes', () => {
  for (const [id, { name, svg }] of Object.entries(ITEM_ICONS)) {
    assert.ok(name.length > 0, `${id} has a name`);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 64 64"/, `${id} has a viewBox`);
    assert.ok(svg.endsWith('</svg>'), `${id} is closed`);
    assert.doesNotMatch(svg, /<script|\son\w+\s*=|javascript:/i, `${id} is inert`);
    assert.doesNotMatch(svg, /NaN|undefined/, `${id} has no broken numbers`);
  }
});
