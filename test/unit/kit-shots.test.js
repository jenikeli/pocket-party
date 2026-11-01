// Unit tests for the kit-shots tool's command line (tools/kit-shots.js).

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArguments } from '../../tools/kit-shots.js';

test('the sheet is named after the pieces by default', () => {
  assert.deepEqual(parseArguments(['guardrail', 'palm']), { pieces: ['guardrail', 'palm'], name: 'guardrail-palm' });
});

test('--name sets the sheet name, wherever it stands', () => {
  assert.deepEqual(parseArguments(['--name', 'before', 'palm']), { pieces: ['palm'], name: 'before' });
  assert.deepEqual(parseArguments(['palm', '--name', 'after']), { pieces: ['palm'], name: 'after' });
});

test('no piece, or --name without a value, is an error that shows the usage', () => {
  assert.throws(() => parseArguments([]), /Usage/);
  assert.throws(() => parseArguments(['--name', 'before']), /Usage/);
  assert.throws(() => parseArguments(['palm', '--name']), /Usage/);
});
