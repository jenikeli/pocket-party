// The kit's warp pipe (M7d4c5), after the reference circuit course's: glossy green with a fat, rounded lip round its top, a
// flared foot, a shadow under the lip, a pale highlight down its front-left side and a dark inside that goes
// down out of sight. About 2.73 tall; the lip is 2.24 across. Used by kit/props.js.

import { mergeShapes } from '../shape-utils.js';
import { angleAround, blend, lathe, paintBy } from './circuit-shapes.js';

const COLUMNS = 40;
const BODY_RADIUS = 0.9;
const LIP_RADIUS = 1.12;
const LIP_BEVEL = 0.22;
const LIP_BOTTOM = 2.13;
const TOP = 2.73;
const GREEN = 0x1fae2f;
const HIGHLIGHT_ANGLE = -0.55;
const HIGHLIGHT_WIDTH = 0.22;

export function buildWarpPipe(kit) {
  return [{ geometry: kit.keep(warpPipeShape()), material: kit.materials.plastic }];
}

// Four points round a quarter circle of `radius` centred at (centreRadius, centreHeight), from `from` to `to`
// radians.
function arc(centreRadius, centreHeight, radius, from, to) {
  return [0, 1, 2, 3].map((step) => {
    const angle = from + ((to - from) * step) / 3;
    return [centreRadius + Math.cos(angle) * radius, centreHeight + Math.sin(angle) * radius];
  });
}

// The outside, bottom to top: the flared foot, the body, then the lip with both its corners rounded.
function outsideProfile() {
  return [
    [1.0, 0],
    [1.0, 0.1],
    [BODY_RADIUS + 0.04, 0.2],
    [BODY_RADIUS, 0.3],
    [BODY_RADIUS, 1.9],
    [BODY_RADIUS, LIP_BOTTOM],
    ...arc(LIP_RADIUS - LIP_BEVEL, LIP_BOTTOM + LIP_BEVEL, LIP_BEVEL, -Math.PI / 2, 0),
    ...arc(LIP_RADIUS - LIP_BEVEL, TOP - LIP_BEVEL, LIP_BEVEL, 0, Math.PI / 2),
    [0.8, TOP],
    [0.76, TOP - 0.03],
  ];
}

// Green, lighter in a soft stripe down one side (the highlight a window or lamp leaves on glossy plastic),
// darker under the lip and low down where it meets the ground.
function outsideColor(x, y, z) {
  const away = Math.abs(angleAround(x, z) - HIGHLIGHT_ANGLE);
  const stripe = y > 0.3 && y < TOP - 0.15 ? Math.max(1 - away / HIGHLIGHT_WIDTH, 0) : 0;
  const base = blend(GREEN, 0x7be88a, stripe * 0.75);
  const underLip = y > 1.9 && y < LIP_BOTTOM + 0.02 ? 0.62 + 0.38 * ((LIP_BOTTOM - y) / 0.23) : 1;
  const lowDown = 0.7 + 0.3 * Math.min(y / 0.35, 1);
  return blend(0x000000, base, underLip * lowDown);
}

// The inside, from the lip down to a floor: dark, darker the deeper it goes. Its points run from the lip down, so
// its faces look inward, across the pipe.
function insideShape() {
  const points = [[0.76, TOP - 0.03], [0.72, 2.45], [0.72, 2.0], [0, 2.0]];
  return paintBy(lathe(points, COLUMNS), (x, y) => blend(0x020a03, 0x103a16, (y - 2.0) / 0.7));
}

function warpPipeShape() {
  return mergeShapes([paintBy(lathe(outsideProfile(), COLUMNS), outsideColor), insideShape()]);
}
