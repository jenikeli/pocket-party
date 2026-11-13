// The 2D race's stadium track as plain maths: the road is every point whose distance from one horizontal centre
// segment lies between an inner and an outer radius. Gives the walls, "how far round the lap", and points along
// the road. No Phaser, no DOM, so it is unit tested in Node. Used by the race rules and the renderer.

// The track fills the 1920x1080 design: the outer edge reaches 70 px from the top and bottom, and the bottom
// right corner stays clear of the road (the shell's buttons sat there until M10b).
export const TRACK = Object.freeze({
  centerX: 960,
  centerY: 540,
  // Half the length of the straights, so the centre segment runs from centerX - 430 to centerX + 430.
  halfLength: 430,
  innerRadius: 250,
  outerRadius: 470,
});

// Lap progress is measured along the middle of the road, so every lap is the same length whichever line a
// kart drives.
const MIDDLE_RADIUS = (TRACK.innerRadius + TRACK.outerRadius) / 2;
const STRAIGHT_LENGTH = 2 * TRACK.halfLength;
const BEND_LENGTH = Math.PI * MIDDLE_RADIUS;
export const LAP_LENGTH = 2 * STRAIGHT_LENGTH + 2 * BEND_LENGTH;

const LEFT_END_X = TRACK.centerX - TRACK.halfLength;
const RIGHT_END_X = TRACK.centerX + TRACK.halfLength;

// Karts drive the bottom straight to the right (screen y points down), up round the right bend, left along the
// top and down round the left bend: every bend is a left turn. The start line crosses the middle of the bottom
// straight, at distance 0.

// The point on the centre segment nearest to (x, y), and how far away it is.
function nearestOnSegment(x, y) {
  const nearestX = Math.min(Math.max(x, LEFT_END_X), RIGHT_END_X);
  return { nearestX, distance: Math.hypot(x - nearestX, y - TRACK.centerY) };
}

export function isOnRoad(x, y) {
  const { distance } = nearestOnSegment(x, y);
  return distance >= TRACK.innerRadius && distance <= TRACK.outerRadius;
}

// How far along the lap (x, y) is, from 0 at the start line up to LAP_LENGTH, measured on the middle line.
// Points off the middle line count as level with the middle-line point beside them.
export function lapPosition(x, y) {
  const dy = y - TRACK.centerY;
  if (x >= LEFT_END_X && x <= RIGHT_END_X) {
    // On a straight: below the centre is the bottom straight (driven rightwards), above it the top (leftwards).
    if (dy >= 0) {
      return x >= TRACK.centerX
        ? x - TRACK.centerX
        : LAP_LENGTH - (TRACK.centerX - x);
    }
    return TRACK.halfLength + BEND_LENGTH + (RIGHT_END_X - x);
  }
  if (x > RIGHT_END_X) {
    // The right bend, from the bottom (angle +90 degrees) through the far right (0) to the top (-90 degrees).
    const angle = Math.atan2(dy, x - RIGHT_END_X);
    return TRACK.halfLength + (Math.PI / 2 - angle) * MIDDLE_RADIUS;
  }
  // The left bend, from the top (-90 degrees) through the far left (+-180) to the bottom (+90 degrees).
  const angle = Math.atan2(dy, x - LEFT_END_X);
  const turned = angle < 0 ? -Math.PI / 2 - angle : (3 * Math.PI) / 2 - angle;
  return TRACK.halfLength + BEND_LENGTH + STRAIGHT_LENGTH + turned * MIDDLE_RADIUS;
}

// The point `distance` along the lap (any number; it wraps), `sideOffset` px out from the middle line (negative
// is towards the infield), and the driving direction there in radians (0 = right, +PI/2 = down).
export function pointOnTrack(distance, sideOffset = 0) {
  const along = ((distance % LAP_LENGTH) + LAP_LENGTH) % LAP_LENGTH;
  const radius = MIDDLE_RADIUS + sideOffset;
  const bottomY = TRACK.centerY + radius;
  const topY = TRACK.centerY - radius;
  if (along < TRACK.halfLength) {
    return { x: TRACK.centerX + along, y: bottomY, heading: 0 };
  }
  if (along < TRACK.halfLength + BEND_LENGTH) {
    const angle = Math.PI / 2 - (along - TRACK.halfLength) / MIDDLE_RADIUS;
    return bendPoint(RIGHT_END_X, angle, radius);
  }
  if (along < TRACK.halfLength + BEND_LENGTH + STRAIGHT_LENGTH) {
    return { x: RIGHT_END_X - (along - TRACK.halfLength - BEND_LENGTH), y: topY, heading: Math.PI };
  }
  if (along < TRACK.halfLength + 2 * BEND_LENGTH + STRAIGHT_LENGTH) {
    const angle = -Math.PI / 2 - (along - TRACK.halfLength - BEND_LENGTH - STRAIGHT_LENGTH) / MIDDLE_RADIUS;
    return bendPoint(LEFT_END_X, angle, radius);
  }
  return { x: LEFT_END_X + (along - TRACK.halfLength - 2 * BEND_LENGTH - STRAIGHT_LENGTH), y: bottomY, heading: 0 };
}

// Driving round a bend, the angle from its centre falls, so the direction of travel is the angle minus 90 degrees.
function bendPoint(endX, angle, radius) {
  return {
    x: endX + Math.cos(angle) * radius,
    y: TRACK.centerY + Math.sin(angle) * radius,
    heading: angle - Math.PI / 2,
  };
}

// If a circle of `radius` at (x, y) pokes through a wall, returns where to put it back so it just touches,
// and the wall's unit normal pointing back onto the road: { x, y, normalX, normalY }. Returns null when the
// circle is clear of both walls.
export function wallContact(x, y, radius) {
  const { nearestX, distance } = nearestOnSegment(x, y);
  // Straight out from the centre segment. The road never comes near the segment itself, so distance > 0.
  const outX = (x - nearestX) / distance;
  const outY = (y - TRACK.centerY) / distance;
  const closest = TRACK.innerRadius + radius;
  const farthest = TRACK.outerRadius - radius;
  if (distance > farthest) {
    return { x: nearestX + outX * farthest, y: TRACK.centerY + outY * farthest, normalX: -outX, normalY: -outY };
  }
  if (distance < closest) {
    return { x: nearestX + outX * closest, y: TRACK.centerY + outY * closest, normalX: outX, normalY: outY };
  }
  return null;
}
