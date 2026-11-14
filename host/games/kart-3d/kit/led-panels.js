// The kit's panels on the road (M7d2), drawn like lit LED signs as in the reference game: the dash panels (yellow to orange to
// red) and a band across the whole road where each anti-gravity section starts (blue to cyan). Each has a
// glowing base with fine lines across it, a raised metal frame lit by the sun, and on top a see-through layer of
// chevrons made of dots that slides forward, added to the base's light. They glow as brightly as the Dash panel
// glow slider says (update reads it every frame), but light nothing round them. Where they go comes from
// kit/road-marks.js. Used by kit/road.js.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { createCanvas, canvasTexture, repeatingTexture } from '../canvas-texture.js';
import { addRoadRect, stretchedOver } from './road-rects.js';
import { dashPanelRects, antiGravityPanelRects } from './road-marks.js';
import { tuning } from '../tuning.js';

// Above the road (and the frame above the panel), so none of them flicker against each other.
const BASE_LIFT = 0.03;
const CHEVRON_LIFT = 0.04;
const FRAME_LIFT = 0.05;
const FRAME_WIDTH = 0.18;
// The chevrons slide forward this many of their own lengths a second.
const SCROLL_SPEED = 1.6;
const PANEL_STYLES = {
  // A chevron's slope is how far down its tile its arms reach for each pixel out from the middle; the dash
  // panel's tiles are short and wide, so its chevrons need steep arms to read as arrows from a chase camera.
  dash: { stops: ['#ff3a1e', '#ff8c1a', '#ffe14a'], chevron: '#fff6c8', chevronLength: 1.5, chevronWidth: 4, chevronSlope: 2.3 },
  antiGravity: { stops: ['#1f5cff', '#2fa8ff', '#5ff0ff'], chevron: '#ffffff', chevronLength: 4, chevronWidth: 3.2, chevronSlope: 0.9 },
};

// Returns { meshes, update(dt), dispose() }.
export function buildLedPanels(track) {
  const kinds = [
    { style: PANEL_STYLES.dash, rects: dashPanelRects(track) },
    { style: PANEL_STYLES.antiGravity, rects: antiGravityPanelRects(track) },
  ].filter((kind) => kind.rects.length > 0);
  const frames = createStripBuilder();
  const layers = kinds.map(({ style, rects }) => {
    rects.forEach((rect) => addFrame(frames, track, rect));
    return buildLayers(track, style, rects);
  });
  const frameMesh = new THREE.Mesh(frames.build(), new THREE.MeshStandardMaterial({ color: 0xb8bec8, metalness: 0.7, roughness: 0.35 }));
  frameMesh.receiveShadow = true;
  let time = 0;

  function update(dt) {
    time += dt;
    for (const { base, chevrons } of layers) {
      base.material.color.setScalar(tuning.dashPanelGlow);
      chevrons.material.color.setScalar(tuning.dashPanelGlow);
      chevrons.material.map.offset.y = -time * SCROLL_SPEED;
    }
  }

  function dispose() {
    for (const mesh of [frameMesh, ...layers.flatMap(({ base, chevrons }) => [base, chevrons])]) {
      mesh.geometry.dispose();
      mesh.material.map?.dispose();
      mesh.material.dispose();
    }
  }

  update(0);
  return { meshes: [frameMesh, ...layers.flatMap(({ base, chevrons }) => [base, chevrons])], update, dispose };
}

// One kind's two meshes over all its panels: the base, and the chevrons repeating along each panel (as many as
// fit its length) and across it (as many as fit its width).
function buildLayers(track, style, rects) {
  const baseBuilder = createStripBuilder();
  const chevronBuilder = createStripBuilder();
  for (const rect of rects) {
    addRoadRect(baseBuilder, track, rect, BASE_LIFT, 0xffffff, stretchedOver(rect));
    const across = Math.max(1, Math.round((rect.toLateral - rect.fromLateral) / style.chevronWidth));
    const along = Math.max(1, Math.round((rect.toS - rect.fromS) / style.chevronLength));
    const stretched = stretchedOver(rect);
    addRoadRect(chevronBuilder, track, rect, CHEVRON_LIFT, 0xffffff, (s, lateral) => {
      const [u, v] = stretched(s, lateral);
      return [u * across, v * along];
    });
  }
  const base = new THREE.Mesh(baseBuilder.build(), new THREE.MeshBasicMaterial({ map: drawBase(style) }));
  // Added to what is under it, so the black between the chevrons adds nothing; drawn after the road, and
  // without writing depth, so it never hides anything.
  const chevrons = new THREE.Mesh(
    chevronBuilder.build(),
    new THREE.MeshBasicMaterial({ map: drawChevrons(style), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  return { base, chevrons };
}

// The glowing base, stretched once over each panel: the gradient from its back (bottom of the canvas) to its
// front (top), with a fine dark line across every few pixels.
function drawBase(style) {
  const { canvas, context } = createCanvas(64, 128);
  const gradient = context.createLinearGradient(0, 128, 0, 0);
  style.stops.forEach((stop, index) => gradient.addColorStop(index / (style.stops.length - 1), stop));
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 128);
  context.fillStyle = 'rgba(0, 0, 0, 0.35)';
  for (let y = 0; y < 128; y += 4) {
    context.fillRect(0, y, 64, 1);
  }
  return canvasTexture(canvas);
}

// One chevron pointing forward (up the canvas), made of dots on black, as one repeating tile.
function drawChevrons(style) {
  const size = 64;
  const pitch = 4;
  const { canvas, context } = createCanvas(size, size);
  context.fillStyle = '#000000';
  context.fillRect(0, 0, size, size);
  context.fillStyle = style.chevron;
  for (let y = pitch / 2; y < size; y += pitch) {
    for (let x = pitch / 2; x < size; x += pitch) {
      // Below the apex line by less than the chevron's thickness: the apex is 15% down from the top.
      const apex = size * 0.15 + Math.abs(x - size / 2) * style.chevronSlope;
      if (y >= apex && y < apex + size * 0.3 && Math.abs(x - size / 2) < size * 0.42) {
        context.beginPath();
        context.arc(x, y, pitch * 0.42, 0, 2 * Math.PI);
        context.fill();
      }
    }
  }
  return repeatingTexture(canvas);
}

// The raised metal frame round a panel: four thin rectangles just outside its edges.
function addFrame(builder, track, rect) {
  const { fromS, toS, fromLateral, toLateral } = rect;
  const outside = FRAME_WIDTH;
  for (const edge of [
    { fromS: fromS - outside, toS: fromS, fromLateral: fromLateral - outside, toLateral: toLateral + outside },
    { fromS: toS, toS: toS + outside, fromLateral: fromLateral - outside, toLateral: toLateral + outside },
    { fromS, toS, fromLateral: fromLateral - outside, toLateral: fromLateral },
    { fromS, toS, fromLateral: toLateral, toLateral: toLateral + outside },
  ]) {
    addRoadRect(builder, track, edge, FRAME_LIFT, 0xffffff);
  }
}
