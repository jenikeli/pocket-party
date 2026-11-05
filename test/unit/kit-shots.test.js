// Unit tests for the kit-shots tool's command line (tools/kit-shots.js).

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArguments } from '../../tools/kit-shots.js';

test('the sheet is named after the pieces by default', () => {
  assert.deepEqual(parseArguments(['guardrail', 'palm']), { pieces: ['guardrail', 'palm'], bloom: false, course: null, name: 'guardrail-palm' });
});

test('--name sets the sheet name, wherever it stands', () => {
  assert.deepEqual(parseArguments(['--name', 'before', 'palm']), { pieces: ['palm'], bloom: false, course: null, name: 'before' });
  assert.deepEqual(parseArguments(['palm', '--name', 'after']), { pieces: ['palm'], bloom: false, course: null, name: 'after' });
});

test('no piece, or --name without a value, is an error that shows the usage', () => {
  assert.throws(() => parseArguments([]), /Usage/);
  assert.throws(() => parseArguments(['--name', 'before']), /Usage/);
  assert.throws(() => parseArguments(['palm', '--name']), /Usage/);
});

test('--course takes a course id and the distances, and names the sheet after them', () => {
  assert.deepEqual(parseArguments(['--course', 'seaside-skyway', '100', '300']),
    { pieces: ['100', '300'], bloom: false, course: 'seaside-skyway', name: 'seaside-skyway-100-300' });
  assert.deepEqual(parseArguments(['--course', 'test-track', '--bloom', '--name', 'x', '50']),
    { pieces: ['50'], bloom: true, course: 'test-track', name: 'x' });
});

test('--course alone asks for the overview only, but needs an id and numeric distances', () => {
  assert.equal(parseArguments(['--course', 'test-track']).pieces.length, 0);
  assert.throws(() => parseArguments(['--course']), /Usage/);
  assert.throws(() => parseArguments(['--course', 'test-track', 'guardrail']), /Usage/);
});

test('--bloom is a flag, and adds -bloom to the default sheet name', () => {
  assert.deepEqual(parseArguments(['--bloom', 'palm']), { pieces: ['palm'], bloom: true, course: null, name: 'palm-bloom' });
  assert.deepEqual(parseArguments(['palm', '--bloom', '--name', 'x']), { pieces: ['palm'], bloom: true, course: null, name: 'x' });
});
