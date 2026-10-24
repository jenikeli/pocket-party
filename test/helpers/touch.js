// Several fingers on an emulated phone at once, for the browser tests: Playwright's mouse is one pointer, but the
// kart controls need the stick and a pedal held together. Uses Chromium's DevTools protocol
// (Input.dispatchTouchEvent), which makes real touches, so pointer events and pointer capture behave as on a
// phone. Chromium only, on a context with hasTouch (the Pixel devices have it).

// Returns { press(finger, x, y), move(finger, x, y), release(finger) }. `finger` is any small number naming
// the touch; x and y are CSS pixels in the page's viewport.
export async function openTouchscreen(page) {
  const session = await page.context().newCDPSession(page);
  // finger -> { x, y }, the touches currently down.
  const fingers = new Map();

  // The protocol takes every touch that is down after the change and works out which one changed.
  function send(type) {
    const touchPoints = [...fingers].map(([id, point]) => ({ id, x: point.x, y: point.y }));
    return session.send('Input.dispatchTouchEvent', { type, touchPoints });
  }

  return {
    press(finger, x, y) {
      fingers.set(finger, { x, y });
      return send('touchStart');
    },
    move(finger, x, y) {
      fingers.set(finger, { x, y });
      return send('touchMove');
    },
    release(finger) {
      fingers.delete(finger);
      return send('touchEnd');
    },
  };
}
