// The airliner's three liveries (M9), our own airlines (the same names and colours as the hangars' signs, kit/
// hangar.js's AIRLINES): white with a cheatline in the airline's colours sweeping up to the tail, a grey belly,
// the name over the windows, a big emblem on the nose as on Sunshine Airport's planes, the fin in the airline's
// colour with its emblem. Pictures for the fuselage and the fin, drawn on canvases (kit/airliner-paint.js). Used
// by kit/airliner.js.

import { canvasTexture, createCanvas } from '../canvas-texture.js';
import { createFuselagePainter, roundedRectPath } from './airliner-paint.js';
import { drawEmblem } from './airliner-emblems.js';
import { FIN, FRONT_DOOR_X, FUSELAGE, FUSELAGE_LENGTH, REAR_DOOR_X, SILL_Y, fuselageSection } from './airliner-shapes.js';
import { CORAL, SUN_YELLOW } from './terminal-maps.js';
import { NAVY } from './hangar-maps.js';

const FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';

export const AIRLINER_LIVERIES = Object.freeze({
  'palm-air': { name: 'PALM AIR', main: 0x1f9e6e, accent: SUN_YELLOW, emblem: 'palm' },
  'coral-wings': { name: 'CORAL WINGS', main: CORAL, accent: NAVY, emblem: 'wings' },
  'skipjack-air': { name: 'SKIPJACK AIR', main: NAVY, accent: 0x3fa9e0, emblem: 'fish' },
});

const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;
const smoothstep = (share) => share * share * (3 - 2 * share);
// Behind the round middle, the cheatline climbs this far round toward the top by the tail's end.
const sweepAt = (x) => (x < FUSELAGE.tailStart ? 1.45 * smoothstep(Math.min((FUSELAGE.tailStart - x) / 13, 1)) : 0);
// Cabin windows along the fuselage, leaving out the doors and the exits over the wings.
const WINDOW_XS = Array.from({ length: 30 }, (unused, index) => 11.9 - index * 0.92).filter((x) => x > -14.2 && Math.abs(x - 0.8) > 1.3);
const EXIT_XS = [1.5, 0.1];

// The fuselage's picture for `livery` (one of AIRLINER_LIVERIES), 1024 by 384 pixels (about 23 to a unit
// either way).
export function paintFuselage(livery) {
  const painter = createFuselagePainter({ width: 1024, height: 384, length: FUSELAGE_LENGTH, noseX: FUSELAGE.noseX, sectionAt: fuselageSection });
  const { context, place, band, aroundAt } = painter;
  const [main, accent] = [css(livery.main), css(livery.accent)];
  context.fillStyle = '#f7f7f4';
  context.fillRect(0, 0, 1024, 384);
  band(FUSELAGE.noseX, FUSELAGE.tailX, () => 0, () => 0.62, '#c9ced6');
  band(16, FUSELAGE.tailX, (x) => 1.2 + sweepAt(x), (x) => Math.min(1.46 + sweepAt(x) * 1.25, Math.PI), main);
  band(15.6, FUSELAGE.tailX, (x) => Math.min(1.5 + sweepAt(x) * 1.25, Math.PI), (x) => Math.min(1.58 + sweepAt(x) * 1.3, Math.PI), accent);
  paintCockpit(painter);
  for (const x of WINDOW_XS) {
    place(x, aroundAt(x, FUSELAGE.axisY + 0.55), (canvas) => cabinWindow(canvas, 0.38, 0.56));
  }
  for (const x of [FRONT_DOOR_X, REAR_DOOR_X]) {
    place(x, aroundAt(x, SILL_Y + 1.05), (canvas) => door(canvas, 1.15, 2.1));
  }
  for (const x of EXIT_XS) {
    place(x, aroundAt(x, FUSELAGE.axisY + 0.45), (canvas) => door(canvas, 0.6, 1.0));
  }
  place(5, 2.3, (canvas) => {
    // Drawn 20 times larger and scaled down: some browsers draw text under a few pixels badly.
    canvas.scale(0.05, 0.05);
    canvas.font = `italic 900 32px ${FONT}`;
    canvas.textAlign = 'center';
    canvas.textBaseline = 'middle';
    canvas.fillStyle = main;
    canvas.fillText(livery.name, 0, 0, 300);
  });
  place(17.4, 1.72, (canvas) => drawEmblem(canvas, livery.emblem, 1.15, { main, accent }));
  return painter.toTexture();
}

// The cockpit's dark windows: the side panes, then the windscreen wrapping over the nose's front.
function paintCockpit({ band, place }) {
  band(20.5, 18.9, () => 2.22, (x) => 2.62 + (x - 18.9) * 0.08, '#1c2733');
  band(21.4, 20.5, (x) => 2.22 + (x - 20.5) * 0.45, () => Math.PI, '#1c2733');
  for (const [x, around] of [[19.7, 2.45], [20.5, 2.45], [21.4, 2.9]]) {
    place(x, around, (canvas) => {
      canvas.fillStyle = '#f7f7f4';
      canvas.fillRect(-0.04, -0.6, 0.08, 1.2);
    });
  }
}

// A cabin window: dark glass with a pale glint in its top corner.
function cabinWindow(canvas, width, height) {
  roundedRectPath(canvas, width, height, width * 0.45);
  canvas.fillStyle = '#1c2733';
  canvas.fill();
  canvas.fillStyle = 'rgba(190, 220, 245, 0.55)';
  canvas.fillRect(-width * 0.25, -height * 0.32, width * 0.2, height * 0.25);
}

// A door's outline, with a small window and a handle.
function door(canvas, width, height) {
  roundedRectPath(canvas, width, height, 0.22);
  canvas.strokeStyle = '#8f98a3';
  canvas.lineWidth = 0.07;
  canvas.stroke();
  if (height > 1.5) {
    cabinWindow(canvas, 0.32, 0.42);
    canvas.fillStyle = '#8f98a3';
    canvas.fillRect(-width * 0.3, height * 0.08, width * 0.25, 0.08);
  }
}

// The fin's picture for `livery`, 512 pixels square, laid over the box round the fin (kit/airliner-shapes.js's
// buildFin) as seen from the right: the airline's colour, an accent swoosh and the emblem.
export function paintFin(livery) {
  const { canvas, context } = createCanvas(512, 512);
  const { rootChord, height, tipChord, sweep } = FIN;
  const across = rootChord + sweep;
  context.fillStyle = css(livery.main);
  context.fillRect(0, 0, 512, 512);
  // In fin units from here on: x forward from the fin's rearmost point, y down from its top.
  context.scale(512 / across, 512 / height);
  context.fillStyle = css(livery.accent);
  context.beginPath();
  context.moveTo(across, height * 0.92);
  context.quadraticCurveTo(across * 0.5, height * 0.85, 0, height * 0.25);
  context.lineTo(0, height * 0.4);
  context.quadraticCurveTo(across * 0.5, height * 1.02, across, height);
  context.fill();
  const middleX = across - sweep * 0.45 - (rootChord + (tipChord - rootChord) * 0.45) / 2;
  context.translate(middleX, height * 0.55);
  drawEmblem(context, livery.emblem, 1.7, { main: css(livery.main), accent: css(livery.accent) });
  return canvasTexture(canvas);
}
