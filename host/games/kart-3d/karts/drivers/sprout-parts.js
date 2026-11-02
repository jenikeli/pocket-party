// Sprout's own parts (M7d5), the ones only a turnip-headed kid has: the turnip head, white below and pale purple
// toward its point, the tuft of big leaves sprouting from it, the bib and straps of the overalls, and brown boots
// with the overalls' legs rolled up over them. Used by drivers/sprout.js. Every place is [x, y, z] in the kart's
// axes (kart-layout.js).

import * as THREE from 'three';
import { joinNormals } from '../curved-shapes.js';
import { painted, ball, limb, along } from '../part-shapes.js';
import { head } from '../driver-parts.js';

// Above this share of the radius up from its middle, the turnip narrows into its point, rising this share of the
// radius higher than a round head's top and pulling in this share of its width. The brows sit below it, so the
// face laid on the round head (driver-parts.js's onHead) stays on the surface.
const TAPER_FROM = 0.45;
const TAPER_RISE = 0.18;
const TAPER_IN = 0.34;

// The shared round head in `white`, its top drawn up into a turnip's point and coloured `purple` from the brows up,
// `deepPurple` toward the point. Returns the head ({ at, radius, shape }, as driver-parts.js's head) and `top`,
// where its leaves grow from.
export function turnipHead(at, radius, { white, purple, deepPurple }) {
  const face = head(at, radius, white);
  const { position, color } = face.shape.attributes;
  const [pale, deep] = [new THREE.Color(purple), new THREE.Color(deepPurple)];
  const blended = new THREE.Color();
  for (let index = 0; index < position.count; index += 1) {
    const [x, y, z] = [position.getX(index) - at[0], position.getY(index) - at[1], position.getZ(index) - at[2]];
    const height = y / radius;
    const rise = THREE.MathUtils.smoothstep(height, TAPER_FROM, 0.95);
    const inward = 1 - TAPER_IN * rise;
    position.setXYZ(index, at[0] + x * inward, at[1] + y + radius * TAPER_RISE * rise * rise, at[2] + z * inward);
    blended.setRGB(color.getX(index), color.getY(index), color.getZ(index));
    blended.lerp(pale, THREE.MathUtils.smoothstep(height, 0.35, 0.7)).lerp(deep, THREE.MathUtils.smoothstep(height, 0.72, 1));
    color.setXYZ(index, blended.r, blended.g, blended.b);
  }
  face.shape.computeVertexNormals();
  joinNormals(face.shape);
  const top = [at[0], at[1] + radius * (0.95 + TAPER_RISE) - 0.02, at[2]];
  return { face, top };
}

// The tuft of big leaves from `top`, each { turn, lean, length, width, curl } (see leaf), in `leafHex` with a
// stem and midrib in `ribHex`. Returns the parts (matte).
export function leafTuft(top, leaves, { leafHex, ribHex }) {
  return leaves.flatMap((spec) => leaf(spec, leafHex, ribHex).map((part) => part.translate(...top)));
}

// One leaf on its stalk, built growing up +y from the origin and laid out: its blade `length` long and `width`
// wide, widest toward its tip, cupped along its midrib and drooping by `curl` toward its tip; then leaned `lean`
// radians out from upright, toward `turn` radians round from straight ahead (+z) to the head's left.
function leaf({ turn, lean, length, width, curl }, leafHex, ribHex) {
  // The way along the leaf's middle, `share` 0 at its stalk's foot and 1 at its tip; the blade starts a fifth up.
  const middleAt = (share) => new THREE.Vector3(0, share * length, curl * length * share * share);
  const stalk = 0.2;
  const thickness = 0.014;
  const blade = new THREE.SphereGeometry(1, 12, 12);
  const { position } = blade.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
    const bladeShare = (y + 1) / 2;
    const across = x * (width / 2) * (0.55 + 0.6 * bladeShare);
    const point = middleAt(stalk + bladeShare * (1 - stalk));
    // The edges cup up (toward -z, the leaf's top side once it leans out) from the midrib.
    position.setXYZ(index, across, point.y, point.z + z * thickness - Math.abs(across) * 0.35);
  }
  blade.computeVertexNormals();
  const ribPoints = Array.from({ length: 6 }, (unused, step) => middleAt((step / 5) * 0.85).add(new THREE.Vector3(0, 0, -thickness * 0.6)));
  const rib = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPoints), 10, 0.014, 5, false);
  const laidOut = (shape) => shape.rotateX(lean).rotateY(turn);
  return [painted(laidOut(blade), leafHex, { crease: 0.2 }), painted(laidOut(rib), ribHex, { crease: 0 })];
}

