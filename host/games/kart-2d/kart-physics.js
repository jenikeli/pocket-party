// Hand-written top-down arcade physics for the 2D race: throttle, brake, steering and grip for one kart, the
// walls, and karts bumping into each other. Plain functions on plain kart objects, unit tested in Node.
// Used by host/games/kart-2d/race.js, stepped at the fixed 60 Hz.

import { wallContact } from './track.js';

// Every kart is a circle of this radius for walls and bumps (it is drawn a little longer than wide).
export const KART_RADIUS = 18;

// Speeds in px/s and px/s per second, on the 1920x1080 design.
const MAX_SPEED = 420;
const ACCELERATION = 520;
const BRAKING = 900;
const MAX_REVERSE_SPEED = 140;
const REVERSE_ACCELERATION = 300;
// Rolling to a stop with no pedal pressed.
const COASTING = 220;
// Radians per second at full steering. Steering scales down below TURN_FULL_SPEED, so a kart standing still
// cannot spin on the spot, and flips in reverse, as with a real car.
const TURN_RATE = 2.6;
const TURN_FULL_SPEED = 160;
// How fast sideways sliding dies away (per second). Higher is grippier; this leaves a short slide in bends.
const GRIP = 8;
// How much of the speed into a wall or another kart bounces back (0 = none, 1 = all).
const WALL_BOUNCE = 0.3;
const KART_BOUNCE = 0.6;
// A kart that meets a wall at a shallow angle turns to slide along it instead of bouncing off nose first.
const WALL_ALIGN_ANGLE = Math.PI / 4;
// Scraping along a wall drags the kart down (per second while touching), so the wall is never the fast line.
const WALL_SCRAPE = 1.6;

// `kart` is { x, y, heading, velocityX, velocityY }: heading in radians (0 = right, +PI/2 = down, as screen
// y points down). `controls` is { steer, accelerate, brake }: steer -1 (left) to 1 (right), the others true
// or false. Moves the kart for `dt` seconds, ignoring walls and other karts.
export function driveKart(kart, controls, dt) {
  const forwardX = Math.cos(kart.heading);
  const forwardY = Math.sin(kart.heading);
  // Split the velocity into along the kart and across it, so grip can act on the sideways part only.
  let forwardSpeed = kart.velocityX * forwardX + kart.velocityY * forwardY;
  let sideSpeed = -kart.velocityX * forwardY + kart.velocityY * forwardX;

  forwardSpeed = applyPedals(forwardSpeed, controls, dt);
  const turnShare = Math.min(Math.max(forwardSpeed / TURN_FULL_SPEED, -1), 1);
  kart.heading = wrapAngle(kart.heading + controls.steer * TURN_RATE * turnShare * dt);
  sideSpeed *= Math.exp(-GRIP * dt);

  // The forward part follows the new heading at once; the sideways part is what is left of the slide.
  const newForwardX = Math.cos(kart.heading);
  const newForwardY = Math.sin(kart.heading);
  kart.velocityX = newForwardX * forwardSpeed - newForwardY * sideSpeed;
  kart.velocityY = newForwardY * forwardSpeed + newForwardX * sideSpeed;
  kart.x += kart.velocityX * dt;
  kart.y += kart.velocityY * dt;
}

// The new forward speed. Brake wins when both pedals are held; once stopped, braking reverses slowly.
function applyPedals(speed, controls, dt) {
  if (controls.brake) {
    return speed > 0 ? Math.max(speed - BRAKING * dt, 0) : Math.max(speed - REVERSE_ACCELERATION * dt, -MAX_REVERSE_SPEED);
  }
  if (controls.accelerate && speed < MAX_SPEED) {
    return Math.min(speed + ACCELERATION * dt, MAX_SPEED);
  }
  // Coasting, or faster than the top speed after a bump: slow down towards 0 (or towards the top speed).
  const target = controls.accelerate ? MAX_SPEED : 0;
  return speed > target ? Math.max(speed - COASTING * dt, target) : Math.min(speed + COASTING * dt, target);
}

// Puts the kart back on the road if it went through a wall, and takes away the speed it had into the wall.
// Returns true if it touched a wall.
export function hitWalls(kart, dt) {
  const contact = wallContact(kart.x, kart.y, KART_RADIUS);
  if (!contact) {
    return false;
  }
  kart.x = contact.x;
  kart.y = contact.y;
  const { normalX, normalY } = contact;
  const intoWall = kart.velocityX * normalX + kart.velocityY * normalY;
  if (intoWall < 0) {
    kart.velocityX -= (1 + WALL_BOUNCE) * intoWall * normalX;
    kart.velocityY -= (1 + WALL_BOUNCE) * intoWall * normalY;
  }
  const scrape = Math.exp(-WALL_SCRAPE * dt);
  kart.velocityX *= scrape;
  kart.velocityY *= scrape;
  alignWithWall(kart, normalX, normalY);
  return true;
}

// If the nose points into the wall at a shallow angle, turn it to point along the wall (whichever way along
// is nearer), so the kart slides on rather than grinding to a halt facing the wall.
function alignWithWall(kart, normalX, normalY) {
  const noseIntoWall = -(Math.cos(kart.heading) * normalX + Math.sin(kart.heading) * normalY);
  if (noseIntoWall <= 0 || Math.asin(Math.min(noseIntoWall, 1)) > WALL_ALIGN_ANGLE) {
    return;
  }
  // The two directions along the wall are the normal turned by +-90 degrees.
  const alongAngle = Math.atan2(normalX, -normalY);
  const nearer = Math.abs(wrapAngle(alongAngle - kart.heading)) <= Math.PI / 2 ? alongAngle : alongAngle + Math.PI;
  kart.heading = wrapAngle(nearer);
}

// Pushes every overlapping pair of karts apart, half each, and bounces their speeds along the line between
// them as for two equal masses.
export function bumpKarts(karts) {
  for (let i = 0; i < karts.length; i += 1) {
    for (let j = i + 1; j < karts.length; j += 1) {
      bumpPair(karts[i], karts[j]);
    }
  }
}

function bumpPair(first, second) {
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  const distance = Math.hypot(dx, dy);
  const overlap = 2 * KART_RADIUS - distance;
  if (overlap <= 0) {
    return;
  }
  // Two karts on exactly the same spot have no direction between them, so pick one.
  const normalX = distance > 0 ? dx / distance : 1;
  const normalY = distance > 0 ? dy / distance : 0;
  first.x -= (normalX * overlap) / 2;
  first.y -= (normalY * overlap) / 2;
  second.x += (normalX * overlap) / 2;
  second.y += (normalY * overlap) / 2;
  const closingSpeed = (second.velocityX - first.velocityX) * normalX + (second.velocityY - first.velocityY) * normalY;
  if (closingSpeed >= 0) {
    return;
  }
  const impulse = ((1 + KART_BOUNCE) * closingSpeed) / 2;
  first.velocityX += impulse * normalX;
  first.velocityY += impulse * normalY;
  second.velocityX -= impulse * normalX;
  second.velocityY -= impulse * normalY;
}

// Into -PI..PI, so headings stay small numbers and two headings can be compared directly.
export function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
