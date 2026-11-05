// The gliders' canopies (M9), one material per design: its picture drawn on a canvas as the canopy is seen from
// above (glider.js's texture coordinates), in the style of MK8DX's Super Glider: the cloth in the design's main
// colour, a stripe of its second colour from the nose widening to the trailing edge, its emblem on a disc ringed
// in its third colour in the middle, a darker hem round the edges and faint seams where the battens run. Used by
// kart-models.js.

import * as THREE from 'three';
import { createCanvas, canvasTexture } from '../canvas-texture.js';
import { CANOPY } from './glider.js';

// The canopy is about twice as wide as it is long, and so is its picture.
const MAP_WIDTH = 512;
const MAP_HEIGHT = 256;
const EMBLEM_SIZE = 256;
// The emblem's disc: its middle (z, on the keel) and radius, in units, and the ring round it.
const EMBLEM_Z = -0.42;
const EMBLEM_RADIUS = 0.36;
const RING_WIDTH = 0.04;
// The stripe's half width at the nose and at the trailing edge, in units.
const STRIPE_NOSE = 0.05;
const STRIPE_TAIL = 0.42;
const HEM_WIDTH = 0.05;
// The cloth glows faintly in its own colours, as thin cloth in the sun lets light through: its underside, seen
// by the karts behind, stays in its colours instead of going dark. Far below what bloom spreads.
const CLOTH_GLOW = 0.16;
// Where the seams run across the span (shares of the half span, both sides).
const SEAMS = [0.32, 0.6, 0.84];

// Returns { canopies (one material per design in `designs`, kart-designs.js's KART_DESIGNS), dispose() }.
export function createGliderMaterials(designs) {
  const maps = designs.map(drawCanopy);
  // Drawn from both sides: the chase camera sees the canopy's top, a kart behind and below sees its underside.
  const canopies = maps.map((map) => new THREE.MeshStandardMaterial({
    map, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: CLOTH_GLOW,
  }));

  function dispose() {
    canopies.forEach((material) => material.dispose());
    maps.forEach((map) => map.dispose());
  }

  return { canopies, dispose };
}

// Hex as a canvas colour, `shade` times as bright.
function colour(hex, shade = 1) {
  return `#${new THREE.Color(hex).multiplyScalar(shade).getHexString()}`;
}

function drawCanopy(design) {
  const { canvas, context } = createCanvas(MAP_WIDTH, MAP_HEIGHT);
  const { main, second, third } = design.palette;
  // Draw in units as seen from above, the nose up and the kart's left (+x) on the left: one unit across is
  // MAP_WIDTH / span pixels, one along MAP_HEIGHT / chord.
  context.scale(MAP_WIDTH / (2 * CANOPY.halfSpan), MAP_HEIGHT / (CANOPY.noseZ - CANOPY.tailZ));
  context.translate(CANOPY.halfSpan, CANOPY.noseZ);
  context.scale(-1, -1);
  context.fillStyle = colour(main);
  context.fillRect(-CANOPY.halfSpan, CANOPY.tailZ, 2 * CANOPY.halfSpan, CANOPY.noseZ - CANOPY.tailZ);
  drawSeams(context, colour(main, 0.82));
  drawStripe(context, colour(second), colour(second, 0.75));
  drawHem(context, colour(main, 0.6));
  drawEmblem(context, design, colour(third));
  return canvasTexture(canvas);
}

// The trailing edge's z at `x` (a straight line from the middle to each tip).
function trailZ(x) {
  return CANOPY.tailZ + (CANOPY.tipTrailZ - CANOPY.tailZ) * (Math.abs(x) / CANOPY.halfSpan);
}

function leadZ(x) {
  return CANOPY.noseZ + (CANOPY.tipLeadZ - CANOPY.noseZ) * (Math.abs(x) / CANOPY.halfSpan);
}

// Thin darker lines from the leading edge back to the trailing edge, as the cloth's seams over its battens.
function drawSeams(context, style) {
  context.strokeStyle = style;
  context.lineWidth = 0.025;
  SEAMS.forEach((share) => [1, -1].forEach((side) => {
    const x = side * share * CANOPY.halfSpan;
    context.beginPath();
    context.moveTo(x, leadZ(x));
    context.lineTo(x * 1.06, trailZ(x * 1.06));
    context.stroke();
  }));
}

// The stripe down the middle, narrow at the nose and wide at the trailing edge, outlined a shade darker.
function drawStripe(context, fill, outline) {
  context.beginPath();
  context.moveTo(STRIPE_NOSE, CANOPY.noseZ);
  context.lineTo(STRIPE_TAIL, trailZ(STRIPE_TAIL));
  context.lineTo(0, CANOPY.tailZ);
  context.lineTo(-STRIPE_TAIL, trailZ(STRIPE_TAIL));
  context.lineTo(-STRIPE_NOSE, CANOPY.noseZ);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = outline;
  context.lineWidth = 0.03;
  context.stroke();
}

// A darker band along the trailing edges (the hem), where the cloth is doubled over.
function drawHem(context, style) {
  context.beginPath();
  context.moveTo(CANOPY.halfSpan, CANOPY.tipTrailZ);
  context.lineTo(0, CANOPY.tailZ);
  context.lineTo(-CANOPY.halfSpan, CANOPY.tipTrailZ);
  context.strokeStyle = style;
  context.lineWidth = HEM_WIDTH * 2;
  context.stroke();
}

// The design's emblem on its disc in the middle of the stripe, ringed in `ringStyle`. The emblem is drawn upright
// as seen from above with the nose up, so its top points forward.
function drawEmblem(context, design, ringStyle) {
  context.beginPath();
  context.arc(0, EMBLEM_Z, EMBLEM_RADIUS + RING_WIDTH, 0, Math.PI * 2);
  context.fillStyle = ringStyle;
  context.fill();
  context.save();
  context.beginPath();
  context.arc(0, EMBLEM_Z, EMBLEM_RADIUS, 0, Math.PI * 2);
  context.clip();
  // Back to a picture's own axes (y down, x right) on the disc's square.
  context.translate(0, EMBLEM_Z);
  context.scale(-1, -1);
  context.translate(-EMBLEM_RADIUS, -EMBLEM_RADIUS);
  context.scale((2 * EMBLEM_RADIUS) / EMBLEM_SIZE, (2 * EMBLEM_RADIUS) / EMBLEM_SIZE);
  design.drawEmblem(context, EMBLEM_SIZE);
  context.restore();
}
