// The ramp's shapes and maps (M8b): a kicker, our own design. An orange steel plate hinged at its near end on a
// steel barrel, its far end held up by white side cheeks and a dark riser; on the plate, white rails down both
// sides, seams between its sections, big white chevrons pointing up it, a steel lip at the top and bolts, all
// drawn in maps (kit/surface-maps.js) with their relief and shade. Built once round the ramp's middle on y = 0,
// z along the road: the plate's top runs from the road at z = -length/2 up to RAMP_SIZE.height at +length/2, the
// size the rules launch karts off. Used by road-object-drawing.js; how it moves is road-object-motion.js.

import * as THREE from 'three';
import { coloured, mergeShapes, roundedBox, shaded } from '../shape-utils.js';
import { createSurface } from '../kit/surface-maps.js';
import { RAMP_SIZE } from './road-objects.js';

const { length: LENGTH, width: WIDTH, height: HEIGHT } = RAMP_SIZE;
// The plate's length along its slope and its pitch.
const SLOPE_LENGTH = Math.hypot(LENGTH, HEIGHT);
const PITCH = Math.atan2(HEIGHT, LENGTH);
const PLATE_THICKNESS = 0.14;
const HINGE_RADIUS = 0.11;
// The cheeks stand this far in from the plate's sides, this thick.
const CHEEK_INSET = 0.3;
const CHEEK_THICKNESS = 0.12;
const CHEEK_HEX = 0xeeeae2;
const PANEL_HEX = 0xf07a1c;
const PANEL_DEPTH = 0.015;
const STEEL_HEX = 0x9aa2ad;
const RISER_HEX = 0x50565f;
// The plate's maps: pixels a unit, its colours ([r, g, b]) and heights (0 to 255).
const PIXELS_PER_UNIT = 64;
const ORANGE = [255, 128, 24];
const WHITE = [248, 246, 240];
const STEEL = [168, 174, 184];
const SEAM = [70, 40, 22];
const BOLT = [214, 218, 224];
const BASE = 120;
// The white rails down its sides and the steel strips at its ends (units).
const RAIL_WIDTH = 0.42;
const LIP_DEPTH = 0.34;
const HINGE_DEPTH = 0.2;
// Sections of the plate, and the chevrons' places along it (shares of its length), arm slope and thickness.
const SECTIONS = 4;
const CHEVRON_PLACES = [0.38, 0.6, 0.82];
const CHEVRON_SLOPE = 0.62;
const CHEVRON_THICKNESS = 0.42;
const CHEVRON_HALF_SPAN = 2.1;

// The plate, its picture stretched once over its top (u across, v up the slope).
export function buildKickerPlate() {
  const plate = roundedBox(WIDTH, PLATE_THICKNESS, SLOPE_LENGTH, 0.05);
  const { position, uv } = plate.attributes;
  for (let index = 0; index < position.count; index += 1) {
    uv.setXY(index, position.getX(index) / WIDTH + 0.5, position.getZ(index) / SLOPE_LENGTH + 0.5);
  }
  return pitched(plate.translate(0, -PLATE_THICKNESS / 2, 0));
}

// What holds the plate: the hinge barrel at its near end, the two white cheeks under its sides, each with an
// orange panel set on its outside, and the riser under its far end, coloured per vertex and darker toward the road.
export function buildKickerFrame() {
  const hinge = coloured(new THREE.CylinderGeometry(HINGE_RADIUS, HINGE_RADIUS, WIDTH - 0.1, 10).rotateZ(Math.PI / 2), STEEL_HEX);
  hinge.translate(0, 0, -LENGTH / 2);
  const underLip = HEIGHT - PLATE_THICKNESS / Math.cos(PITCH);
  // The cheek's underside of the plate, from the road at the near end up to under the lip, and the panel inside it.
  const slopeAt = (z) => -0.05 + ((z + LENGTH / 2) / LENGTH) * (underLip + 0.05);
  const cheek = [[-LENGTH / 2, -0.05], [LENGTH / 2, -0.05], [LENGTH / 2, underLip]];
  const [panelFrom, panelTo] = [-LENGTH / 2 + 1.9, LENGTH / 2 - 0.15];
  const panel = [[panelFrom, 0.1], [panelTo, 0.1], [panelTo, slopeAt(panelTo) - 0.15]];
  const sides = [-1, 1].flatMap((side) => {
    const middle = side * (WIDTH / 2 - CHEEK_INSET);
    const outside = middle + side * CHEEK_THICKNESS / 2;
    return [
      coloured(sidePlate(cheek, CHEEK_THICKNESS, middle + CHEEK_THICKNESS / 2), CHEEK_HEX),
      coloured(sidePlate(panel, PANEL_DEPTH, side > 0 ? outside + PANEL_DEPTH : outside), PANEL_HEX),
    ];
  });
  const riser = coloured(roundedBox(WIDTH - 2 * CHEEK_INSET, underLip + 0.05, 0.1, 0.03, { chamfered: true }), RISER_HEX);
  riser.translate(0, (underLip - 0.05) / 2, LENGTH / 2 - 0.08);
  return shaded(mergeShapes([hinge, ...sides, riser]), (x, y) => 0.72 + 0.28 * Math.min(Math.max(y / HEIGHT, 0), 1));
}

