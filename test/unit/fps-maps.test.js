// Unit tests for the Saltline map registry and map collision data.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, DEFAULT_MAP } from '../../host/games/fps/maps/index.js';

for (const [id, map] of Object.entries(MAPS)) {
  test(`Saltline map ${id}: valid bounds, boxes and spawns`, () => {
    assert.ok(map.bounds.x1 > map.bounds.x0);
    assert.ok(map.bounds.z1 > map.bounds.z0);
    assert.ok(map.boxes.length > 10);
    assert.ok(map.spawns[0].length > 0);
    assert.ok(map.spawns[1].length > 0);
    assert.ok(map.spawns.ffa.length > 0);
    for (const box of map.boxes) {
      assert.ok(box.x1 > box.x0);
      assert.ok(box.z1 > box.z0);
      assert.ok(box.y1 > box.y0);
    }
  });
}

test('Saltline registry defaults to Harbor and exposes three more maps', () => {
  assert.equal(DEFAULT_MAP, 'harbor');
  assert.deepEqual(Object.keys(MAPS).sort(), ['dustline', 'foundry', 'harbor', 'terracotta']);
});
