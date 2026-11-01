// Unit tests for the Blender tool's pure parts (tools/blender.js): the command line, finding Blender and the
// manifest entry. No Blender runs here.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { blenderCommand, modelEntry, parseArguments, withAsset } from '../../tools/blender.js';

test('one model name, with or without --preview, wherever it stands', () => {
  assert.deepEqual(parseArguments(['palm']), { model: 'palm', preview: false });
  assert.deepEqual(parseArguments(['palm', '--preview']), { model: 'palm', preview: true });
  assert.deepEqual(parseArguments(['--preview', 'stone-pillar']), { model: 'stone-pillar', preview: true });
});

test('no model, two models or a name that could reach outside tools/blender is an error that shows the usage', () => {
  assert.throws(() => parseArguments([]), /Usage/);
  assert.throws(() => parseArguments(['--preview']), /Usage/);
  assert.throws(() => parseArguments(['palm', 'pillar']), /Usage/);
  assert.throws(() => parseArguments(['../palm']), /Usage/);
});

test('Blender comes from BLENDER when set, else from the PATH', () => {
  assert.equal(blenderCommand({ BLENDER: '/opt/blender/blender' }), '/opt/blender/blender');
  assert.equal(blenderCommand({}), 'blender');
  assert.equal(blenderCommand({ BLENDER: '' }), 'blender');
});

test('a model entry lists the glb under assets/models with its hash, size and source', () => {
  const contents = Buffer.from('glTF bytes');
  assert.deepEqual(modelEntry('palm', contents), {
    path: 'models/palm.glb',
    sha256: crypto.createHash('sha256').update(contents).digest('hex'),
    bytes: contents.length,
    source: 'tools/blender/palm.py',
    licence: 'own work',
    usedBy: 'host/kit-shots (M7d4c2 spike)',
  });
});

test('a new model is added after the listed assets, which are left as they were', () => {
  const asphalt = { path: 'textures/asphalt.jpg', sha256: 'a', bytes: 1, source: 's', licence: 'CC0 1.0', usedBy: 'u' };
  const palm = modelEntry('palm', Buffer.from('one'));
  const manifest = { assets: [asphalt] };
  assert.deepEqual(withAsset(manifest, palm), { assets: [asphalt, palm] });
  assert.deepEqual(manifest, { assets: [asphalt] });
});

test('a rebuilt model updates its hash and size and keeps its other fields', () => {
  const listed = { ...modelEntry('palm', Buffer.from('one')), usedBy: 'host/games/kart-3d/kit/palm.js' };
  const rebuilt = modelEntry('palm', Buffer.from('rebuilt'));
  const { assets } = withAsset({ assets: [listed] }, rebuilt);
  assert.deepEqual(assets, [{ ...listed, sha256: rebuilt.sha256, bytes: rebuilt.bytes }]);
});
