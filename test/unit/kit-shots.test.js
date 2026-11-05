// Unit tests for the kit-shots tool's command line (tools/kit-shots.js).

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArguments } from '../../tools/kit-shots.js';

test('the sheet is named after the pieces by default', () => {
  assert.deepEqual(parseArguments(['guardrail', 'palm']), { pieces: ['guardrail', 'palm'], bloom: false, name: 'guardrail-palm' });
});

test('--name sets the sheet name, wherever it stands', () => {
  assert.deepEqual(parseArguments(['--name', 'before', 'palm']), { pieces: ['palm'], bloom: false, name: 'before' });
  assert.deepEqual(parseArguments(['palm', '--name', 'after']), { pieces: ['palm'], bloom: false, name: 'after' });
});

test('no piece, or --name without a value, is an error that shows the usage', () => {
  assert.throws(() => parseArguments([]), /Usage/);
  assert.throws(() => parseArguments(['--name', 'before']), /Usage/);
  assert.throws(() => parseArguments(['palm', '--name']), /Usage/);
});

test('--bloom is a flag, and adds -bloom to the default sheet name', () => {
  assert.deepEqual(parseArguments(['--bloom', 'palm']), { pieces: ['palm'], bloom: true, name: 'palm-bloom' });
  assert.deepEqual(parseArguments(['palm', '--bloom', '--name', 'x']), { pieces: ['palm'], bloom: true, name: 'x' });
});
