// Latency numbers for the input lab: round-trip time from PING/PONG, and jitter from input timestamps.
// Used by host/games/input-lab/index.js. Plain functions with no Phaser, so they run in Node tests.

// Enough round trips (one a second) to smooth over a single slow one without hiding a lasting change.
const ROUND_TRIP_SAMPLES = 10;
const JITTER_WINDOW_MS = 1000;

// Returns { add(ms), summary() }. summary() is { last, average, max } over the newest samples, or null.
export function createRoundTripStats() {
  const samples = [];

  function add(ms) {
    samples.push(ms);
    if (samples.length > ROUND_TRIP_SAMPLES) {
      samples.shift();
    }
  }

  function summary() {
    if (samples.length === 0) {
      return null;
    }
    const total = samples.reduce((sum, ms) => sum + ms, 0);
    return {
      last: Math.round(samples.at(-1)),
      average: Math.round(total / samples.length),
      max: Math.round(Math.max(...samples)),
    };
  }

  return { add, summary };
}

// Returns { record(receivedAt, sentAt), spread(now) }, all times from Date.now().
//
// receivedAt is the host's clock and sentAt the phone's, and the two clocks never agree exactly, so
// receivedAt - sentAt is (clock difference + one-way delay). The clock difference stays the same from one
// message to the next, so how much that number varies is how much the one-way delay varies: the jitter.
// spread() reports max - min over the last second, or null with fewer than two inputs.
export function createJitterMeter() {
  const entries = []; // { receivedAt, offset }, oldest first

  function dropOld(now) {
    while (entries.length > 0 && entries[0].receivedAt <= now - JITTER_WINDOW_MS) {
      entries.shift();
    }
  }

  function record(receivedAt, sentAt) {
    entries.push({ receivedAt, offset: receivedAt - sentAt });
    dropOld(receivedAt);
  }

  function spread(now) {
    dropOld(now);
    if (entries.length < 2) {
      return null;
    }
    const offsets = entries.map((entry) => entry.offset);
    return Math.max(...offsets) - Math.min(...offsets);
  }

  return { record, spread };
}
