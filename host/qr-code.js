// Makes a QR code as SVG markup, so the host can show the join link without any image files. The SVG scales
// to any size and stays sharp. Used by host/join-window.js.

// Relative, not /host/..., so the unit tests can load this file in Node.
import { qrcode } from './vendor/qrcode-generator-2.0.4.mjs';

// Scanners need a light border at least 4 modules (QR "pixels") wide around the code.
export const QUIET_ZONE_MODULES = 4;

// The SVG for `text`: a white square, border included, with one 1x1 square per dark module, so the viewBox is
// counted in modules. Only our own join link goes in (letters, digits and URL punctuation), and the markup is
// numbers otherwise, so it is safe to put in innerHTML.
export function qrCodeSvg(text) {
  // Version 0 lets the library pick the smallest grid that fits; 'M' error correction survives some glare.
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const size = moduleCount + QUIET_ZONE_MODULES * 2;
  const squares = [];
  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (qr.isDark(row, column)) {
        squares.push(`M${column + QUIET_ZONE_MODULES} ${row + QUIET_ZONE_MODULES}h1v1h-1z`);
      }
    }
  }
  // crispEdges stops the browser smoothing each square's edge, which would leave faint seams between modules.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" ` +
    `role="img" aria-label="QR code of the join link">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/>` +
    `<path fill="#000000" d="${squares.join('')}"/></svg>`
  );
}

// The link a phone opens to join: the controller page with the room code filled in.
export function joinUrl(origin, roomCode) {
  return `${origin}/?room=${roomCode}`;
}
