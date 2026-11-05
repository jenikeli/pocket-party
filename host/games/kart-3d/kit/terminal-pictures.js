// The terminal's pictures drawn on canvases (M9): the sign on its roof, PALM BAY AIRPORT beside our emblem (a sun
// rising behind a palm), cut out of a clear background so it stands in letters as Sunshine Airport's does; and the
// departure board seen through the glass, our own airlines and places. Used by kit/terminal.js.

import { createCanvas, canvasTexture } from '../canvas-texture.js';

const FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const NAVY = '#1e3566';
export const SIGN_ASPECT = 4;

// The sign, 1024 by 256 pixels, clear where there is no letter or emblem: white letters with a navy outline.
export function drawSign() {
  const { canvas, context } = createCanvas(1024, 256);
  drawEmblem(context, 128, 128);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.strokeStyle = NAVY;
  context.fillStyle = '#ffffff';
  const words = [['PALM BAY', `italic 900 124px ${FONT}`, 92, 22], ['AIRPORT', `900 70px ${FONT}`, 202, 16]];
  for (const [text, font, y, outline] of words) {
    context.font = font;
    context.letterSpacing = text === 'AIRPORT' ? '18px' : '4px';
    context.lineWidth = outline;
    context.strokeText(text, 630, y, 720);
    context.fillText(text, 630, y, 720);
  }
  return canvasTexture(canvas);
}

// Our emblem centred on (x, y), about 240 pixels across: a yellow sun with rays rising behind a palm, outlined
// in navy as the letters are.
function drawEmblem(context, x, y) {
  const shape = (draw, fill, outline = 14) => {
    context.beginPath();
    draw();
    context.lineJoin = 'round';
    context.lineWidth = outline;
    context.strokeStyle = NAVY;
    context.stroke();
    context.fillStyle = fill;
    context.fill();
  };
  // Twelve rays, then the disc over their feet.
  shape(() => {
    for (let ray = 0; ray < 12; ray += 1) {
      const angle = (ray / 12) * 2 * Math.PI;
      const point = (radius, turn) => [x + Math.cos(angle + turn) * radius, y - 14 + Math.sin(angle + turn) * radius];
      context.moveTo(...point(60, -0.17));
      context.lineTo(...point(112, 0));
      context.lineTo(...point(60, 0.17));
    }
  }, '#ffb21e');
  shape(() => context.arc(x, y - 14, 70, 0, 2 * Math.PI), '#ffd23a');
  // The palm's trunk leans from the bottom right up to its crown left of the middle, its fronds hanging round.
  const crown = [x - 18, y - 28];
  shape(() => {
    context.moveTo(x + 46, y + 118);
    context.quadraticCurveTo(x + 10, y + 40, crown[0] - 6, crown[1]);
    context.lineTo(crown[0] + 10, crown[1] + 2);
    context.quadraticCurveTo(x + 26, y + 40, x + 64, y + 118);
    context.closePath();
  }, '#a8642e', 12);
  for (const [angle, length] of [[-2.7, 92], [-2.1, 80], [-1.2, 78], [-0.5, 90], [0.15, 82], [3.0, 70]]) {
    shape(() => {
      const tip = [crown[0] + Math.cos(angle) * length, crown[1] + Math.sin(angle) * length + length * 0.35];
      const bend = [crown[0] + Math.cos(angle) * length * 0.55, crown[1] + Math.sin(angle) * length * 0.55 - 22];
      context.moveTo(...crown);
      context.quadraticCurveTo(bend[0] - 14, bend[1] - 6, ...tip);
      context.quadraticCurveTo(bend[0] + 14, bend[1] + 18, ...crown);
    }, '#2fa84a', 10);
  }
}

// The departure board: 512 by 256 pixels, amber rows on navy under a coral heading.
const FLIGHTS = [
  ['09:40', 'PA 101', 'CORAL ISLE', 'A1', 'BOARDING'],
  ['09:55', 'CW 220', 'SKIPJACK KEY', 'A2', 'ON TIME'],
  ['10:10', 'SJ 315', 'SUNSET BAY', 'A3', 'ON TIME'],
  ['10:25', 'PA 117', 'SEASIDE SKYWAY', 'A1', 'DELAYED'],
  ['10:40', 'CW 236', 'LAGOON CITY', 'A2', 'ON TIME'],
  ['11:05', 'SJ 342', 'SHELL HARBOUR', 'A3', 'ON TIME'],
];

export function drawDepartureBoard() {
  const { canvas, context } = createCanvas(512, 256);
  context.fillStyle = '#0e1a33';
  context.fillRect(0, 0, 512, 256);
  context.fillStyle = '#f0532d';
  context.fillRect(0, 0, 512, 46);
  context.fillStyle = '#ffffff';
  context.font = `30px ${FONT}`;
  context.textBaseline = 'middle';
  context.fillText('DEPARTURES', 16, 24);
  context.font = 'bold 19px "Courier New", monospace';
  FLIGHTS.forEach((flight, row) => {
    const y = 66 + row * 33;
    context.fillStyle = row % 2 === 0 ? '#16264a' : '#0e1a33';
    context.fillRect(0, y - 16, 512, 32);
    const columns = [10, 82, 168, 386, 424];
    flight.forEach((text, column) => {
      const delayed = column === 4 && text === 'DELAYED';
      context.fillStyle = column === 4 ? (delayed ? '#ff6a4a' : '#7ee07a') : '#ffc531';
      context.fillText(text, columns[column], y, column === 2 ? 210 : 90);
    });
  });
  return canvasTexture(canvas);
}
