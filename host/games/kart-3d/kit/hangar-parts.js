// Shapes both hangars (M9) are built from: a grid of quads bent to any surface (a curved roof sheet, a glazed
// gable), a sheet following an arched roof, a steel member between two points, and the hangars' shared
// materials, made once per course. Used by kit/hangar.js, kit/hangar-big-frame.js and kit/hangar-big-skin.js.

import * as THREE from 'three';
import { between, coloured, roundedBox } from '../shape-utils.js';
import { createCorrugatedMaps, createGlazingMaps } from './hangar-maps.js';

// Corrugated sheet's texture repeats every this many units.
export const SHEET_TILE = 2;

// A `columns` by `rows` grid of quads, indexed: pointAt(column, row) gives { position: [x, y, z], normal:
// [x, y, z], uv: [u, v] } for each corner (column 0..columns, row 0..rows). The faces turn toward the normals
// given. Coloured `hex` for a material with vertexColors.
export function grid(columns, rows, pointAt, hex) {
  const positions = [];
  const normals = [];
  const uvs = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const { position, normal, uv } = pointAt(column, row);
      positions.push(...position);
      normals.push(...normal);
      uvs.push(...uv);
    }
  }
  const corner = (column, row) => row * (columns + 1) + column;
  const facesNormal = firstFaceAgrees(positions, normals, corner(1, 0), corner(0, 1));
  const indices = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const [a, b, c, d] = [corner(column, row), corner(column + 1, row), corner(column, row + 1), corner(column + 1, row + 1)];
      indices.push(...(facesNormal ? [a, b, c, b, d, c] : [a, c, b, b, c, d]));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return coloured(geometry, hex);
}

// Whether the triangle (corner 0, `along`, `across`) winds so that it faces corner 0's normal.
function firstFaceAgrees(positions, normals, along, across) {
  const at = (index) => new THREE.Vector3().fromArray(positions, index * 3);
  const origin = at(0);
  const face = at(along).sub(origin).cross(at(across).sub(origin));
  return face.dot(new THREE.Vector3().fromArray(normals, 0)) >= 0;
}

// A sheet on an arched roof (roofY(z) gives its height), from fromZ to toZ across and fromX to toX along, `lift`
// above the roof's line; facing up (outside) or, with `inside`, down. `steps` quads across. Its texture runs
// along x and up the arch, repeating every tile[0] units along and tile[1] up (SHEET_TILE for corrugated sheet,
// so its corrugations run down the slope).
export function archSheet(roofY, { fromZ, toZ, fromX, toX, lift = 0, inside = false, steps, hex, tile = [SHEET_TILE, SHEET_TILE] }) {
  const slope = (z) => (roofY(z + 0.01) - roofY(z - 0.01)) / 0.02;
  const zAt = (row) => fromZ + ((toZ - fromZ) * row) / steps;
  const arcTo = [0];
  for (let row = 1; row <= steps; row += 1) {
    arcTo.push(arcTo[row - 1] + Math.hypot(zAt(row) - zAt(row - 1), roofY(zAt(row)) - roofY(zAt(row - 1))));
  }
  return grid(1, steps, (column, row) => {
    const z = zAt(row);
    const up = new THREE.Vector3(0, 1, -slope(z)).normalize().multiplyScalar(inside ? -1 : 1);
    const x = column === 0 ? fromX : toX;
    return { position: [x, roofY(z) + lift, z], normal: up.toArray(), uv: [x / tile[0], arcTo[row] / tile[1]] };
  }, hex);
}

// A band along an arched roof's curve at the end `x`, from -halfWidth to halfWidth across, covering the sheets'
// edges: from `below` under the roof's line to `above` over it, facing out along x.
export function archTrim(roofY, { x, halfWidth, below, above, hex }) {
  const steps = 40;
  return grid(steps, 1, (column, row) => {
    const z = -halfWidth + (2 * halfWidth * column) / steps;
    const y = roofY(z) + (row === 0 ? -below : above);
    return { position: [x, y, z], normal: [Math.sign(x), 0, 0], uv: [z / SHEET_TILE, y / SHEET_TILE] };
  }, hex);
}

// `geometry` (a box or extruded outline, whose texture coordinates run in units) with its texture coordinates
// scaled to the corrugated sheet's tile, so its ribs are the same size on every part. Returns it.
export function inSheetTiles(geometry) {
  const { uv } = geometry.attributes;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) / SHEET_TILE, uv.getY(index) / SHEET_TILE);
  }
  return geometry;
}

// A steel member `size` thick from `from` to `to` ([x, y, z] each), its edges chamfered unless `plain` (thin
// lattice members, where a bevel would not show).
export function member(from, to, size, hex, plain = false) {
  const shape = plain ? new THREE.BoxGeometry(size, 1, size) : roundedBox(size, 1, size, size * 0.2, { chamfered: true });
  return coloured(between(shape, from, to), hex);
}

// The hangars' materials, made once per course (the kit's shared materials are one object for all its parts):
// { sheet, glass, steel }. `sheet` is corrugated metal tinted by vertex colour; `glass` the glazing's framed
// panes, see-through, so it casts no shadow and the sun reaches the floor through it.
const madeFor = new WeakMap();

export function hangarMaterials(kit) {
  if (!madeFor.has(kit.materials)) {
    const { keep } = kit;
    const sheetMaps = createCorrugatedMaps();
    const glazing = createGlazingMaps();
    madeFor.set(kit.materials, {
      sheet: keep(new THREE.MeshStandardMaterial({
        vertexColors: true, map: keep(sheetMaps.map), normalMap: keep(sheetMaps.normalMap), roughnessMap: keep(sheetMaps.roughnessMap),
        aoMap: keep(sheetMaps.aoMap), roughness: 1, metalness: 0.1,
      })),
      glass: keep(new THREE.MeshStandardMaterial({
        map: keep(glazing), transparent: true, depthWrite: false, roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide,
      })),
      steel: kit.materials.painted,
    });
  }
  return madeFor.get(kit.materials);
}

// One mesh of `geometry` in `material`; solid ones cast shadows and take them, see-through ones only take them.
export function hangarMesh(geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = !material.transparent;
  mesh.receiveShadow = true;
  return mesh;
}
