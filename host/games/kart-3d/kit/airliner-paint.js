// Painting a plane's fuselage (M9): a canvas laid on the fuselage by kit/airliner-lofts.js's texture coordinates,
// along it from the nose (left to right on the canvas) and round it (the left side in the canvas's lower half,
// the right side upside down in its upper half). Features are placed in the plane's own units: x along it and
// the angle round it from the bottom (PI at the top), and drawn upright and the right way round on both sides.
// Used by kit/airliner-liveries.js and kit/prop-plane.js.

import { createCanvas, canvasTexture } from '../canvas-texture.js';

// `width` by `height` pixels for a fuselage `length` long whose nose is at `noseX`, its sections sectionAt(x)
// ({ centre, halfHeight, halfWidth }). Returns { context, columnAt, aroundAt, place, band, toTexture }.
export function createFuselagePainter({ width, height, length, noseX, sectionAt }) {
  const { context, canvas } = createCanvas(width, height);
  const columnAt = (x) => ((noseX - x) / length) * width;
  // The left side runs up the canvas from its bottom row, the right side down it from its top row.
  const rowAt = (side, around) => (side === 'left' ? height * (1 - around / (2 * Math.PI)) : (height * around) / (2 * Math.PI));
  const sides = ['left', 'right'];

  // The angle round the fuselage at `x` where its skin is at height `y`.
  function aroundAt(x, y) {
    const { centre, halfHeight } = sectionAt(x);
    return Math.acos(Math.min(Math.max(-(y - centre) / halfHeight, -1), 1));
  }

  // Calls draw(context) on both sides with the canvas moved to (x, around) and scaled so one unit of the
  // drawing is one unit of the plane's skin there, y running down the skin; on the right side it is turned
  // half round, so the drawing reads the same way on both.
  function place(x, around, draw) {
    const { halfHeight, halfWidth } = sectionAt(x);
    const roundLength = 2 * Math.PI * Math.sqrt((halfHeight ** 2 + halfWidth ** 2) / 2);
    for (const side of sides) {
      context.save();
      context.translate(columnAt(x), rowAt(side, around));
      if (side === 'right') {
        context.rotate(Math.PI);
      }
      context.scale(width / length, height / roundLength);
      draw(context);
      context.restore();
    }
  }

  // Fills `fill` on both sides between the angles low(x) and high(x), from `fromX` back to `toX`.
  function band(fromX, toX, low, high, fill) {
    const steps = Math.max(2, Math.ceil(Math.abs(fromX - toX) * 2));
    const xs = Array.from({ length: steps + 1 }, (unused, step) => fromX + ((toX - fromX) * step) / steps);
    context.fillStyle = fill;
    for (const side of sides) {
      context.beginPath();
      xs.forEach((x) => context.lineTo(columnAt(x), rowAt(side, high(x))));
      [...xs].reverse().forEach((x) => context.lineTo(columnAt(x), rowAt(side, low(x))));
      context.closePath();
      context.fill();
    }
  }

  function toTexture() {
    return canvasTexture(canvas);
  }

  return { context, columnAt, aroundAt, place, band, toTexture };
}

// A rounded rectangle path `width` by `height` round (0, 0), its corners rounded by `radius`.
export function roundedRectPath(context, width, height, radius) {
  context.beginPath();
  context.roundRect(-width / 2, -height / 2, width, height, radius);
}
