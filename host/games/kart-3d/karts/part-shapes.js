// Small helpers the karts and their drivers are built with (M7d5): a part coloured per vertex with a darker
// crease along its foot (MK8DX's dark creases where parts meet), a squashed ball, a limb (a capsule from one
// point to another) and a list of parts sorted by the kind of material they are drawn with. Used by the kart's
// builders (karts/) and the shared driver parts (karts/driver-parts.js).

import * as THREE from 'three';
import { coloured, shaded } from '../shape-utils.js';

// The kinds of material a kart is drawn with, one draw call each (kart-materials.js):
//   glossy  clear-coated paint and glass: the kart's body, eyes, lenses, shoes, shells
//   matte   hair, leather, rubber and dark plastic
//   skin    skin, fur and hide: a little lit from within in each part's own colour, so it stays bright in a
//           kart's shade
//   cloth   fabric (a weave in its surface and a soft sheen): clothes, scarves, gloves, caps of cloth
//   metal   chrome and gold (the colour says which)
//   decal   the design's emblem, a picture on a disc (no vertex colours; its texture coordinates span the picture)
export const MATERIAL_KINDS = Object.freeze(['glossy', 'matte', 'skin', 'cloth', 'metal', 'decal']);

// An empty list of parts, one array of geometries per kind.
export function partList() {
  return Object.fromEntries(MATERIAL_KINDS.map((kind) => [kind, []]));
}

// Adds every part of `more` to `parts` (both part lists) and returns `parts`.
export function addParts(parts, more) {
  MATERIAL_KINDS.forEach((kind) => parts[kind].push(...more[kind]));
  return parts;
}

// A part of the kart, the same shape in every design (so it is built once): in `kind`'s material, coloured
// already (painted) or, if `role` names one of a palette's colours ('main', 'second' or 'third'), coloured in each
// design's by paintKart, with a crease as painted's.
export function kartPart(kind, shape, role = null, crease = 0.25) {
  return { kind, shape, role, crease };
}

// The kart's parts (kartPart's) copied and coloured in `palette` ({ main, second, third }), as a part list.
export function paintKart(kartParts, palette) {
  const parts = partList();
  kartParts.forEach(({ kind, shape, role, crease }) => {
    const copy = shape.clone();
    parts[kind].push(role ? painted(copy, palette[role], { crease }) : copy);
  });
  return parts;
}

// Colours `geometry` (already in place) `hex` per vertex, darker toward its foot: the lowest `reach` share of its
// height is darkened by up to `crease`, as where a part meets what it rests on less light gets in.
export function painted(geometry, hex, { crease = 0.25, reach = 0.35 } = {}) {
  coloured(geometry, hex);
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const height = Math.max(max.y - min.y, 0.001);
  return shaded(geometry, (x, y) => 1 - crease * Math.max(0, 1 - (y - min.y) / (height * reach)));
}

// A ball `radius` round, stretched by `stretch` ([x, y, z]), its middle at `at` ([x, y, z]), coloured `hex`,
// with `detail` segments round (and half as many top to bottom).
export function ball(radius, stretch, at, hex, { detail = 16, crease = 0.2 } = {}) {
  const shape = new THREE.SphereGeometry(radius, detail, Math.max(6, Math.round(detail / 2)));
  shape.scale(...stretch).translate(...at);
  return painted(shape, hex, { crease });
}

// A capsule `radius` thick from `from` to `to` ([x, y, z] each): an arm, a leg, a strut. Its round ends are not
// stretched, as `between` (shape-utils.js) would stretch them.
export function limb(from, to, radius, hex, { detail = 8, crease = 0.15 } = {}) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const direction = end.clone().sub(start);
  const shape = new THREE.CapsuleGeometry(radius, Math.max(direction.length(), 0.001), 2, detail);
  return painted(along(shape, start, end), hex, { crease });
}

// A shape built round the origin along y, turned to point from `start` to `end` (THREE.Vector3s) and moved to
// their middle.
export function along(shape, start, end) {
  const direction = end.clone().sub(start).normalize();
  shape.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction));
  return shape.translate(...start.clone().add(end).multiplyScalar(0.5).toArray());
}

// A shape built facing +z (a disc, a decal) turned to face `normal` ([x, y, z]) and moved to `at`.
export function facing(shape, normal, at) {
  const direction = new THREE.Vector3(...normal).normalize();
  shape.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction));
  return shape.translate(...at);
}

// The design's emblem on a disc `radius` round facing `normal` at `at` (a decal: its texture coordinates span the
// emblem's square picture, kart-designs.js's drawEmblem). Slightly domed, so it catches the light like a badge.
export function emblemDisc(radius, normal, at) {
  const disc = new THREE.CircleGeometry(radius, 24);
  const { position } = disc.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const share = Math.hypot(position.getX(index), position.getY(index)) / radius;
    position.setZ(index, radius * 0.12 * (1 - share * share));
  }
  disc.computeVertexNormals();
  return facing(disc, normal, at);
}
