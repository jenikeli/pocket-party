// The kit's sponsor boards (M7d2): MK8DX's in-game brands (Bowser Oil, Lemmy's Tire Service, MKTV and the rest,
// from the look study in docs/mk8dx-reference.md), each a bold logo with a thick outline, drawn side by side on
// one canvas (an atlas), so every board on the course, whatever it shows, shares one texture and one material.
// A board picks its brand by the texture coordinates of its cell (sponsorUv). Used by the padded walls, the
// stands beside the road, the grandstand and the MKTV van.

import * as THREE from 'three';
import { createCanvas, canvasTexture } from '../canvas-texture.js';

// Each cell is 3.2 times as wide as tall, the shape of a board on a padded wall.
const CELL_WIDTH = 256;
const CELL_HEIGHT = 80;
const COLUMNS = 4;
// A board's texture coordinates stay this many pixels (of the atlas drawn at scale 1) inside its cell
// (sponsorCell).
const CELL_INSET = 3;
// Each design: background, outline colour, and up to two lines of text (big, then small) with their colours;
// `emblem` names a small picture drawn at the left (EMBLEMS).
const DESIGNS = [
  { background: '#121212', edge: '#ffd21e', big: ['BOWSER', '#ffd21e'], small: ['OIL', '#ff3b1f'], emblem: 'drop' },
  { background: '#1d4fc4', edge: '#ffffff', big: ["LEMMY'S", '#ffe23a'], small: ['TIRE SERVICE', '#ffffff'], emblem: 'tyre' },
  { background: '#8c1414', edge: '#ffcf3a', big: ['GOLDEN', '#ffcf3a'], small: ['WHEEL', '#ffffff'], emblem: 'wheel' },
  { background: '#0e2f8a', edge: '#ffffff', big: ['MKTV', '#ffffff'], small: null, emblem: 'screen' },
  { background: '#ff5a12', edge: '#2a0a00', big: ['BURNING', '#fff3c0'], small: ['DK', '#ffe23a'], emblem: 'flame' },
  { background: '#f4f4f0', edge: '#1a1a1a', big: ['BULLET BILL', '#1a1a1a'], small: ['SPEED TRIAL', '#d8302a'], emblem: 'bullet' },
  { background: '#d8302a', edge: '#ffffff', big: ['MARIO', '#ffffff'], small: ['MOTORS', '#ffe23a'], emblem: 'letter' },
  { background: '#21a3e0', edge: '#ffffff', big: ['SUPER MARINE', '#ffffff'], small: ['WORLD', '#ffe23a'], emblem: 'waves' },
  { background: '#bfe9ff', edge: '#1d4fc4', big: ["TOAD'S", '#d8302a'], small: ['POLAR EXPEDITION', '#1d4fc4'], emblem: 'spots' },
  { background: '#3fae3a', edge: '#ffffff', big: ['YOSHI', '#ffffff'], small: ['COOKIES', '#ffe23a'], emblem: 'egg' },
  { background: '#ff8fc8', edge: '#ffffff', big: ['PEACH', '#ffffff'], small: ['CASTLE TOURS', '#8c1458'], emblem: 'crown' },
  { background: '#ffd21e', edge: '#1a1a1a', big: ['KOOPA', '#1a8a2a'], small: ['KAR WASH', '#1a1a1a'], emblem: 'shell' },
];
export const SPONSOR_COUNT = DESIGNS.length;
const ROWS = Math.ceil(SPONSOR_COUNT / COLUMNS);
const FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';

// The one material every board on a course is drawn with (kit/kit.js makes it once for all the pieces);
// `keep(thing)` registers what must be disposed.
export function createSponsorMaterial(keep) {
  return keep(new THREE.MeshStandardMaterial({ map: keep(createSponsorTexture()), roughness: 0.5 }));
}

// The atlas as a texture. Not repeating: each board shows exactly its cell.
function createSponsorTexture() {
  return canvasTexture(drawSponsorAtlas(1).canvas);
}