// A flat plate standing along the road, its outline `points` drawn as [z, y], `depth` thick across the road from
// x = `outerX` - depth to `outerX`.
function sidePlate(points, depth, outerX) {
  const plate = new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y))), { depth, bevelEnabled: false });
  // Extruded along z from 0 to depth; turned, the outline's x runs along the road and the depth across it.
  return indexed(plate.rotateY(-Math.PI / 2).translate(outerX, 0, 0));
}

// The plate's material from its maps (kickerPlateMaps).
export function createPlateMaterial(maps) {
  return new THREE.MeshStandardMaterial({ ...maps, metalness: 0.2 });
}

export function createFrameMaterial() {
  return new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.35, roughness: 0.5 });
}

// The plate's maps, { map, normalMap, aoMap, roughnessMap }: x across it, y up its slope (the lip at the top).
export function kickerPlateMaps() {
  const surface = createSurface(WIDTH, SLOPE_LENGTH, PIXELS_PER_UNIT, { color: ORANGE, roughness: 0.5, base: BASE });
  const railLength = SLOPE_LENGTH - HINGE_DEPTH - LIP_DEPTH;
  for (const left of [0, WIDTH - RAIL_WIDTH]) {
    const rail = { left, bottom: HINGE_DEPTH, width: RAIL_WIDTH, height: railLength };
    surface.panel(rail, { lift: 40, bevel: 0.08, paint: { color: WHITE, roughness: 0.4 } });
  }
  const lip = { left: 0, bottom: SLOPE_LENGTH - LIP_DEPTH, width: WIDTH, height: LIP_DEPTH };
  surface.panel(lip, { lift: 60, bevel: 0.06, paint: { color: STEEL, roughness: 0.3 } });
  const hingeStrip = { left: 0, bottom: 0, width: WIDTH, height: HINGE_DEPTH };
  surface.panel(hingeStrip, { lift: 20, bevel: 0.05, paint: { color: STEEL, roughness: 0.35 } });
  drawChevrons(surface);
  drawSeamsAndBolts(surface, railLength);
  return surface.toMaps({ depth: 5, shade: { reach: 0.06, strength: 2 }, repeat: false });
}

// The seams between the plate's sections, each with a row of bolts above it, and bolts down the rails and along
// the lip.
function drawSeamsAndBolts(surface, railLength) {
  const bolt = (x, y, radius) => surface.bolt(x, y, { radius, lift: 50, color: BOLT, roughness: 0.25 });
  for (let section = 1; section < SECTIONS; section += 1) {
    const y = HINGE_DEPTH + (section * railLength) / SECTIONS;
    surface.groove([RAIL_WIDTH, y], [WIDTH - RAIL_WIDTH, y], { size: 0.05, depth: 70, color: SEAM, amount: 0.7, roughness: 0.8 });
    for (let x = RAIL_WIDTH + 0.3; x < WIDTH - RAIL_WIDTH; x += 0.6) {
      bolt(x, y + 0.1, 0.035);
    }
  }
  for (let y = HINGE_DEPTH + 0.25; y < SLOPE_LENGTH - LIP_DEPTH; y += 0.5) {
    bolt(RAIL_WIDTH / 2, y, 0.045);
    bolt(WIDTH - RAIL_WIDTH / 2, y, 0.045);
  }
  for (let x = 0.25; x < WIDTH; x += 0.5) {
    bolt(x, SLOPE_LENGTH - LIP_DEPTH / 2, 0.05);
  }
}

// White chevrons between the rails, pointing up the slope, their edges blended a pixel so they stay clean.
function drawChevrons(surface) {
  for (let row = 0; row < surface.height; row += 1) {
    for (let column = 0; column < surface.width; column += 1) {
      const x = (column + 0.5) / PIXELS_PER_UNIT;
      const y = SLOPE_LENGTH - (row + 0.5) / PIXELS_PER_UNIT;
      const fromMiddle = Math.abs(x - WIDTH / 2);
      if (fromMiddle > CHEVRON_HALF_SPAN) {
        continue;
      }
      const cover = Math.max(...CHEVRON_PLACES.map((place) => {
        const below = place * SLOPE_LENGTH - fromMiddle * CHEVRON_SLOPE - y;
        return Math.min(below, CHEVRON_THICKNESS - below);
      }));
      const share = Math.min(Math.max(cover * PIXELS_PER_UNIT + 0.5, 0), 1);
      surface.colors.mix(column, row, WHITE, share);
      surface.roughnesses.mix(column, row, [100, 100, 100], share);
    }
  }
}

// A shape built flat (its top at y = 0) tipped up to the ramp's pitch about its middle and raised so its top runs
// from the road at its near end to HEIGHT at its far end.
function pitched(geometry) {
  return geometry.rotateX(-PITCH).translate(0, HEIGHT / 2, 0);
}

// The cheeks are extruded, which Three.js gives no index; the frame's other parts have one, and merged shapes
// must all have one or none.
function indexed(geometry) {
  geometry.setIndex(Array.from({ length: geometry.attributes.position.count }, (unused, index) => index));
  return geometry;
}
