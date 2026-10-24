// Where each split-screen view sits on the canvas: 1 view fills it, 2 are stacked top and bottom, 4 are
// quarters (3 players get quarters too, as in MK8DX). Plain maths (no Three.js, no DOM), unit tested in Node.
// Used by host/games/kart-3d/views.js, and by the M6a spike's views.js until M7 removes the spike.

// A thin gap between views, as in MK8DX's split screen, so the views read as separate screens.
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
