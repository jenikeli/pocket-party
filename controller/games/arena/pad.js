// Spirefall's deploy pad on the phone: a canvas showing the whole arena turned so the player's own base is at the
// bottom (Dusk's pad is turned 180 degrees), with their half tinted while a card is held. Also converts a touch to a
// fraction of the pad, which the host turns into arena coordinates (host/games/arena/placement.js). Used by
// match-screen.js.

import { ARENA, BRIDGES, ownHalf, towerLayout } from '/shared/arena-map.js';

const COLORS = { meadow: ['#3f7f4a', '#4a8d55'], river: '#3ba3d9', plank: '#9b6b3e', tower: '#6c5b7b', team: ['#ffc53d', '#8e6bff'] };

// `team` is 0 (Dawn) or 1 (Dusk). Returns { draw(highlight), fractionAt(clientX, clientY) }.
export function createPad(canvas, team) {
  const context = canvas.getContext('2d');

  function draw(highlight) {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.save();
    if (team === 1) {
      context.translate(width, height);
      context.scale(-1, -1);
    }
    const unit = width / ARENA.width;
    for (let row = 0; row < ARENA.height; row += 1) {
      context.fillStyle = COLORS.meadow[row % 2];
      context.fillRect(0, row * unit, width, unit + 1);
    }
    context.fillStyle = COLORS.river;
    context.fillRect(0, ARENA.riverTop * unit, width, (ARENA.riverBottom - ARENA.riverTop) * unit);
    context.fillStyle = COLORS.plank;
    BRIDGES.forEach((bridge) => context.fillRect(bridge.x0 * unit, (ARENA.riverTop - 0.3) * unit, (bridge.x1 - bridge.x0) * unit, (ARENA.riverBottom - ARENA.riverTop + 0.6) * unit));
    for (const owner of [0, 1]) {
      context.fillStyle = COLORS.tower;
      context.strokeStyle = COLORS.team[owner];
      context.lineWidth = 2;
      for (const tower of towerLayout(owner)) {
        context.fillRect((tower.x - tower.w / 2) * unit, (tower.y - tower.h / 2) * unit, tower.w * unit, tower.h * unit);
        context.strokeRect((tower.x - tower.w / 2) * unit, (tower.y - tower.h / 2) * unit, tower.w * unit, tower.h * unit);
      }
    }
    if (highlight) {
      const half = ownHalf(team);
      context.fillStyle = `${COLORS.team[team]}33`;
      context.fillRect(0, half.y0 * unit, width, (half.y1 - half.y0) * unit);
    }
    context.restore();
  }

  // The touch as fractions of the pad from its top-left, or null when it is outside the pad.
  function fractionAt(clientX, clientY) {
    const box = canvas.getBoundingClientRect();
    const x = (clientX - box.left) / box.width;
    const y = (clientY - box.top) / box.height;
    return x < 0 || x > 1 || y < 0 || y > 1 ? null : { x, y };
  }

  return { draw, fractionAt };
}
