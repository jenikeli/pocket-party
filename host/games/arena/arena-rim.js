// Paints what surrounds the arena: the cliff rim, the lantern posts along both long edges, and a small crowd of
// silhouettes beyond the rims (Dawn's side warm, Dusk's side violet). Canvas calls, once. Used by arena-draw.js,
// which also adds the glowing lamps from the positions this returns.

import { ARENA } from '../../../shared/arena-map.js';
import { COLORS } from './palette.js';
import { TILE, ORIGIN_X, ORIGIN_Y } from './arena-view.js';
import { css } from './arena-ground.js';

const WIDTH = ARENA.width * TILE;
const HEIGHT = ARENA.height * TILE;

export function paintBackdrop(context, canvas) {
  context.fillStyle = css(COLORS.night);
  context.fillRect(0, 0, canvas.width, canvas.height);
  const glow = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 300, canvas.width / 2, canvas.height / 2, 900);
  glow.addColorStop(0, 'rgba(60,45,90,0.35)');
  glow.addColorStop(1, 'rgba(16,19,28,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

// Returns the lamp positions so the caller can make them glow.
export function paintRim(context) {
  context.fillStyle = css(COLORS.cliff);
  context.fillRect(ORIGIN_X - 10, ORIGIN_Y - 8, WIDTH + 20, HEIGHT + 16);
  context.fillStyle = '#8a7a9a';
  context.fillRect(ORIGIN_X - 10, ORIGIN_Y - 8, 3, HEIGHT + 16);
  context.fillRect(ORIGIN_X - 10, ORIGIN_Y - 8, WIDTH + 20, 3);
  context.fillStyle = '#4a3d58';
  context.fillRect(ORIGIN_X + WIDTH + 7, ORIGIN_Y - 8, 3, HEIGHT + 16);
  context.fillRect(ORIGIN_X - 10, ORIGIN_Y + HEIGHT + 5, WIDTH + 20, 3);
  const lamps = [];
  for (let row = 2; row < ARENA.height; row += 4) {
    for (const x of [ORIGIN_X - 17, ORIGIN_X + WIDTH + 17]) {
      const y = ORIGIN_Y + row * TILE;
      context.fillStyle = css(COLORS.plankDark);
      context.fillRect(x - 2, y - 2, 4, 18);
      context.fillStyle = css(COLORS.plank);
      context.fillRect(x - 5, y - 8, 10, 8);
      context.fillStyle = css(COLORS.lamp);
      context.fillRect(x - 3, y - 6, 6, 5);
      lamps.push({ x, y: y - 4 });
    }
  }
  return lamps;
}

// Rows of heads and shoulders in the strip beyond each rim, with the odd pennant on a stick.
export function paintCrowd(context, random) {
  for (const side of [-1, 1]) {
    const edge = side < 0 ? ORIGIN_X - 28 : ORIGIN_X + WIDTH + 28;
    for (let y = ORIGIN_Y + 6; y < ORIGIN_Y + HEIGHT - 6; y += 15) {
      const team = y < ORIGIN_Y + HEIGHT / 2 ? COLORS.duskDeep : COLORS.dawnDeep;
      for (let column = 0; column < 3; column += 1) {
        if (random() < 0.25) {
          continue;
        }
        const x = edge + side * (column * 17 + random() * 6);
        context.fillStyle = column === 0 ? '#2a2438' : '#1d1b2e';
        context.beginPath();
        context.ellipse(x, y + 8, 7, 6, 0, Math.PI, 0);
        context.fill();
        context.beginPath();
        context.arc(x, y + 1, 4.5, 0, Math.PI * 2);
        context.fill();
        if (random() < 0.18) {
          context.fillStyle = css(team);
          context.fillRect(x + 3, y - 12, 1.5, 12);
          context.fillRect(x + 4.5, y - 12, 7, 5);
        }
      }
    }
  }
}