// The atlas drawn `scale` times as many pixels each way (M7d4b2: the padded wall's framed boards draw over a
// sharper copy). Returns { canvas, context, cells }: cells is each brand's { left, top, width, height } in the
// canvas's pixels, the part its board shows (inside the cell by CELL_INSET), in brand order.
export function drawSponsorAtlas(scale) {
  const { canvas, context } = createCanvas(CELL_WIDTH * COLUMNS * scale, CELL_HEIGHT * ROWS * scale);
  context.scale(scale, scale);
  const cells = DESIGNS.map((design, index) => {
    const [left, top] = [(index % COLUMNS) * CELL_WIDTH, Math.floor(index / COLUMNS) * CELL_HEIGHT];
    context.save();
    context.translate(left, top);
    drawBoard(context, design);
    context.restore();
    const inset = CELL_INSET;
    return { left: (left + inset) * scale, top: (top + inset) * scale, width: (CELL_WIDTH - 2 * inset) * scale, height: (CELL_HEIGHT - 2 * inset) * scale };
  });
  context.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas, context, cells };
}

// Brand `index`'s cell in texture coordinates: { left, right, bottom, top }, pulled in a little from its edges
// so a far board's blurred texture does not pick up its neighbour's colours. Any index wraps round the brands.
function sponsorCell(index) {
  const wrapped = ((index % SPONSOR_COUNT) + SPONSOR_COUNT) % SPONSOR_COUNT;
  const column = wrapped % COLUMNS;
  const row = Math.floor(wrapped / COLUMNS);
  const insetU = CELL_INSET / (CELL_WIDTH * COLUMNS);
  const insetV = CELL_INSET / (CELL_HEIGHT * ROWS);
  // The canvas's top row is the texture's top (v 1).
  return {
    left: column / COLUMNS + insetU,
    right: (column + 1) / COLUMNS - insetU,
    top: 1 - row / ROWS - insetV,
    bottom: 1 - (row + 1) / ROWS + insetV,
  };
}

// Texture coordinates for a point `across` (0 at the board's left, 1 at its right) and `up` (0 bottom, 1 top)
// of brand `index`'s board.
export function sponsorUv(index, across, up) {
  const cell = sponsorCell(index);
  return [cell.left + (cell.right - cell.left) * across, cell.bottom + (cell.top - cell.bottom) * up];
}

function drawBoard(context, design) {
  context.fillStyle = design.edge;
  context.fillRect(0, 0, CELL_WIDTH, CELL_HEIGHT);
  context.fillStyle = design.background;
  context.fillRect(5, 5, CELL_WIDTH - 10, CELL_HEIGHT - 10);
  EMBLEMS[design.emblem](context, 38, CELL_HEIGHT / 2, design);
  const textLeft = 74;
  const textWidth = CELL_WIDTH - textLeft - 12;
  const bigY = design.small ? 36 : CELL_HEIGHT / 2;
  drawText(context, design.big[0], design.big[1], design.edge, textLeft, bigY, design.small ? 32 : 40, textWidth);
  if (design.small) {
    drawText(context, design.small[0], design.small[1], design.edge, textLeft, 62, 17, textWidth);
  }
}

// Bold italic text, outlined, squeezed to fit `maxWidth` if it is too long.
function drawText(context, text, fill, outline, left, middleY, size, maxWidth) {
  context.font = `italic 900 ${size}px ${FONT}`;
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = size / 5;
  context.strokeStyle = outline === fill ? '#000000' : outline;
  context.strokeText(text, left, middleY, maxWidth);
  context.fillStyle = fill;
  context.fillText(text, left, middleY, maxWidth);
}

