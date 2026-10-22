// Counts events per second over a sliding one-second window, for the input lab's "Hz" readouts.
// Used by the controller (messages it sent) and the host (messages it received from each player).

const WINDOW_MS = 1000;

// Returns { record(now), perSecond(now) }. `now` is in milliseconds, from performance.now() or similar.
export function createRateMeter() {
  const times = []; // oldest first

  function dropOld(now) {
    while (times.length > 0 && times[0] <= now - WINDOW_MS) {
      times.shift();
    }
  }

  function record(now) {
    times.push(now);
    dropOld(now);
  }

  // With a one-second window, the number of events still in it is the rate in Hz.
  function perSecond(now) {
    dropOld(now);
    return times.length;
  }

  return { record, perSecond };
}
