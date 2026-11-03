// Where across the road a CPU driver aims (M7e): its racing line plus its own offset, moved aside to pass a
// slower kart in its way, kept clear of a kart alongside, and blended in from wherever it was when it joins the
// line (from its grid spot, or after being put back on the road). Plain functions on the driver's plain-data state
// (kart.cpu), unit tested in Node through cpu-driver.js. Used by cpu-driver.js every step.

import { progressBetween } from './track.js';
import { forwardSpeed } from './kart-physics.js';
import { lineLateralAt } from './cpu-road.js';

// Another kart is in the way if it is ahead within this distance (plus PASS_LOOK_SECONDS of driving), within
// PASS_WIDTH of where this one aims, and slower by PASS_CLOSING, or closer than TOO_CLOSE however fast.
const PASS_LOOK = 4;
const PASS_LOOK_SECONDS = 0.5;
const PASS_WIDTH = 2.2;
const PASS_CLOSING = 1;
const TOO_CLOSE = 3.5;
// It passes this far to the side of that kart, keeps to that side for PASS_SECONDS after it was last in the way,
// and moves across at PASS_RATE units a second.
const PASS_CLEAR = 2.6;
const PASS_SECONDS = 1.5;
const PASS_RATE = 3;
// Rejoining its line takes this long. From the grid every kart starts in its own column, so the field does not
// all squeeze onto one line at once.
const MERGE_SECONDS = 1.5;
// A pass keeps its aim this far inside the road's edges.
const EDGE_KEEP = 1.5;
// A kart whose middle is within this distance along the road is alongside (a kart is 2 long); it keeps its aim
// this far to the side of it, so it does not steer into it (two karts touch 2 apart).
const ALONGSIDE = 3;
const SIDE_CLEAR = 2.4;

// The aim fields of a fresh driver: shift how far a pass moves it off its line, passTarget the shift the pass
// wants and passLeft how much longer; mergeFrom the lateral it is rejoining its line from and mergeShare how
// far it has got (1 is on its line); clearLeft and clearRight the least and most lateral it may aim at, kept
// clear of karts alongside (null when none).
export function freshAim() {
  return { shift: 0, passTarget: 0, passLeft: 0, mergeFrom: 0, mergeShare: 1, clearLeft: null, clearRight: null };
}

// From now on it rejoins its line from `lateral`.
export function rejoinFrom(cpu, lateral) {
  cpu.mergeFrom = lateral;
  cpu.mergeShare = 0;
}

// Where it aims across the road at distance `s` along it (units right of the centre line).
export function aimLateral(track, cpu, s) {
  const onLine = lineLateralAt(track, s) + cpu.offset + cpu.shift;
  // Eased, so it leaves where it was gently and settles gently on its line.
  const blend = cpu.mergeShare * cpu.mergeShare * (3 - 2 * cpu.mergeShare);
  const lateral = cpu.mergeFrom + (onLine - cpu.mergeFrom) * blend;
  return Math.min(Math.max(lateral, cpu.clearLeft ?? -Infinity), cpu.clearRight ?? Infinity);
}

// Once a step: the merge goes on, and the pass's shift moves toward where a kart in the way wants it, or back.
export function updateAim(track, kart, karts, cpu, dt) {
  cpu.mergeShare = Math.min(cpu.mergeShare + dt / MERGE_SECONDS, 1);
  keepClearAlongside(track, kart, karts, cpu);
  cpu.passLeft = Math.max(cpu.passLeft - dt, 0);
  const blocker = kartInTheWay(track, kart, karts, cpu);
  if (blocker) {
    cpu.passTarget = passingShift(track, cpu, blocker);
    cpu.passLeft = PASS_SECONDS;
  }
  const target = cpu.passLeft > 0 ? cpu.passTarget : 0;
  const most = PASS_RATE * dt;
  cpu.shift += Math.min(Math.max(target - cpu.shift, -most), most);
}

// Sets clearLeft and clearRight from the karts alongside: never closer than SIDE_CLEAR to one, nor nearer to it
// than it already is.
function keepClearAlongside(track, kart, karts, cpu) {
  cpu.clearLeft = null;
  cpu.clearRight = null;
  for (const other of karts) {
    if (other === kart || other.respawnIn !== null || Math.abs(progressBetween(track, kart.s, other.s)) > ALONGSIDE) {
      continue;
    }
    if (other.lateral >= kart.lateral) {
      cpu.clearRight = Math.min(cpu.clearRight ?? Infinity, Math.max(other.lateral - SIDE_CLEAR, kart.lateral));
    } else {
      cpu.clearLeft = Math.max(cpu.clearLeft ?? -Infinity, Math.min(other.lateral + SIDE_CLEAR, kart.lateral));
    }
  }
}

// The nearest kart ahead that is in its way (see PASS_*), or null. Karts falling off are not in anyone's way.
function kartInTheWay(track, kart, karts, cpu) {
  const speed = forwardSpeed(kart);
  const look = PASS_LOOK + speed * PASS_LOOK_SECONDS;
  let nearest = null;
  let nearestGap = Infinity;
  for (const other of karts) {
    const gap = other === kart || other.respawnIn !== null ? -1 : progressBetween(track, kart.s, other.s);
    if (gap <= 0 || gap > look || gap >= nearestGap) {
      continue;
    }
    const slower = speed - forwardSpeed(other) >= PASS_CLOSING;
    if (Math.abs(other.lateral - aimLateral(track, cpu, other.s)) < PASS_WIDTH && (slower || gap < TOO_CLOSE)) {
      nearest = other;
      nearestGap = gap;
    }
  }
  return nearest;
}

// The shift that passes `blocker` on whichever side of it has more road.
function passingShift(track, cpu, blocker) {
  const limit = track.stations[blocker.trackIndex].halfWidth - EDGE_KEEP;
  const side = limit - blocker.lateral > limit + blocker.lateral ? 1 : -1;
  const lateral = Math.min(Math.max(blocker.lateral + side * PASS_CLEAR, -limit), limit);
  return lateral - lineLateralAt(track, blocker.s) - cpu.offset;
}
