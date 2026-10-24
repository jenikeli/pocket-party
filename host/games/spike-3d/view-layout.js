// Where each split-screen view sits on the canvas, for the M6a spike: 1 view fills it, 2 are stacked top and
// bottom, 4 are quarters. Plain maths (no Three.js, no DOM), unit tested in Node. Used by views.js.

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
  throw new Error(`The spike draws 1, 2 or 4 views, not ${viewCount}`);
}
