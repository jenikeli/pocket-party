// A small seeded random number source (mulberry32), so the 3D race's scenery and textures come out the same on
// every load and every host. Plain maths, unit tested in Node. Used by textures.js and seaside-scenery.js.

// Returns a function that gives the next number in 0..1 each call, the same sequence for the same seed.
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// A number between `low` and `high` from `random`.
export function between(random, low, high) {
  return low + (high - low) * random();
}
