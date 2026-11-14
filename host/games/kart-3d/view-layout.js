// Where each split-screen view sits on the canvas: 1 view fills it, 2 are stacked top and bottom, 4 are
// quarters (3 players get quarters too, as in the reference game). Plain maths (no Three.js, no DOM), unit tested in Node.
// Used by host/games/kart-3d/views.js.

// A thin gap between views, as in the reference game's split screen, so the views read as separate screens.
const GAP = 4;

// Rectangles in CSS pixels with y measured from the bottom, which is how WebGL's viewport and scissor count.
// View 0 is top left. Sizes are whole pixels.
export function viewRects(viewCount, width, height) {
  if (viewCount === 1) {
    return [{ x: 0, y: 0, width, height }];
  }
  const halfHeight = Math.floor((height - GAP) / 2);
  const top = height - halfHeight;
  if (viewCount === 2) {
    return [
      { x: 0, y: top, width, height: halfHeight },
      { x: 0, y: 0, width, height: halfHeight },
    ];
  }
  if (viewCount === 4) {
    const halfWidth = Math.floor((width - GAP) / 2);
    const right = width - halfWidth;
    return [
      { x: 0, y: top, width: halfWidth, height: halfHeight },
      { x: right, y: top, width: halfWidth, height: halfHeight },
      { x: 0, y: 0, width: halfWidth, height: halfHeight },
      { x: right, y: 0, width: halfWidth, height: halfHeight },
    ];
  }
  throw new Error(`Views come in 1, 2 or 4, not ${viewCount}`);
}

// The gaps between the views, as rectangles counted like viewRects: the canvas left over once the views are
// drawn. Bloom spreads glow into them, so they are cleared to black again after it.
export function gapRects(viewCount, width, height) {
  if (viewCount === 1) {
    return [];
  }
  const rects = viewRects(viewCount, width, height);
  const topLeft = rects[0];
  const bottomRight = rects[rects.length - 1];
  const across = { x: 0, y: bottomRight.height, width, height: topLeft.y - bottomRight.height };
  if (viewCount === 2) {
    return [across];
  }
  const down = { x: topLeft.width, y: 0, width: bottomRight.x - topLeft.width, height };
  return [across, down];
}
