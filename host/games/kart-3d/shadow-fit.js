// Where the sun's shadow map is centred when each view gets its own (M7d4b): a square round the ground just
// ahead of the view's camera, instead of one map stretched over the whole course. The map then spends its pixels
// where the player looks (sharper shadows) and the shadow pass skips casters far away. Plain maths, unit tested
// in Node. Used by host/games/kart-3d/sun.js.

import { addScaled, cross, dot, flatten, length, normalize } from './vector.js';

// The square's middle lies this far ahead of the camera, so it reaches a little behind the kart and well ahead.
export const VIEW_SHADOW_AHEAD = 45;

// The ground point the view's shadow square is centred on: `ahead` units in front of the camera at `position`,
// along `forward` made level (a camera looking straight down keeps its own spot).
export function viewShadowCentre(position, forward, ahead = VIEW_SHADOW_AHEAD) {
  const level = flatten(forward, { x: 0, y: 1, z: 0 });
  return length(level) < 1e-6 ? position : addScaled(position, normalize(level), ahead);
}

// `point` moved by less than a texel so that, seen from the sun (looking along -sunDirection, with world up as
// the shadow camera's up, as Three.js sets it), it falls on a whole texel of the map. Without this the shadow
// map's texels slide over the ground as the camera moves and every shadow's edge crawls.
export function snapToTexels(point, sunDirection, texelSize) {
  const back = normalize(sunDirection);
  const right = normalize(cross({ x: 0, y: 1, z: 0 }, back));
  const up = cross(back, right);
  const across = dot(point, right);
  const along = dot(point, up);
  const snapped = addScaled(point, right, Math.round(across / texelSize) * texelSize - across);
  return addScaled(snapped, up, Math.round(along / texelSize) * texelSize - along);
}
