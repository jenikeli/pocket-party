// The airport's small parked prop plane (M9), a landmark about 14 long, after a high-wing four-seater
// (test-results/reference/m9/I/cessna-172-side.jpg) made fat and toy-like: a fuselage with its cabin windows and
// windscreen, a wing on top braced by struts, a swept fin, a propeller with a spinner, and fixed gear with open
// wheels, in white with coral and navy stripes. It stands on its wheels on its origin, facing +x. Every prop
// plane on a course shares its fuselage's geometry and its materials; the parts coloured per vertex are copied
// per plane, so each takes the course's baked shade of its own place (baked-shade.js bakes a colour buffer
// once). Used by the airport's dressing (airport-scenery.js) and kit-shots.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes, roundedBox, roundedCylinder } from '../shape-utils.js';
import { aerofoilLoft, fuselageLoft, spacedPositions } from './airliner-lofts.js';
import { createFuselagePainter } from './airliner-paint.js';
import { createSkinMaps, SKIN_TILE } from './airliner-maps.js';
import { CORAL } from './terminal-maps.js';
import { NAVY } from './hangar-maps.js';

const NOSE_X = 7.15;
const TAIL_X = -7;
// The fuselage's outline from nose to tail: [x, top, bottom, halfWidth], joined in straight lines.
const PROFILE = [
  [7.15, 2.45, 2.05, 0], [7, 2.75, 1.75, 0.5], [6.4, 3.05, 1.3, 0.85], [4.4, 3.3, 1.1, 1],
  [2.8, 3.75, 1.05, 1.05], [0.2, 3.75, 1.1, 1], [-2.5, 3.45, 2, 0.62], [-6.8, 3.2, 2.75, 0.18], [-7, 3.05, 2.85, 0],
];
const WHITE = 0xf6f6f2;
const DARK = 0x2a2d33;
// What the prop plane covers seen from above (x from tail to propeller, z either side) and how tall it stands.
export const PROP_PLANE_FOOTPRINT = Object.freeze({ minX: TAIL_X - 0.5, maxX: NOSE_X + 0.7, halfWidth: 9.1, height: 5.5 });
const sharedByKit = new WeakMap();

// The fuselage's oval section at `x`: { centre, halfHeight, halfWidth }.
export function propPlaneSection(x) {
  const after = PROFILE.findIndex(([keyX]) => keyX <= x);
  if (after <= 0) {
    const end = after === 0 ? PROFILE[0] : PROFILE.at(-1);
    return { centre: (end[1] + end[2]) / 2, halfHeight: (end[1] - end[2]) / 2, halfWidth: end[3] };
  }
  const [high, low] = [PROFILE[after - 1], PROFILE[after]];
  const share = (high[0] - x) / (high[0] - low[0]);
  const [top, bottom, halfWidth] = [1, 2, 3].map((index) => high[index] + (low[index] - high[index]) * share);
  return { centre: (top + bottom) / 2, halfHeight: (top - bottom) / 2, halfWidth };
}

// { body, painted }: the fuselage (its picture) and everything else, coloured per vertex. Needs no canvas.
export function propPlaneGeometry() {
  const body = coloured(fuselageLoft(propPlaneSection, spacedPositions(TAIL_X, NOSE_X, 48, 'both'), { around: 40, noseX: NOSE_X, length: NOSE_X - TAIL_X }), 0xffffff);
  return { body, painted: mergeShapes([...wings(), ...tail(), ...gear(), ...propeller()]) };
}

