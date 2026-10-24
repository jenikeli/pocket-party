// How a 3D kart speeds up, slows down and turns, from Mario Kart 8 Deluxe's own numbers for a middle build
// (level 10) at 150cc, as listed in docs/mk8dx-reference.md. Plain functions of numbers, unit tested in Node.
// Used by kart-physics.js, stepped at the fixed 60 Hz, which is also MK8DX's frame rate, so its per-frame
// numbers apply to one step each.

// MK8DX's values, in its own distance units per frame. Its unit's size is not public, so only their ratios
// are used: everything below is scaled by TOP_SPEED.
const MK8_TOP_SPEED = 7.75;
// "The most that can be added to the speed in one frame" (Drive_AccLmtFwd).
const MK8_ACCELERATION_LIMIT = 0.08;
// Drive_SpdKfFwd. Not explained by the wiki. Our reading, not verified: each frame the kart closes this share
// of the gap to top speed, capped by the limit above. 0.01 x 7.75 is close to the 0.08 limit, which is why it
// reads that way; it gives an exponential approach, 90% of top speed after about 3.8 s.
const MK8_RELATIVE_ACCELERATION = 0.01;
// Drive_DirRotH. Our reading, not verified: radians per frame at full steering, about 38 degrees a second.
const MK8_STEERING = 0.011;
const FRAMES_PER_SECOND = 60;

// Our scale. A kart is 2 units long; 24 units a second is 12 kart lengths a second, a guess until MK8DX
// footage gives the real number (see "Reference footage" in plan.md).
export const TOP_SPEED = 24;
export const ACCELERATION_LIMIT = (MK8_ACCELERATION_LIMIT / MK8_TOP_SPEED) * TOP_SPEED * FRAMES_PER_SECOND;
// Radians per second at full steering, the same at any speed above STEER_FULL_SPEED, so a slower kart turns
// tighter (as in MK8DX, where a hairpin needs braking or a drift).
export const STEERING_RATE = MK8_STEERING * FRAMES_PER_SECOND;

// Our own guesses (MK8DX's data has no numbers for these), in units per second and units per second squared.
const BRAKING = 30;
const MAX_REVERSE_SPEED = 6;
const REVERSE_ACCELERATION = 8;
const COASTING = 6;
// On the shoulders the top speed drops to this share. MK8DX's traction stat sets it; its value is not public.
export const OFF_ROAD_SPEED_SHARE = 0.5;
// How quickly a kart faster than its top speed (onto grass, or after a bump) slows to it.
const OFF_ROAD_DRAG = 30;
const OVER_TOP_DRAG = 10;
// Below this speed steering fades out, so a kart standing still cannot spin on the spot; in reverse it flips,
// as with a real car.
const STEER_FULL_SPEED = 4;

// `speed` is the kart's speed along its nose (negative in reverse). `controls` is { steer, accelerate, brake }.
// `offRoad` is true on the shoulders. Returns the speed after `dt` seconds.
export function nextSpeed(speed, controls, offRoad, dt) {
  const topSpeed = offRoad ? TOP_SPEED * OFF_ROAD_SPEED_SHARE : TOP_SPEED;
  if (speed > topSpeed) {
    // Faster than the top speed (just onto the grass, or pushed by a bump): drag it down, whatever the pedals.
    return Math.max(speed - (offRoad ? OFF_ROAD_DRAG : OVER_TOP_DRAG) * dt, topSpeed);
  }
  if (controls.brake) {
    return speed > 0 ? Math.max(speed - BRAKING * dt, 0) : Math.max(speed - REVERSE_ACCELERATION * dt, -MAX_REVERSE_SPEED);
  }
  if (controls.accelerate) {
    if (speed < 0) {
      return Math.min(speed + BRAKING * dt, 0);
    }
    // The share of the gap closed in dt: MK8_RELATIVE_ACCELERATION per frame, compounded.
    const share = 1 - (1 - MK8_RELATIVE_ACCELERATION) ** (dt * FRAMES_PER_SECOND);
    return speed + Math.min(ACCELERATION_LIMIT * dt, (topSpeed - speed) * share);
  }
  return speed > 0 ? Math.max(speed - COASTING * dt, 0) : Math.min(speed + COASTING * dt, 0);
}

// How far the kart turns in `dt` seconds, in radians (positive is right), for `steer` from -1 to 1.
export function turnAngle(steer, speed, dt) {
  const share = Math.min(Math.max(speed / STEER_FULL_SPEED, -1), 1);
  return steer * STEERING_RATE * share * dt;
}