// The chest's ball (driver-parts.js's body: { at, radii }) as a unit sphere, so the bib and straps can be cut from
// it: `shape` (built round the origin, 1 round) is stretched onto it, `scale` times bigger. Returns `shape`.
function onChest(shape, { at, radii }, scale) {
  return shape.scale(...radii.map((radius) => radius * scale)).translate(...at);
}

// The overalls' bib on the chest's front and the matching panel on its back, cut from a ball just bigger than the
// chest, from `top` radians down from the chest's top to below its waist, in `hex` (cloth parts).
export function bibs(chest, { top, hex }) {
  return [Math.PI / 2, Math.PI * 1.5].map((middle) => {
    const panel = new THREE.SphereGeometry(1, 8, 8, middle - 0.6, 1.2, top, 2.2 - top);
    return painted(onChest(panel, chest, 1.025), hex, { crease: 0.1 });
  });
}

// The two straps from the front bib up over the shoulders and down the back, `across` (a share of the chest's
// half width) either side of the middle, in `hex`, with a brass button where each meets the bib's top (`bibTop`
// radians down from the chest's top). Returns { straps (cloth), buttons (metal) }.
export function straps(chest, { across, bibTop, hex, buttonHex }) {
  const straps = [1, -1].map((side) => {
    // A thin ring round the ball's x axis: turned so its rings stand across x, they run front, over, and back.
    const band = new THREE.SphereGeometry(1, 20, 1, -2.1, 4.2, Math.acos(side * across) - 0.065, 0.13).rotateZ(-Math.PI / 2);
    return painted(onChest(band, chest, 1.04), hex, { crease: 0 });
  });
  const buttons = [1, -1].map((side) => {
    const up = Math.cos(bibTop);
    const out = new THREE.Vector3(side * across, up, Math.sqrt(1 - across * across - up * up));
    const at = out.multiply(new THREE.Vector3(...chest.radii)).multiplyScalar(1.07).add(new THREE.Vector3(...chest.at));
    return ball(0.026, [1, 1, 0.6], at.toArray(), buttonHex, { detail: 10, crease: 0 });
  });
  return { straps, buttons };
}

// A brown boot's shaft up the shin from the shoe at `foot` toward `knee`, `radius` round, in `bootHex`, with the
// overalls' leg rolled up in a cuff above it in `cuffHex`. `shoe` is the shoe's length (driver-parts.js's leg).
// Returns { boot (matte), cuff (cloth) }.
export function bootTop(foot, knee, { radius, shoe, bootHex, cuffHex }) {
  const ankle = new THREE.Vector3(foot[0], foot[1] + shoe * 0.35, foot[2] - shoe * 0.3);
  const upLeg = new THREE.Vector3(...knee).sub(ankle).normalize();
  const shaftTop = ankle.clone().addScaledVector(upLeg, 0.13);
  const cuffTop = shaftTop.clone().addScaledVector(upLeg, 0.07);
  const cuff = along(new THREE.CylinderGeometry(radius * 1.12, radius * 1.18, 0.07, 14), shaftTop, cuffTop);
  return {
    boot: limb(ankle.toArray(), shaftTop.toArray(), radius, bootHex, { detail: 10, crease: 0.1 }),
    cuff: painted(cuff, cuffHex, { crease: 0.1 }),
  };
}
