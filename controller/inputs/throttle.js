// Limits how often an input module sends: at most one value per interval, always the newest one.
// Used by controller/inputs/drag.js and controller/inputs/tilt.js, whose sources fire faster than we want to send.

// Returns { queue(value), cancel() }. queue() never drops the last value: if a send is not allowed yet, a timer
// sends whatever is newest when it is, so a final value (a release, a phone coming to rest) always goes out.
export function createThrottle(intervalMs, send) {
  let pendingValue = null;
  let flushTimer = null;
  let lastSentAt = -Infinity;

  function queue(value) {
    pendingValue = value;
    if (flushTimer !== null) {
      return;
    }
    const wait = Math.max(0, lastSentAt + intervalMs - performance.now());
    flushTimer = setTimeout(flush, wait);
  }

  function flush() {
    flushTimer = null;
    lastSentAt = performance.now();
    send(pendingValue);
  }

  function cancel() {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  return { queue, cancel };
}
