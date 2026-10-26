// Where the kit's road markings and panels go on a course, worked out from the track's stations: the edge
// lines, red and white curbs on the inside of corners, a dashed line down the middle of the straights, a
// bracket in front of each grid place, the checks of the start line, the steel plate on each jump's ramp, the
// dash panels and a glowing panel where each anti-gravity section starts. Drawing only: none of it changes how
// karts drive. Plain maths, no Three.js, unit tested in Node. Used by kit/road-paint.js, kit/led-panels.js and
// kit/ramp-plate.js.
//
// Marks laid on the road are rectangles { fromS, toS, fromLateral, toLateral } in road coordinates: from and to
// distance along the centre line (fromS may be below 0 or toS past the lap's length: they wrap), and from and
// to units right of it.

import { turnAhead } from '../track.js';
import { gridSpot, FIELD_SIZE } from '../race.js';
import { DASH_PANEL_LENGTH, DASH_PANEL_WIDTH } from '../kart-boosts.js';

// The edge line runs this far in from each edge of the road, and the curbs fill the edge outside it.
export const EDGE_LINE_INSET = 1;
export const EDGE_LINE_WIDTH = 0.3;
export const CURB_WIDTH = EDGE_LINE_INSET;
// A corner gets curbs where the road turns more than this over the 10 stations around it (a radius under about
// 70 units).
const CURB_DEGREES = 8;
const LOOK_BACK = 5;
const MIN_CURB_STATIONS = 8;
// The middle line: dashes this long, starting this far apart, where the road is this wide and turns less than
// STRAIGHT_DEGREES over 10 stations.
const DASH_LENGTH = 3;
const DASH_SPACING = 7;
const DASH_WIDTH = 0.25;
const DASH_MIN_HALF_WIDTH = 7;
const STRAIGHT_DEGREES = 2;
// No middle line this close to the grid or the start line.
const GRID_CLEARANCE = 4;
// A grid bracket: a bar across in front of the kart's nose (a kart is 2 long), and a leg back from each end.
const BRACKET_HALF_WIDTH = 1.6;
const BRACKET_FRONT = 1.6;
const BRACKET_BAR = 0.25;
const BRACKET_LEG_LENGTH = 1.1;
const BRACKET_LEG_WIDTH = 0.22;
// The start line: two rows of squares across the whole road, centred on the line.
const START_CHECKS_ACROSS = 16;
const START_CHECK_ROWS = 2;
// A ramp is the road climbing at least this steeply (rise over run) up to a gap.
const RAMP_SLOPE = 0.1;
const ANTI_GRAVITY_PANEL_LENGTH = 4;
const ANTI_GRAVITY_PANEL_DELAY = 1;

const degrees = (radians) => (radians * 180) / Math.PI;

// How far the road turns over the 10 stations around station `index`, in degrees: positive right.
function turnAround(track, index) {
  return degrees(turnAhead(track, (index - LOOK_BACK + track.stations.length) % track.stations.length));
}

function isPlainRoad(station) {
  return !station.gap && !station.antiGravity;
}

// The curbed stations: [{ index, side }], side 1 for a curb on the right edge (a right turn's inside), -1 left.
// A run of curb shorter than MIN_CURB_STATIONS (where a turn only brushes the test) is left out.
export function curbSpots(track) {
  const runs = [];
  track.stations.forEach((station, index) => {
    const turn = turnAround(track, index);
    if (!isPlainRoad(station) || Math.abs(turn) <= CURB_DEGREES) {
      return;
    }
    const run = runs.at(-1);
    if (run && run.at(-1).index === index - 1 && run.at(-1).side === Math.sign(turn)) {
      run.push({ index, side: Math.sign(turn) });
    } else {
      runs.push([{ index, side: Math.sign(turn) }]);
    }
  });
  return runs.filter((run) => run.length >= MIN_CURB_STATIONS).flat();
}

// The middle line's dashes, as rectangles, wherever a whole dash fits on a wide, plain straight, clear of the
// grid, the ramps' steel plates and the dash panels.
export function middleDashes(track) {
  const gridBack = gridSpot(track, FIELD_SIZE - 1).s - GRID_CLEARANCE;
  const gridFront = track.startLine + GRID_CLEARANCE;
  const covered = [...rampSpans(track), ...dashPanelRects(track)];
  const dashes = [];
  for (let fromS = 0; fromS + DASH_LENGTH < track.length; fromS += DASH_SPACING) {
    const toS = fromS + DASH_LENGTH;
    const clear = (toS < gridBack || fromS > gridFront) && covered.every((span) => toS < span.fromS || fromS > span.toS);
    if (clear && isStraightBetween(track, fromS, toS)) {
      dashes.push({ fromS, toS, fromLateral: -DASH_WIDTH / 2, toLateral: DASH_WIDTH / 2 });
    }
  }
  return dashes;
}

