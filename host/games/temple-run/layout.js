// Where each player's own screen sits in split screen, as fractions of the whole screen: one view fills it, two
// sit side by side, three put the third across the bottom, four make a grid. No DOM, so Node unit tests run it.
// Used by split-views.js.

export const MAX_VIEWS = 4;

// Returns [{ x, y, w, h }] for `count` views (1 to MAX_VIEWS), in player order, y down from the top.
export function layoutViews(count) {
  const views = Math.min(MAX_VIEWS, Math.max(1, count));
  if (views === 1) {
    return [{ x: 0, y: 0, w: 1, h: 1 }];
  }
  if (views === 2) {
    return [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }];
  }
  const top = [{ x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }];
  if (views === 3) {
    return [...top, { x: 0, y: 0.5, w: 1, h: 0.5 }];
  }
  return [...top, { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }];
}