// The small pictures at each board's left, about 50 pixels across, centred on (x, y).
const EMBLEMS = {
  drop(context, x, y) {
    shape(context, '#ff3b1f', () => {
      context.moveTo(x, y - 24);
      context.quadraticCurveTo(x + 20, y + 2, x + 14, y + 14);
      context.arc(x, y + 8, 15, 0.4, Math.PI - 0.4);
      context.quadraticCurveTo(x - 20, y + 2, x, y - 24);
    });
  },
  tyre(context, x, y) {
    ring(context, x, y, 24, 12, '#151515');
    ring(context, x, y, 11, 5, '#c0c4cc');
  },
  wheel(context, x, y) {
    ring(context, x, y, 24, 6, '#ffcf3a');
    for (let spoke = 0; spoke < 6; spoke += 1) {
      context.save();
      context.translate(x, y);
      context.rotate((spoke * Math.PI) / 3);
      context.fillStyle = '#ffcf3a';
      context.fillRect(-2, -20, 4, 20);
      context.restore();
    }
  },
  screen(context, x, y) {
    shape(context, '#ffffff', () => context.roundRect(x - 26, y - 20, 52, 36, 8));
    shape(context, '#3fb3ff', () => context.roundRect(x - 20, y - 14, 40, 24, 4));
  },
  flame(context, x, y) {
    shape(context, '#ffe23a', () => {
      context.moveTo(x, y - 28);
      context.quadraticCurveTo(x + 26, y, x, y + 24);
      context.quadraticCurveTo(x - 26, y, x - 6, y - 10);
      context.quadraticCurveTo(x - 2, y, x, y - 28);
    });
  },
  bullet(context, x, y) {
    shape(context, '#1a1a1a', () => {
      context.moveTo(x - 24, y - 16);
      context.lineTo(x + 6, y - 16);
      context.arc(x + 6, y, 16, -Math.PI / 2, Math.PI / 2);
      context.lineTo(x - 24, y + 16);
    });
    shape(context, '#ffffff', () => context.arc(x + 8, y - 4, 5, 0, 2 * Math.PI));
  },
  letter(context, x, y) {
    shape(context, '#ffffff', () => context.arc(x, y, 25, 0, 2 * Math.PI));
    drawText(context, 'M', '#d8302a', '#ffffff', x - 17, y + 2, 34, 40);
  },
  waves(context, x, y) {
    context.strokeStyle = '#ffffff';
    context.lineWidth = 6;
    for (const offset of [-12, 4]) {
      context.beginPath();
      context.moveTo(x - 26, y + offset);
      context.bezierCurveTo(x - 12, y + offset - 14, x, y + offset + 14, x + 26, y + offset);
      context.stroke();
    }
  },
  spots(context, x, y) {
    shape(context, '#ffffff', () => context.arc(x, y, 25, 0, 2 * Math.PI));
    for (const [dx, dy, radius] of [[0, -8, 9], [-15, 8, 7], [15, 8, 7]]) {
      shape(context, '#d8302a', () => context.arc(x + dx, y + dy, radius, 0, 2 * Math.PI));
    }
  },
  egg(context, x, y) {
    shape(context, '#ffffff', () => context.ellipse(x, y, 19, 25, 0, 0, 2 * Math.PI));
    for (const [dx, dy] of [[-7, -8], [8, 2], [-4, 12]]) {
      shape(context, '#3fae3a', () => context.arc(x + dx, y + dy, 5, 0, 2 * Math.PI));
    }
  },
  crown(context, x, y) {
    shape(context, '#ffd21e', () => {
      context.moveTo(x - 24, y + 16);
      [[-24, -12], [-12, 2], [0, -18], [12, 2], [24, -12], [24, 16]].forEach(([dx, dy]) => context.lineTo(x + dx, y + dy));
    });
  },
  shell(context, x, y) {
    shape(context, '#ffffff', () => context.ellipse(x, y + 4, 26, 18, 0, 0, 2 * Math.PI));
    shape(context, '#1a8a2a', () => context.ellipse(x, y, 22, 18, 0, Math.PI, 2 * Math.PI));
  },
};

function shape(context, fill, path) {
  context.beginPath();
  path();
  context.closePath();
  context.fillStyle = fill;
  context.fill();
}

function ring(context, x, y, radius, width, color) {
  context.beginPath();
  context.arc(x, y, radius - width / 2, 0, 2 * Math.PI);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
}
