// The glide ramp's panel (M9): the whole ramp before a glide is covered in glowing cyan, as in the reference game, with white
// glider-shaped arrows (a swept wing with a notched tail) that scroll up the ramp toward the lip. Like the LED
// panels (kit/led-panels.js) it is a lit-looking base under a see-through layer of arrows added to its light, and it
// glows as brightly as the Dash panel glow slider says. Where it goes comes from kit/road-marks.js's
// glidePanelRects. Used by kit/road.js.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { createCanvas, canvasTexture, repeatingTexture } from '../canvas-texture.js';
import { addRoadRect, stretchedOver } from './road-rects.js';
import { glidePanelRects } from './road-marks.js';
import { tuning } from '../tuning.js';

// Above the road (the arrows above the base), so neither flickers against the asphalt or each other.
const BASE_LIFT = 0.03;
const ARROW_LIFT = 0.04;
// An arrow's tile is this long and wide, in units; they slide forward this many tile lengths a second.
const ARROW_LENGTH = 6;
const ARROW_WIDTH = 6;
const SCROLL_SPEED = 0.8;
const BASE_STOPS = ['#0058c8', '#0a9ae8', '#38d8f8'];

// Returns { meshes, update(dt), dispose() } (no meshes on a course without a glide).
export function buildGlidePanels(track) {
  const rects = glidePanelRects(track);
  if (rects.length === 0) {
    return { meshes: [], update() {}, dispose() {} };
  }
  const baseBuilder = createStripBuilder();
  const arrowBuilder = createStripBuilder();
  for (const rect of rects) {
    addRoadRect(baseBuilder, track, rect, BASE_LIFT, 0xffffff, stretchedOver(rect));
    const across = Math.max(1, Math.round((rect.toLateral - rect.fromLateral) / ARROW_WIDTH));
    const along = Math.max(1, Math.round((rect.toS - rect.fromS) / ARROW_LENGTH));
    const stretched = stretchedOver(rect);
    addRoadRect(arrowBuilder, track, rect, ARROW_LIFT, 0xffffff, (s, lateral) => {
      const [u, v] = stretched(s, lateral);
      return [u * across, v * along];
    });
  }
  const base = new THREE.Mesh(baseBuilder.build(), new THREE.MeshBasicMaterial({ map: drawBase() }));
  // Added to what is under it, so the black between the arrows adds nothing; drawn after the road, and without
  // writing depth, so it never hides anything.
  const arrows = new THREE.Mesh(
    arrowBuilder.build(),
    new THREE.MeshBasicMaterial({ map: drawArrow(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  let time = 0;

  function update(dt) {
    time += dt;
    for (const mesh of [base, arrows]) {
      mesh.material.color.setScalar(tuning.dashPanelGlow);
    }
    arrows.material.map.offset.y = -time * SCROLL_SPEED;
  }

  function dispose() {
    for (const mesh of [base, arrows]) {
      mesh.geometry.dispose();
      mesh.material.map.dispose();
      mesh.material.dispose();
    }
  }

  update(0);
  return { meshes: [base, arrows], update, dispose };
}

// The glowing base, stretched once over the ramp: blue at its foot to pale cyan at the lip (top of the canvas),
// with a fine white edge round it.
function drawBase() {
  const { canvas, context } = createCanvas(64, 128);
  const gradient = context.createLinearGradient(0, 128, 0, 0);
  BASE_STOPS.forEach((stop, index) => gradient.addColorStop(index / (BASE_STOPS.length - 1), stop));
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 128);
  context.strokeStyle = '#8fe8ff';
  context.lineWidth = 3;
  context.strokeRect(1.5, 1.5, 61, 125);
  return canvasTexture(canvas);
}

// One glider pointing forward (up the canvas) on black, as one repeating tile: a nose, wings swept back to two
// tips, and a notch between them.
function drawArrow() {
  const size = 128;
  const { canvas, context } = createCanvas(size, size);
  context.fillStyle = '#000000';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.moveTo(64, 14);
  context.lineTo(112, 104);
  context.lineTo(64, 76);
  context.lineTo(16, 104);
  context.closePath();
  context.fill();
  // A darker spine, so it reads as a glider (two wings) and not a plain arrowhead.
  context.strokeStyle = '#3fb8ff';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(64, 22);
  context.lineTo(64, 76);
  context.stroke();
  return repeatingTexture(canvas);
}
