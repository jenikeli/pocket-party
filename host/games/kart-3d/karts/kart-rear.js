// The back of our go-kart (M7d5), in the style of the reference game's standard kart: an engine
// block with chrome bolts and fins
// behind the seat, two long black exhaust pipes reaching up and back over the rear wheels, a chrome clamp near
// their ends and wide flared gold bells for tips, the
// rear axle, a bumper in the third colour and an amber tail light. Used by design-shapes.js.

import * as THREE from 'three';
import { roundedBox } from '../shape-utils.js';
import { creased } from './curved-shapes.js';
import { kartPart, painted, limb, ball, along } from './part-shapes.js';
import { EXHAUST_TIPS, EXHAUST_POINTING, WHEELS } from './kart-layout.js';

const ENGINE_HEX = 0x50535c;
const DARK_HEX = 0x2a2c33;
const PIPE_HEX = 0x1d1e23;
const CHROME_HEX = 0xdfe3ea;
const GOLD_HEX = 0xe2a92a;
const AMBER_HEX = 0xff9a1c;
const PIPE_RADIUS = 0.088;
const BELL_LENGTH = 0.2;
// The engine block's middle and size.
const ENGINE = { at: [0, 0.4, -0.8], size: [0.46, 0.3, 0.34] };

// Returns the back's parts (part-shapes.js's kartPart), the painted ones naming their palette colour.
export function buildKartRear() {
  const rear = WHEELS.filter((wheel) => !wheel.front);
  const matte = [
    painted(roundedBox(...ENGINE.size, 0.05).translate(...ENGINE.at), ENGINE_HEX, { crease: 0.35 }),
    limb([rear[0].x * 0.75, rear[0].radius, rear[0].z], [rear[1].x * 0.75, rear[1].radius, rear[1].z], 0.045, DARK_HEX),
    ...[1, -1].map((side) => limb([side * 0.3, 0.2, -0.95], [side * 0.3, 0.26, -1.02], 0.03, DARK_HEX)),
  ];
  return [
    ...matte.map((shape) => kartPart('matte', shape)),
    // A cover over the engine in the main colour, and the bumper and tail light at the back.
    kartPart('glossy', roundedBox(0.4, 0.07, 0.3, 0.03).translate(ENGINE.at[0], ENGINE.at[1] + 0.17, ENGINE.at[2]), 'main', 0.3),
    kartPart('glossy', roundedBox(0.84, 0.13, 0.12, 0.045).translate(0, 0.27, -1.05), 'third'),
    kartPart('glossy', painted(roundedBox(0.22, 0.07, 0.04, 0.015).translate(0, 0.28, -1.115), AMBER_HEX, { crease: 0 })),
    ...EXHAUST_TIPS.map((tip, index) => kartPart('glossy', buildPipe(tip, index === 0 ? 1 : -1))),
    ...[...buildEngineChrome(), ...EXHAUST_TIPS.map(buildBell), ...EXHAUST_TIPS.map(buildClamp)].map((shape) => kartPart('metal', shape)),
  ];
}

// Chrome fins along the engine's top and a bolt at each corner of its back.
function buildEngineChrome() {
  const [x, y, z] = ENGINE.at;
  const [width, height, depth] = ENGINE.size;
  const fins = [-0.08, 0, 0.08].map((offset) => painted(roundedBox(0.03, 0.06, depth * 0.8, 0.012, { chamfered: true }).translate(x + offset, y + height / 2 + 0.06, z), CHROME_HEX, { crease: 0.2 }));
  const bolt = (at) => ball(0.022, [1, 1, 1], at, CHROME_HEX, { detail: 6, crease: 0 });
  const backBolts = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sideX, sideY]) => bolt([x + sideX * (width / 2 - 0.06), y + sideY * (height / 2 - 0.06), z - depth / 2 - 0.005]));
  return [...fins, ...backBolts];
}

// A black pipe from the engine's side, turning up and back into a long straight run to the base of its bell.
function buildPipe(tip, side) {
  const base = bellBase(tip);
  const points = [
    new THREE.Vector3(side * 0.2, 0.42, -0.6),
    new THREE.Vector3(side * 0.27, 0.48, -0.72),
    base.clone().addScaledVector(pointing(side), -0.42),
    base,
  ];
  const pipe = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 14, PIPE_RADIUS, 10, false);
  return painted(pipe, PIPE_HEX, { crease: 0.3 });
}

// A wide gold bell, flaring from the pipe to its mouth at `tip`, its inside dark: one turned outline, out along
// the outside, round the lip and back in.
function buildBell(tip) {
  const outline = [
    [PIPE_RADIUS + 0.01, 0], [PIPE_RADIUS + 0.014, 0.06], [0.12, 0.13], [0.165, 0.18], [0.175, BELL_LENGTH],
    [0.16, BELL_LENGTH + 0.006], [0.145, 0.175], [0.1, 0.12], [0.07, 0.06], [0.05, 0.03],
  ];
  const bell = new THREE.LatheGeometry(outline.map(([radius, y]) => new THREE.Vector2(radius, y)), 16);
  // The lathe's vertices run round the outline for each step round, so a vertex's place in the outline is its
  // index modulo the outline's length: the outline's second half (the inside) is shaded dark.
  painted(bell, GOLD_HEX, { crease: 0 });
  const { color } = bell.attributes;
  for (let index = 0; index < color.count; index += 1) {
    const shade = index % outline.length >= 6 ? 0.3 : 1;
    color.setXYZ(index, color.getX(index) * shade, color.getY(index) * shade, color.getZ(index) * shade);
  }
  // Centred on its length, as along() takes a shape. Creased at the lip: the lathe's smooth normals there averaged
  // the outside with the inside, to almost nothing, which the iPad's half precision turned into NaN or infinity
  // under bloom (M7d5's whole-frame flashes).
  bell.translate(0, -BELL_LENGTH / 2, 0);
  return along(creased(bell, Math.PI / 4), bellBase(tip), new THREE.Vector3(...tip));
}

// A chrome band round the pipe a little before its bell.
function buildClamp(tip) {
  const side = Math.sign(tip[0]);
  const at = bellBase(tip).addScaledVector(pointing(side), -0.12);
  const band = new THREE.CylinderGeometry(PIPE_RADIUS + 0.012, PIPE_RADIUS + 0.012, 0.045, 14);
  return painted(along(band, at.clone().addScaledVector(pointing(side), -0.001), at.clone().addScaledVector(pointing(side), 0.001)), CHROME_HEX, { crease: 0 });
}

// The way the exhaust on `side` (1 left, -1 right) points: EXHAUST_POINTING, its sideways part mirrored.
function pointing(side) {
  const [x, y, z] = EXHAUST_POINTING;
  return new THREE.Vector3(side * x, y, z).normalize();
}

function bellBase(tip) {
  return new THREE.Vector3(...tip).addScaledVector(pointing(Math.sign(tip[0])), -BELL_LENGTH);
}
