// Where the arena sits on the host's 1920 x 1080 canvas: 33 px tiles, 594 x 1056 px, centred, with a team panel on
// each side. Converts arena tiles to canvas pixels. Used by the drawing, the sprites and the effects.

export const TILE = 33;
export const ORIGIN_X = 663;
export const ORIGIN_Y = 12;

export function toScreen(x, y) {
  return { x: ORIGIN_X + x * TILE, y: ORIGIN_Y + y * TILE };
}
