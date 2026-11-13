// The kart's shadow caster (M10 O): a few hundred triangles of boxes in the kart's outline and the design's
// height, instead of the kart's own 17,000 triangles in 10 draw calls, which every view's shadow pass drew again.
// From the sun a kart is a dark patch, so boxes that follow its outline cast nearly the same one. It casts but is
// never drawn in the colour pass. Geometry only, so it is unit tested in Node. Used by kart-models.js.

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { WHEELS } from './kart-layout.js';

// The kart's own body as boxes, [x half width, y from, y to, z from, z to], read off the kart's parts
// (kart-body.js, kart-rear.js, kart-cockpit.js) slice by slice: the floor, the side pods between the wheels, the
// engine's lower part, the seat back, the cowl, the rear wing's deck, and the nose: its low wing in three steps as
// it tapers, and the cone above it.
const BODY_BOXES = Object.freeze([
  [0.5, 0.1, 0.6, -0.95, 0.6],
  [0.63, 0.1, 0.6, -0.4, 0.35],
  [0.43, 0.1, 0.55, -1.2, -0.95],
  [0.48, 0.6, 0.9, -1.1, -0.6],
  [0.4, 0.6, 0.9, 0.1, 0.6],
  [0.56, 0.75, 0.9, -1.37, -0.95],
  [0.55, 0.1, 0.3, 0.6, 0.75],
  [0.43, 0.1, 0.3, 0.75, 0.95],
  [0.3, 0.1, 0.3, 0.95, 1.22],
  [0.5, 0.3, 0.55, 0.6, 0.7],
  [0.32, 0.3, 0.46, 0.7, 1.1],
]);
// The driver, steering wheel and exhausts above the cockpit are boxes, one for each band of height from DRIVER_BASE
// up to the design's top. A band's box is as wide and long as the design's shapes are inside that band (the shapes'
// triangles cut at the band's edges), and one band holds a box for each group of shapes more than CLUSTER_GAP apart
// along z (the rear wing and the driver, a ghost's tail).
const DRIVER_BASE = 0.9;
const BAND_HEIGHT = 0.15;
const CLUSTER_GAP = 0.3;
const SLICE = 0.05;
// No box is thinner than this, so a cone's tip is not a flat sliver.
const MIN_SIZE = 0.04;
// The kart's parts are rounded, so a box round a part's extent covers more ground than the part. A box is as wide
// and long as this share of that extent (a round part is 0.886 of its box on each side by area).
const FIT = 0.9;
// A wheel's box is an 8-sided prism, nearly round as the tyre is. It does not follow the wheel's steering, rolling
// or tucking flat in anti-gravity, which is accepted: at this size the shadow shows no difference.
const WHEEL_SIDES = 8;
// The geometry's draw range while it is not casting: Three.js's renderBufferDirect returns before drawing (and
// before counting a draw call) when the range's length is negative.
const NOT_DRAWN = -1;

// One geometry of position only (the shadow's depth pass needs no more) for a design: `designShapes` is
// design-shapes.js's buildDesignShapes. Its draw range is closed, so it is drawn only by its shadow caster.
export function buildShadowStandIn(designShapes) {
  const shapes = Object.values(designShapes).filter((shape) => shape.index.count > 0);
  const boxes = [...BODY_BOXES.map(bodyBox), ...driverBoxes(shapes), ...WHEELS.map(wheelPrism)];
  const standIn = mergeShapes(boxes);
  standIn.deleteAttribute('normal');
  standIn.deleteAttribute('uv');
  standIn.drawRange.count = NOT_DRAWN;
  return standIn;
}

// A mesh that casts `standIn`'s shadow and is not drawn in the colour pass. Three.js's shadow pass and colour
// pass test a mesh by the same flags (visible, layers, material), so none can tell them apart; the geometry's
// draw range does it: closed (NOT_DRAWN) while the colour pass looks at it, open between onBeforeShadow and
// onAfterShadow, which wrap each draw of the shadow pass. `material` is any material, since the shadow pass uses
// its own depth material; it hides itself too in case a later Three.js draws a closed range.
export function createShadowCaster(standIn, material) {
  const caster = new THREE.Mesh(standIn, material);
  caster.castShadow = true;
  caster.onBeforeShadow = openForShadow;
  caster.onAfterShadow = closeAfterShadow;
  return caster;
}

// The shadow is drawn from the boxes' faces toward the sun, not (Three.js's default for a front-sided material)
// from the faces away from it: those include the undersides, 0.1 above the road, which leave stripes of acne on it.
export function createStandInMaterial() {
  return new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, shadowSide: THREE.FrontSide });
}

// Called by Three.js's shadow pass as (renderer, object, camera, shadowCamera, geometry, ...): `geometry` is the
// one about to be drawn.
function openForShadow(renderer, object, camera, shadowCamera, geometry) {
  geometry.drawRange.count = Infinity;
}

function closeAfterShadow(renderer, object, camera, shadowCamera, geometry) {
  geometry.drawRange.count = NOT_DRAWN;
}