function isStraightBetween(track, fromS, toS) {
  return track.stations.every((station, index) => {
    if (station.s + station.segmentLength < fromS || station.s > toS) {
      return true;
    }
    return isPlainRoad(station) && station.halfWidth >= DASH_MIN_HALF_WIDTH && Math.abs(turnAround(track, index)) < STRAIGHT_DEGREES;
  });
}

// A bracket in front of every grid place: three rectangles each, the bar and its two legs.
export function gridBrackets(track) {
  const rectangles = [];
  for (let gridIndex = 0; gridIndex < FIELD_SIZE; gridIndex += 1) {
    const { s, lateral } = gridSpot(track, gridIndex);
    const front = s + BRACKET_FRONT;
    const left = lateral - BRACKET_HALF_WIDTH;
    const right = lateral + BRACKET_HALF_WIDTH;
    rectangles.push(
      { fromS: front - BRACKET_BAR, toS: front, fromLateral: left, toLateral: right },
      { fromS: front - BRACKET_LEG_LENGTH, toS: front - BRACKET_BAR, fromLateral: left, toLateral: left + BRACKET_LEG_WIDTH },
      { fromS: front - BRACKET_LEG_LENGTH, toS: front - BRACKET_BAR, fromLateral: right - BRACKET_LEG_WIDTH, toLateral: right },
    );
  }
  return rectangles;
}

// The start line's squares: rectangles with dark true or false, in a checkerboard across the road's width at
// the line.
export function startLineChecks(track) {
  const station = track.stations.find((candidate) => candidate.s + candidate.segmentLength > track.startLine);
  const size = (2 * station.halfWidth) / START_CHECKS_ACROSS;
  const checks = [];
  for (let row = 0; row < START_CHECK_ROWS; row += 1) {
    for (let column = 0; column < START_CHECKS_ACROSS; column += 1) {
      const fromS = track.startLine + (row - START_CHECK_ROWS / 2) * size;
      const fromLateral = -station.halfWidth + column * size;
      checks.push({ fromS, toS: fromS + size, fromLateral, toLateral: fromLateral + size, dark: (row + column) % 2 === 1 });
    }
  }
  return checks;
}

// Each jump's ramp: [{ fromS, toS, halfWidth }] from where the road starts climbing steeply to the lip, the end
// of the road before a gap, with the road's half width at the lip.
export function rampSpans(track) {
  const { stations } = track;
  const spans = [];
  stations.forEach((station, index) => {
    const before = stations[(index - 1 + stations.length) % stations.length];
    if (!station.gap || before.gap) {
      return;
    }
    let first = (index - 1 + stations.length) % stations.length;
    while (segmentSlope(track, (first - 1 + stations.length) % stations.length) > RAMP_SLOPE) {
      first = (first - 1 + stations.length) % stations.length;
    }
    if (segmentSlope(track, first) > RAMP_SLOPE) {
      spans.push({ fromS: stations[first].s, toS: station.s, halfWidth: before.halfWidth });
    }
  });
  return spans;
}

// How steeply station `index`'s segment climbs: rise over run.
function segmentSlope(track, index) {
  const station = track.stations[index];
  const next = track.stations[(index + 1) % track.stations.length];
  const rise = next.point.y - station.point.y;
  return rise / Math.max(Math.sqrt(Math.max(station.segmentLength ** 2 - rise ** 2, 0)), 1e-9);
}

// The dash panels, as rectangles (kart-boosts.js finds karts on them by the same size).
export function dashPanelRects(track) {
  return track.dashPanels.map((panel) => ({
    fromS: panel.s - DASH_PANEL_LENGTH / 2,
    toS: panel.s + DASH_PANEL_LENGTH / 2,
    fromLateral: panel.lateral - DASH_PANEL_WIDTH / 2,
    toLateral: panel.lateral + DASH_PANEL_WIDTH / 2,
  }));
}

// A panel across the whole road a little way into each anti-gravity section, as rectangles.
export function antiGravityPanelRects(track) {
  const { stations } = track;
  return stations
    .filter((station, index) => station.antiGravity && !stations[(index - 1 + stations.length) % stations.length].antiGravity)
    .map((station) => {
      const fromS = station.s + ANTI_GRAVITY_PANEL_DELAY;
      return { fromS, toS: fromS + ANTI_GRAVITY_PANEL_LENGTH, fromLateral: -station.halfWidth, toLateral: station.halfWidth };
    });
}
