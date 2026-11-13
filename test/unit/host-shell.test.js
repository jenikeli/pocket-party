// Unit tests for the plain parts of the host's HTML shell: the join window's QR code (host/qr-code.js), the
// stage's em (host/stage.js), the loading bar's creep (host/loading-screen.js), the shell's sounds
// (host/shell-sounds.js) and the protocol's controller screens. The screens themselves are browser-tested.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qrCodeSvg, joinUrl, QUIET_ZONE_MODULES } from '../../host/qr-code.js';
import { stageEm } from '../../host/stage.js';
import { creepFraction } from '../../host/loading-screen.js';
import { qrcode } from '../../host/vendor/qrcode-generator-2.0.4.mjs';
import { playShellSound } from '../../host/shell-sounds.js';
import { CONTROLLER_SCREENS } from '../../shared/protocol.js';

// The dark squares an SVG from qrCodeSvg draws, as 'column,row' strings in the code's own grid (border removed).
function darkSquaresIn(svg) {
  const squares = new Set();
  for (const [, x, y] of svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
    squares.add(`${Number(x) - QUIET_ZONE_MODULES},${Number(y) - QUIET_ZONE_MODULES}`);
  }
  return squares;
}

test('the join link is the controller page with the room code', () => {
  assert.equal(joinUrl('https://10.60.55.71:3000', 'ZJNW'), 'https://10.60.55.71:3000/?room=ZJNW');
});

test('the QR code encodes the join link, module by module, inside a 4-module white border', () => {
  const url = joinUrl('https://10.60.55.71:3000', 'ZJNW');
  const svg = qrCodeSvg(url);
  // The same library and settings, read back module by module: each dark module must be drawn, nothing else.
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const count = qr.getModuleCount();
  const expected = new Set();
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (qr.isDark(row, column)) {
        expected.add(`${column},${row}`);
      }
    }
  }
  assert.deepEqual(darkSquaresIn(svg), expected);
  const size = count + QUIET_ZONE_MODULES * 2;
  assert.match(svg, new RegExp(`viewBox="0 0 ${size} ${size}"`));
  assert.match(svg, new RegExp(`<rect width="${size}" height="${size}" fill="#ffffff"/>`));
  // A different link gives a different code, so the check above is not passing on a fixed pattern.
  assert.notDeepEqual(darkSquaresIn(qrCodeSvg(joinUrl('https://10.60.55.71:3000', 'ABCD'))), expected);
});

test('the stage em is 1/80 of the largest 16:9 box that fits the window', () => {
  assert.equal(stageEm(1920, 1080), 24);
  // A 4:3 iPad: as wide as the screen, with bars above and below.
  assert.equal(stageEm(1024, 768), 12.8);
  // A window taller than 16:9 is limited by its width, a wider one by its height.
  assert.equal(stageEm(800, 1000), 10);
  assert.equal(stageEm(3200, 900), 20);
});

test('the loading bar creeps from 0 towards 90% and never gets there', () => {
  assert.equal(creepFraction(0), 0);
  assert.ok(creepFraction(1000) > 0.2 && creepFraction(1000) < 0.3);
  assert.ok(creepFraction(3000) > creepFraction(1000));
  assert.ok(creepFraction(60000) < 0.9);
  assert.ok(creepFraction(60000) > 0.89);
});

test('the shell\'s sounds play without failing before the audio is unlocked', () => {
  // Before Tap to start's unlock every sound is a no-op, so this checks only that each name exists and runs.
  for (const name of ['join', 'leave', 'click', 'play']) {
    playShellSound(name);
  }
});

// M10b: a room is one game, so a phone in a room is always on the game's screen; the phone lobby went.
test('the only controller screen is the game', () => {
  assert.deepEqual(Object.values(CONTROLLER_SCREENS), ['game']);
});