function bodyBox([halfWidth, yFrom, yTo, zFrom, zTo]) {
  return boxBetween([-halfWidth, yFrom, zFrom], [halfWidth, yTo, zTo]);
}

// A box between the corners `min` and `max`, its x and z sides shortened to FIT of them (about its middle).
function boxBetween(min, max) {
  const fit = [FIT, 1, FIT];
  const size = min.map((from, axis) => Math.max((max[axis] - from) * fit[axis], MIN_SIZE));
  const middle = min.map((from, axis) => (from + max[axis]) / 2);
  return new THREE.BoxGeometry(...size).translate(...middle);
}

// A wheel's prism at its place: its axle along x, its lowest point on the road.
function wheelPrism({ x, z, radius, width }) {
  return new THREE.CylinderGeometry(radius, radius, width, WHEEL_SIDES, 1).rotateZ(Math.PI / 2).translate(x, radius, z);
}

// The driver's boxes for a design's `shapes` (indexed geometries): one or more for each band of height, from
// DRIVER_BASE to the highest point (the last band ends exactly there, so the stand-in is as tall as the design).
function driverBoxes(shapes) {
  const top = Math.max(...shapes.map((shape) => (shape.computeBoundingBox(), shape.boundingBox.max.y)));
  const bands = bandsUpTo(top);
  const slicesInBands = bands.map(() => new Map());
  shapes.forEach((shape) => addEdgesToBands(shape, bands, slicesInBands));
  return bands.flatMap((band, index) => clusterBoxes(slicesInBands[index], band));
}

// The bands from DRIVER_BASE to `top`: [{ from, to }]. A sliver left under the top joins the band below.
function bandsUpTo(top) {
  const bands = [];
  for (let from = DRIVER_BASE; from < top; from += BAND_HEIGHT) {
    const sliver = top - (from + BAND_HEIGHT) < BAND_HEIGHT / 2;
    bands.push({ from, to: sliver ? top : from + BAND_HEIGHT });
    if (sliver) {
      break;
    }
  }
  return bands;
}

// Adds the ends of every triangle edge of `shape`, as cut at each band's top and bottom, to that band's slices. A
// triangle cut by a horizontal plane is widest along one of its edges' pieces, so these ends give the exact
// outline of the shape inside the band. A band's slices are its ends' extents by z in SLICE units (a Map from
// the slice's number to { minX, maxX, minZ, maxZ }), which keeps a band small however many triangles the shape has.
function addEdgesToBands(shape, bands, slicesInBands) {
  const position = shape.attributes.position;
  const index = shape.index.array;
  for (let corner = 0; corner < index.length; corner += 1) {
    const start = index[corner];
    const end = index[corner % 3 === 2 ? corner - 2 : corner + 1];
    const [low, high] = position.getY(start) <= position.getY(end) ? [start, end] : [end, start];
    const lowY = position.getY(low);
    const highY = position.getY(high);
    bands.forEach(({ from, to }, bandIndex) => {
      if (highY < from || lowY > to) {
        return;
      }
      const share = (y) => (highY === lowY ? 0 : (Math.min(Math.max(y, lowY), highY) - lowY) / (highY - lowY));
      const [first, last] = highY === lowY ? [0, 1] : [share(from), share(to)];
      [first, last].forEach((along) => {
        const x = position.getX(low) + (position.getX(high) - position.getX(low)) * along;
        const z = position.getZ(low) + (position.getZ(high) - position.getZ(low)) * along;
        addToSlices(slicesInBands[bandIndex], x, z);
      });
    });
  }
}

function addToSlices(slices, x, z) {
  const number = Math.floor(z / SLICE);
  const slice = slices.get(number);
  if (slice) {
    slice.minX = Math.min(slice.minX, x);
    slice.maxX = Math.max(slice.maxX, x);
    slice.minZ = Math.min(slice.minZ, z);
    slice.maxZ = Math.max(slice.maxZ, z);
  } else {
    slices.set(number, { minX: x, maxX: x, minZ: z, maxZ: z });
  }
}

// The boxes of one `band` ({ from, to }) round its `slices`: the slices are taken in order of z and split wherever
// two are more than CLUSTER_GAP apart, and each group gets the box round it.
function clusterBoxes(slices, { from, to }) {
  const numbers = [...slices.keys()].sort((a, b) => a - b);
  const groups = [];
  numbers.forEach((number, at) => {
    if (at === 0 || (number - numbers[at - 1]) * SLICE > CLUSTER_GAP) {
      groups.push([]);
    }
    groups[groups.length - 1].push(slices.get(number));
  });
  return groups.map((group) => {
    const min = [Math.min(...group.map((slice) => slice.minX)), from, Math.min(...group.map((slice) => slice.minZ))];
    const max = [Math.max(...group.map((slice) => slice.maxX)), to, Math.max(...group.map((slice) => slice.maxZ))];
    return boxBetween(min, max);
  });
}
