// Paints the arena's ground onto a 2D canvas, once: textured mown meadow, worn lane paths, the river and its banks,
// and the two wooden bridges. Plain canvas calls with a seeded random so it looks the same every match. Used by
// arena-draw.js.

import { ARENA, BRIDGES } from '../../../shared/arena-map.js';
import { COLORS } from './palette.js';
import { TILE, ORIGIN_X, ORIGIN_Y } from './arena-view.js';

export const css = (color) => `#${color.toString(16).padStart(6, '0')}`;
const WIDTH = ARENA.width * TILE;
const HEIGHT = ARENA.height * TILE;
const riverY = ORIGIN_Y + ARENA.riverTop * TILE;
const riverHeight = (ARENA.riverBottom - ARENA.riverTop) * TILE;

export function paintMeadow(context, random) {
  for (let row = 0; row < ARENA.height; row += 1) {
    context.fillStyle = css(row % 2 === 0 ? COLORS.meadowBase : COLORS.meadowLight);
    context.fillRect(ORIGIN_X, ORIGIN_Y + row * TILE, WIDTH, TILE);
  }
  // Grass blades in the light and shade tones, and a few flowers.
  context.lineWidth = 1.5;
  context.lineCap = 'round';
  for (let blade = 0; blade < 2600; blade += 1) {
    const x = ORIGIN_X + random() * WIDTH;
    const y = ORIGIN_Y + random() * HEIGHT;
    context.strokeStyle = random() < 0.5 ? css(COLORS.meadowShade) : css(COLORS.meadowLight);
    context.globalAlpha = 0.45;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 4, y - 3 - random() * 4);
    context.stroke();
  }
  context.globalAlpha = 1;
  for (let flower = 0; flower < 70; flower += 1) {
    context.fillStyle = ['#f6ecd2', '#ffd27a', '#f2a8d8'][flower % 3];
    context.beginPath();
    context.arc(ORIGIN_X + random() * WIDTH, ORIGIN_Y + random() * HEIGHT, 1.8, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = css(COLORS.dusk);
  context.globalAlpha = 0.1;
  context.fillRect(ORIGIN_X, ORIGIN_Y, WIDTH, ARENA.riverTop * TILE);
  context.fillStyle = css(COLORS.dawn);
  context.fillRect(ORIGIN_X, ORIGIN_Y + ARENA.riverBottom * TILE, WIDTH, (ARENA.height - ARENA.riverBottom) * TILE);
  context.globalAlpha = 1;
}

// Worn paths: a pale strip down each lane with ragged edges, scuffed with pebbles.
export function paintLanes(context, random) {
  for (const bridge of BRIDGES) {
    const left = ORIGIN_X + bridge.x0 * TILE;
    const width = (bridge.x1 - bridge.x0) * TILE;
    context.fillStyle = css(COLORS.path);
    context.globalAlpha = 0.38;
    context.beginPath();
    for (let y = ORIGIN_Y + 3 * TILE; y <= ORIGIN_Y + 29 * TILE; y += 12) {
      context.rect(left - 4 + random() * 6, y, width + 2 + random() * 8, 13);
    }
    context.fill();
    context.globalAlpha = 0.5;
    for (let pebble = 0; pebble < 90; pebble += 1) {
      context.fillStyle = pebble % 2 ? '#b89f6c' : '#efe0b8';
      context.beginPath();
      context.ellipse(left + random() * width, ORIGIN_Y + (3 + random() * 26) * TILE, 2.5, 1.6, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }
}

export function paintRiver(context, random) {
  const top = context.createLinearGradient(0, riverY, 0, riverY + riverHeight);
  top.addColorStop(0, '#2f8fc4');
  top.addColorStop(0.5, css(COLORS.river));
  top.addColorStop(1, '#2f8fc4');
  context.fillStyle = top;
  context.fillRect(ORIGIN_X, riverY, WIDTH, riverHeight);
  context.strokeStyle = '#8fd4f2';
  context.lineWidth = 1.5;
  for (let wave = 0; wave < 40; wave += 1) {
    const x = ORIGIN_X + random() * (WIDTH - 40);
    const y = riverY + 8 + random() * (riverHeight - 16);
    context.globalAlpha = 0.5;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(x + 10, y - 3, x + 20, y);
    context.quadraticCurveTo(x + 30, y + 3, x + 40, y);
    context.stroke();
  }
  context.globalAlpha = 1;
  // Banks: a dark lip of mud with stones where the grass meets the water.
  for (const y of [riverY - 3, riverY + riverHeight - 3]) {
    context.fillStyle = '#5a4a38';
    context.fillRect(ORIGIN_X, y, WIDTH, 6);
    for (let stone = 0; stone < 26; stone += 1) {
      context.fillStyle = stone % 2 ? '#8a7a9a' : '#6c5b7b';
      context.beginPath();
      context.ellipse(ORIGIN_X + random() * WIDTH, y + 3, 4 + random() * 3, 2.5, 0, 0, Math.PI * 2);
      context.fill();
    }
  }
}

export function paintBridges(context) {
  for (const bridge of BRIDGES) {
    const left = ORIGIN_X + bridge.x0 * TILE;
    const width = (bridge.x1 - bridge.x0) * TILE;
    const top = riverY - 10;
    const height = riverHeight + 20;
    const planks = 8;
    for (let plank = 0; plank < planks; plank += 1) {
      const y = top + (height / planks) * plank;
      context.fillStyle = plank % 2 ? css(COLORS.plank) : '#a9784a';
      context.fillRect(left, y, width, height / planks);
      context.fillStyle = '#c99a68';
      context.fillRect(left, y, width, 2);
      context.fillStyle = css(COLORS.plankDark);
      context.fillRect(left, y + height / planks - 2, width, 2);
      context.fillRect(left + 4, y + 5, 2, 2);
      context.fillRect(left + width - 6, y + 5, 2, 2);
    }
    // Rails: a thick rope-and-timber line down each side with posts.
    for (const x of [left - 2, left + width - 2]) {
      context.fillStyle = css(COLORS.plankDark);
      context.fillRect(x, top - 4, 5, height + 8);
      context.fillStyle = '#c99a68';
      context.fillRect(x, top - 4, 2, height + 8);
      for (let post = 0; post <= 3; post += 1) {
        context.fillRect(x - 2, top - 4 + (post * (height + 8)) / 3, 9, 6);
      }
    }
  }
}
