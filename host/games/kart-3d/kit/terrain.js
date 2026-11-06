// The airfield's ground (M9, Palm Bay Airport): a grid of square cells over the whole course, each cell land
// (grass and sand), sea bed, or paved (apron, tarmac, runway, hangar floor), at the heights airport-ground.js
// gives, and beside the road the ribbons of kit/terrain-ribbons.js, which meet the road's edges exactly. Under the
// road and its ribbons the land is let down a little, so it never shows through them; over the cutting it is cut
// away. Sea bed that lies wholly under the water is left out. Used by airport-scenery.js.

import * as THREE from 'three';
import { GROUND, CUTTING_HOLE, inRect, inSea, pavedKindAt, landHeightAt, seaBedAt, sandinessAt } from '../airport-ground.js';
import { createLandMaterial, createPavedMaterials, landShade, LAND_TILE, APRON_TILE, TARMAC_TILE } from './terrain-maps.js';
import { buildRibbons, createCorridor } from './terrain-ribbons.js';

// Land under the road's corridor is let down this far below it.
const LET_DOWN = 0.15;
// Sea bed cells whose corners all lie this deep are hidden by the sea and left out.
const HIDDEN_BELOW = -8.6;
const UV_TILES = { apron: APRON_TILE, hangar: APRON_TILE, tarmac: TARMAC_TILE, runway: TARMAC_TILE };

// Adds the ground to `kit.world` (kit/kit.js). Returns { meshes }: what it added.
export function buildTerrain(kit) {
  const { world, track, keep } = kit;
  const land = createMeshData(LAND_TILE);
  const corridor = createCorridor(track);
  const paved = createPavedMaterials(kit);
  const pavedData = new Map(Object.keys(paved).map((kind) => [kind, createMeshData(UV_TILES[kind])]));
  const columns = Math.round((GROUND.maxX - GROUND.minX) / GROUND.cell);
  const rows = Math.round((GROUND.maxZ - GROUND.minZ) / GROUND.cell);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      addCell(column, row, { land, pavedData, paved, corridor });
    }
  }
  const ribbons = createMeshData(LAND_TILE);
  const caps = buildRibbons(track, ribbons);
  const landMaterial = createLandMaterial(kit);
  const meshes = [
    new THREE.Mesh(keep(land.build(true)), landMaterial),
    new THREE.Mesh(keep(ribbons.build(true)), landMaterial),
    ...[...pavedData].filter(([, data]) => data.count() > 0).map(([kind, data]) => new THREE.Mesh(keep(data.build(false)), paved[kind].material)),
  ];
  meshes.forEach((mesh) => (mesh.receiveShadow = true));
  const capMaterial = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: kit.textures.concrete, normalMap: kit.textures.concreteRelief, roughness: 0.85, side: THREE.DoubleSide }));
  const capMesh = new THREE.Mesh(keep(caps.build()), capMaterial);
  capMesh.castShadow = true;
  capMesh.receiveShadow = true;
  meshes.push(capMesh);
  world.add(...meshes);
  return { meshes };
}

// One cell of the grid, its corners shared with the cells of the same sort round it.
function addCell(column, row, { land, pavedData, paved, corridor }) {
  const x = GROUND.minX + column * GROUND.cell;
  const z = GROUND.minZ + row * GROUND.cell;
  const [middleX, middleZ] = [x + GROUND.cell / 2, z + GROUND.cell / 2];
  const kind = pavedKindAt(middleX, middleZ);
  const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dz]) => [column + dx, row + dz, x + dx * GROUND.cell, z + dz * GROUND.cell]);
  if (kind) {
    const data = pavedData.get(kind);
    const tint = new THREE.Color(paved[kind].tint);
    const ids = corners.map(([i, j, cornerX, cornerZ]) => data.vertex(`${i},${j}`, () => ({ x: cornerX, y: 0, z: cornerZ, color: tint.clone().multiplyScalar(speckle(cornerX, cornerZ)) })));
    data.quad(...ids);
    return;
  }
  if (inRect(CUTTING_HOLE, middleX, middleZ)) {
    return;
  }
  const sea = inSea(middleX, middleZ);
  const heights = corners.map(([, , cornerX, cornerZ]) => (sea ? seaBedAt(cornerX, cornerZ) : landHeightAt(cornerX, cornerZ)));
  if (sea && heights.every((height) => height < HIDDEN_BELOW)) {
    return;
  }
  // A corner's height under the road's corridor is only worked out the first time the corner is made: the
  // corridor's lookup is the grid's slowest step.
  const ids = corners.map(([i, j, cornerX, cornerZ], index) => land.vertex(`${sea ? 'sea' : 'land'}${i},${j}`, () => {
    const height = heights[index];
    const under = sea ? null : corridor.lowestAt(cornerX, cornerZ);
    const y = under === null ? height : Math.min(height, under) - LET_DOWN;
    return { x: cornerX, y, z: cornerZ, color: landShade(height), sandy: sandinessAt(cornerX, cornerZ, height) };
  }));
  land.quad(...ids);
}

// A soft shade change from vertex to vertex (about 0.95 to 1.03), so the paving's tile does not show.
function speckle(x, z) {
  return 0.99 + 0.04 * Math.sin(x * 0.37 + z * 0.11) * Math.sin(z * 0.29 - x * 0.07);
}

// Collects a mesh's vertices (each made once per key, then shared) and triangles. `uvTile` is how many units
// the texture repeats over. Returns { vertex(key, make), quad(a, b, c, d, flip), count(), build(withSandy) }:
// vertex gives the vertex's number, calling make() -> { x, y, z, color, sandy (0 if not given) } only the first
// time a key is asked for; a quad's corners are its first and second corner across x (or out from the road), then
// the two beyond them.
export function createMeshData(uvTile) {
  const positions = [];
  const colors = [];
  const uvs = [];
  const sandy = [];
  const indices = [];
  const ids = new Map();
  function vertex(key, make) {
    if (!ids.has(key)) {
      const { x, y, z, color, sandy: sand = 0 } = make();
      ids.set(key, positions.length / 3);
      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
      uvs.push(x / uvTile, z / uvTile);
      sandy.push(sand);
    }
    return ids.get(key);
  }
  // Faces up when the second corner lies +x of the first and the third +z of it (or, flipped, the other way).
  function quad(first, second, third, fourth, flip = false) {
    indices.push(...(flip ? [first, second, third, second, fourth, third] : [first, third, second, second, third, fourth]));
  }
  function build(withSandy) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (withSandy) {
      geometry.setAttribute('sandy', new THREE.Float32BufferAttribute(sandy, 1));
    }
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }
  return { vertex, quad, count: () => indices.length, build };
}
