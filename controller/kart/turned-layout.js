// The kart controls' turned layout: on a portrait page they are drawn a quarter turn round, so a player with
// rotation lock on just turns the phone, its top end in the left hand, and reads them upright. The drawing is
// controller/kart/controls.css; this is what the inputs need to match it. Used by controller/kart/controls.js,
// steering.js and floating-stick.js. No imports, so the unit tests can load it in Node.

// The same media query controls.css draws the turned layout under, so the drawing and the inputs always agree.
export const PORTRAIT_QUERY = '(orientation: portrait)';

// How the phone is held while the turned layout shows, in the screen-angle terms controller/inputs/tilt.js uses:
// 90 is landscape with the phone's top end on the left.
export const TURNED_HELD_ANGLE = 90;

// A stick value from controller/inputs/drag.js ({ kind, x, y }, in page directions: x right, y down) in the
// directions the player sees. Unturned they are the same. Turned (CSS rotate(90deg), clockwise), the player's
// right runs down the page and their down runs to the page's left, so their x is the page's y and their y is
// minus the page's x. (0 - x rather than -x, so a centred stick gives 0, not -0.)
export function stickFromDrag(input, turned) {
  if (!turned) {
    return input;
  }
  return { kind: input.kind, x: input.y, y: 0 - input.x };
}

// Where a touch at page point (clientX, clientY) lands inside an element of the controls, in the element's own
// frame (x along its width, y down its height, from its top left corner), as the floating stick needs to draw its
// ring under the thumb. `box` is the element's getBoundingClientRect(). Turned a quarter turn clockwise, the
// element's own x runs down the page and its own y runs to the page's left, so its top left corner is the box's
// top right on the page.
export function pointInTurnedBox(clientX, clientY, box, turned) {
  if (!turned) {
    return { x: clientX - box.left, y: clientY - box.top };
  }
  return { x: clientY - box.top, y: box.right - clientX };
}
