// How far a kart's wheels have turned flat for anti-gravity (M7d5): eased in and out over a quarter second, not
// snapped, as the reference game's wheels fold. Drawing only. Plain functions, unit tested in Node. Used by kart-models.js.

// How long the wheels take to turn all the way flat, or back.
export const ANTI_GRAVITY_SECONDS = 0.25;

// The share (0 upright, 1 flat) a frame later: it moves at a steady rate toward 1 while `antiGravity` is true and
// toward 0 otherwise. `dt` is the real time since the last drawn frame, in seconds.
export function nextAntiGravityShare(share, antiGravity, dt) {
  const step = dt / ANTI_GRAVITY_SECONDS;
  return antiGravity ? Math.min(1, share + step) : Math.max(0, share - step);
}

// The share as drawn: slow at both ends (a smoothstep), so the wheels start and stop turning softly.
export function easedShare(share) {
  return share * share * (3 - 2 * share);
}
