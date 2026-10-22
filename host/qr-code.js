// Draws a QR code with Phaser shapes, so the host can show the join link without any image files.
// Used by host/scenes/squares-scene.js.

import { qrcode } from '/host/vendor/qrcode-generator-2.0.4.mjs';

// Scanners need a light border at least 4 modules (QR "pixels") wide around the code.
const QUIET_ZONE_MODULES = 4;

// Draws the code for `text` centered on (centerX, centerY), at most sizePx wide including the border.
export function drawQrCode(scene, text, centerX, centerY, sizePx) {
  // Version 0 lets the library pick the smallest grid that fits; 'M' error correction survives some glare.
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const totalModules = moduleCount + QUIET_ZONE_MODULES * 2;
  // Whole-pixel modules keep the edges crisp, which makes the code easier to scan from a distance.
  const moduleSize = Math.floor(sizePx / totalModules);
  const drawnSize = moduleSize * totalModules;
  const left = Math.round(centerX - drawnSize / 2);
  const top = Math.round(centerY - drawnSize / 2);

  const graphics = scene.add.graphics();
  graphics.fillStyle(0xffffff);
  graphics.fillRect(left, top, drawnSize, drawnSize);

  graphics.fillStyle(0x000000);
  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (qr.isDark(row, column)) {
        const x = left + (column + QUIET_ZONE_MODULES) * moduleSize;
        const y = top + (row + QUIET_ZONE_MODULES) * moduleSize;
        graphics.fillRect(x, y, moduleSize, moduleSize);
      }
    }
  }
  return graphics;
}