// `kit` is the course's kit (kit/kit.js). Returns { object, update }: the plane as a group, and an update with
// nothing to move.
export function buildPropPlane(kit) {
  if (!sharedByKit.has(kit)) {
    const geometry = propPlaneGeometry();
    Object.values(geometry).forEach(kit.keep);
    const skin = createSkinMaps();
    Object.values(skin).forEach((texture) => {
      texture.repeat.set(Math.round((NOSE_X - TAIL_X) / SKIN_TILE), 2);
      kit.keep(texture);
    });
    const materials = {
      body: kit.keep(new THREE.MeshStandardMaterial({ map: kit.keep(paintFuselage()), ...skin, roughness: 1, metalness: 0.1 })),
      painted: kit.materials.plastic,
    };
    sharedByKit.set(kit, { geometry, materials });
  }
  const { geometry, materials } = sharedByKit.get(kit);
  const object = new THREE.Group();
  for (const name of ['body', 'painted']) {
    const mesh = new THREE.Mesh(name === 'painted' ? kit.keep(geometry.painted.clone()) : geometry[name], materials[name]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    object.add(mesh);
  }
  return { object, update() {} };
}

// The high wing in two halves meeting over the cabin, and the struts bracing it to the fuselage.
function wings() {
  return [-1, 1].flatMap((side) => [
    coloured(aerofoilLoft([
      { lead: [3.05, 3.78, 0], chord: 2.7, thickness: 0.4 },
      { lead: [2.9, 3.98, side * 9], chord: 2.25, thickness: 0.28 },
    ], [0, 1, 0]), WHITE),
    coloured(between(new THREE.CylinderGeometry(0.08, 0.08, 1, 8), [1.9, 3.7, side * 4.2], [1.3, 1.55, side * 0.92]), 0xd8dbe0),
  ]);
}

// The swept fin in coral with a navy tip, and the tail planes.
function tail() {
  const fin = (lead, chord, thickness, top, hex) => coloured(aerofoilLoft([
    { lead, chord, thickness },
    { lead: top.lead, chord: top.chord, thickness: thickness * 0.65 },
  ], [0, 0, 1]), hex);
  return [
    fin([-4.4, 3.1, 0], 2.7, 0.24, { lead: [-5.6, 4.6, 0], chord: 1.75 }, CORAL),
    fin([-5.6, 4.55, 0], 1.75, 0.16, { lead: [-6.2, 5.4, 0], chord: 1.3 }, NAVY),
    ...[-1, 1].map((side) => coloured(aerofoilLoft([
      { lead: [-5.2, 3.05, 0], chord: 1.75, thickness: 0.18 },
      { lead: [-5.7, 3.1, side * 3.1], chord: 1.2, thickness: 0.12 },
    ], [0, 1, 0]), WHITE)),
  ];
}

// A fat tyre with a coral hub at (x, z), on a leg down from the fuselage.
function wheelAt(x, z, radius, legTop) {
  const tyre = roundedCylinder(radius, radius, 0.32, 0.12, 16).rotateX(Math.PI / 2);
  const hub = roundedCylinder(radius * 0.5, radius * 0.5, 0.36, 0.05, 12).rotateX(Math.PI / 2);
  return [
    coloured(at(tyre, x, radius, z), DARK),
    coloured(at(hub, x, radius, z), CORAL),
    coloured(between(new THREE.CylinderGeometry(0.07, 0.09, 1, 8), legTop, [x, radius, z]), 0xd8dbe0),
  ];
}

function gear() {
  return [
    ...[-1, 1].flatMap((side) => wheelAt(0.6, side * 1.6, 0.45, [0.6, 1.25, side * 0.6])),
    ...wheelAt(5.6, 0, 0.38, [5.6, 1.35, 0]),
  ];
}

// The spinner and two blades, standing still.
function propeller() {
  const spinner = new THREE.LatheGeometry([[0, 0], [0.42, 0.02], [0.36, 0.35], [0, 0.75]].map(([r, along]) => new THREE.Vector2(r, along)), 16);
  const blade = (sign) => coloured(at(roundedBox(0.12, 1.5, 0.32, 0.05), NOSE_X + 0.22, 2.25 + sign * 0.85, 0), DARK);
  const tip = (sign) => coloured(at(roundedBox(0.13, 0.25, 0.33, 0.05), NOSE_X + 0.22, 2.25 + sign * 1.5, 0), 0xffc531);
  return [coloured(at(spinner.rotateZ(-Math.PI / 2), NOSE_X - 0.1, 2.25, 0), CORAL), blade(1), blade(-1), tip(1), tip(-1)];
}

// The fuselage's picture: white, a coral and a navy stripe sweeping up to the fin, the windscreen and cabin
// windows, and the plane's registration.
function paintFuselage() {
  const painter = createFuselagePainter({ width: 512, height: 256, length: NOSE_X - TAIL_X, noseX: NOSE_X, sectionAt: propPlaneSection });
  const { context, place, band } = painter;
  context.fillStyle = '#f6f6f2';
  context.fillRect(0, 0, 512, 256);
  const sweep = (x) => (x < -1 ? Math.min((-1 - x) / 6, 1) * 1.3 : 0);
  band(6.6, TAIL_X, (x) => 1.25 + sweep(x), (x) => Math.min(1.45 + sweep(x), Math.PI), '#f0532d');
  band(6.6, TAIL_X, (x) => Math.min(1.5 + sweep(x), Math.PI), (x) => Math.min(1.6 + sweep(x), Math.PI), '#1e3566');
  band(4.45, 2.9, (x) => 2.35 + (4.45 - x) * 0.1, () => Math.PI, '#1c2733');
  for (const [from, to] of [[2.75, 1.35], [1.2, 0.1], [-0.05, -1.1]]) {
    band(from, to, () => 2.05, (x) => 2.62 - (x < 0 ? 0.15 : 0), '#1c2733');
  }
  place(-3.4, 2.05, (canvas) => {
    canvas.scale(0.03, 0.03);
    canvas.font = '900 18px "Arial Black", Arial, sans-serif';
    canvas.textAlign = 'center';
    canvas.textBaseline = 'middle';
    canvas.fillStyle = '#1e3566';
    canvas.fillText('PB-21', 0, 0);
  });
  return painter.toTexture();
}
