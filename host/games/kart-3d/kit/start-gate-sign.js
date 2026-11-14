// The start gate's pictures (M7d2, moved out of kit/start-gate.js in M7d4): the sign reading KARTWHEEL in the
// course's colours, and since M7d4 its relief (a normal map, so the letters and their outline stand out from
// the board and catch the sun, as the raised letters on the reference game's gates do), and the mushroom badge on top. Used
// by kit/start-gate.js.

import { createCanvas, canvasTexture } from '../canvas-texture.js';
import { createPixelImage } from './pixel-image.js';

const FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const WIDTH = 1024;
const HEIGHT = 256;
// How high each part of the sign stands, 0 to 255: the board, the stripe and checks, the letters' outline and
// the letters themselves.
const RAISE = { board: 40, stripe: 90, outline: 150, letters: 240 };
// The relief's edges are softened over this many pixels either way, so the letters look bevelled, not cut.
const SOFTEN = 3;

// Returns { map, relief }: KARTWHEEL in white with an outline on the theme's background, a stripe along the
// foot and checks at both ends; and the normal map that raises them.
export function drawSign(theme) {
  const colours = createCanvas(WIDTH, HEIGHT);
  const heights = createCanvas(WIDTH, HEIGHT);
  paintSign(colours.context, theme);
  const grey = (value) => `rgb(${value}, ${value}, ${value})`;
  paintSign(heights.context, {
    background: grey(RAISE.board),
    stripe: grey(RAISE.stripe),
    outline: grey(RAISE.outline),
    letters: grey(RAISE.letters),
    checks: [grey(RAISE.stripe), grey(RAISE.stripe - 30)],
  });
  return { map: canvasTexture(colours.canvas), relief: reliefFrom(heights.context) };
}

// The sign drawn in `colours`: { background, stripe, outline, letters, checks: [light, dark] } (letters and
// checks white and black unless given).
function paintSign(context, { background, stripe, outline, letters = '#ffffff', checks = ['#ffffff', '#1a1a1e'] }) {
  context.fillStyle = background;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = stripe;
  context.fillRect(0, 206, WIDTH, 50);
  for (const left of [0, WIDTH - 64]) {
    for (let row = 0; row < 6; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        context.fillStyle = checks[(row + column) % 2];
        context.fillRect(left + column * 32, row * 32 + 14, 32, 32);
      }
    }
  }
  context.font = `italic 900 150px ${FONT}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = 22;
  context.strokeStyle = outline;
  context.strokeText('KARTWHEEL', 512, 108, 840);
  context.fillStyle = letters;
  context.fillText('KARTWHEEL', 512, 108, 840);
}

// The normal map of the heights drawn on `context` (grey levels), their edges softened by a box blur run
// across and then down.
function reliefFrom(context) {
  const data = context.getImageData(0, 0, WIDTH, HEIGHT).data;
  let values = Float32Array.from({ length: WIDTH * HEIGHT }, (_, index) => data[index * 4]);
  values = blur(values, 1, 0);
  values = blur(values, 0, 1);
  const image = createPixelImage(WIDTH, HEIGHT);
  image.fill((x, y) => {
    const value = values[y * WIDTH + x];
    return [value, value, value];
  });
  return image.toReliefTexture({ depth: 10, repeat: false });
}

// Each value the average of those within SOFTEN pixels of it along (stepX, stepY), stopping at the edges.
function blur(values, stepX, stepY) {
  const result = new Float32Array(values.length);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      let sum = 0;
      let count = 0;
      for (let offset = -SOFTEN; offset <= SOFTEN; offset += 1) {
        const [sampleX, sampleY] = [x + offset * stepX, y + offset * stepY];
        if (sampleX >= 0 && sampleX < WIDTH && sampleY >= 0 && sampleY < HEIGHT) {
          sum += values[sampleY * WIDTH + sampleX];
          count += 1;
        }
      }
      result[y * WIDTH + x] = sum / count;
    }
  }
  return result;
}

// A red-capped mushroom with white spots and a smiling face, on white: the badge on top of the gate.
export function drawBadge() {
  const { canvas, context } = createCanvas(256, 256);
  const fill = (color, path) => {
    context.beginPath();
    path();
    context.fillStyle = color;
    context.fill();
  };
  fill('#ffffff', () => context.rect(0, 0, 256, 256));
  fill('#f6dcb4', () => context.ellipse(128, 168, 52, 48, 0, 0, 2 * Math.PI));
  fill('#e8302a', () => context.ellipse(128, 118, 96, 72, 0, Math.PI, 2 * Math.PI));
  fill('#e8302a', () => context.rect(32, 117, 192, 20));
  for (const [x, y, radius] of [[128, 76, 24], [70, 112, 18], [186, 112, 18]]) {
    fill('#ffffff', () => context.arc(x, y, radius, 0, 2 * Math.PI));
  }
  for (const x of [110, 146]) {
    fill('#1a1a1e', () => context.ellipse(x, 166, 7, 14, 0, 0, 2 * Math.PI));
  }
  return canvasTexture(canvas);
}
