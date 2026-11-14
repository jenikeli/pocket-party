// The kit's traffic cone (M7d4c5), after the reference game's: orange with white bands that stand a little proud of the
// cone, on a square foot with bevelled corners and a flange. About 0.75 tall, the foot 0.52 across. One shape
// coloured per vertex, so a row of dozens draws as one instanced mesh. Used by kit/props.js.

import { at, coloured, mergeShapes, roundedBox } from '../shape-utils.js';
import { lathe, paintBy } from './circuit-shapes.js';

const FOOT_HEIGHT = 0.08;
const TOP = 0.75;
const BANDS = [[0.27, 0.4], [0.5, 0.58]];
const BAND_LIFT = 0.014;

export function buildCone(kit) {
  return [{ geometry: kit.keep(coneShape()), material: kit.materials.plastic }];
}

// How wide the cone is at `height`: 0.23 at its foot, narrowing to a rounded tip.
function radiusAt(height) {
  return 0.2 * (1 - (height - FOOT_HEIGHT) / (TOP - FOOT_HEIGHT)) + 0.03;
}

function isInBand(height) {
  return BANDS.some(([from, to]) => height >= from && height <= to);
}

// The cone's outline, bottom to top; a band's edges are short slopes, so it steps out and back in.
function bodyProfile() {
  const points = [[0.22, FOOT_HEIGHT - 0.01], [0.21, FOOT_HEIGHT + 0.025]];
  for (const [from, to] of BANDS) {
    points.push([radiusAt(from - 0.03), from - 0.03], [radiusAt(from) + BAND_LIFT, from], [radiusAt(to) + BAND_LIFT, to], [radiusAt(to + 0.03), to + 0.03]);
  }
  points.push([0.045, TOP - 0.04], [0.025, TOP - 0.005], [0, TOP]);
  return points;
}

function coneShape() {
  const foot = coloured(at(roundedBox(0.52, FOOT_HEIGHT, 0.52, 0.03, { chamfered: true }), 0, FOOT_HEIGHT / 2, 0), 0x1d1d1f);
  const body = paintBy(lathe(bodyProfile(), 12), (x, y) => (isInBand(y) ? 0xf6f4ee : 0xff6a14));
  return mergeShapes([foot, body]);
}
