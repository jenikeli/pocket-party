// Stops double-tap and pinch zoom on the phone page. touch-action in style.css does most of it; iPhone Safari
// still fires its own gesture events and a dblclick after a double tap, so those defaults are cancelled here.
// Used by controller/main.js.

const ZOOM_EVENTS = ['dblclick', 'gesturestart', 'gesturechange', 'gestureend'];

// `target` is the document. The gesture events are Safari's (nothing else fires them), so listing them is harmless.
export function blockZoomGestures(target) {
  for (const eventName of ZOOM_EVENTS) {
    // Not passive: a passive listener may not cancel the event.
    target.addEventListener(eventName, (event) => event.preventDefault(), { passive: false });
  }
}
