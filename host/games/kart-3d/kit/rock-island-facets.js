// A list of flat facets for a rocky island's rock (M9): triangles each with its own corners, so the rock is
// flat-shaded (planes, not blobs, as "Rock study" in docs/3d-findings.md found), with texture coordinates laid
// on from the side each facet faces most, so the rock's strata (kit/rock-island-maps.js) stay level across the
// walls. Used by kit/rock-island-cliffs.js.

import * as THREE from 'three';

// The rock's maps are laid on in tiles this many units square.
const ROCK_TILE = 12;

// Returns { add(a, b, c, away, color), toGeometry() }: add takes three corners ([x, y, z]), turns the triangle to
// face `away` ([x, y, z]) if given (keeps its winding if null) and skips it if it has no area; toGeometry makes
// the indexed geometry with positions, normals, colours and texture coordinates.
export function createFacets() {
  const lists = { positions: [], normals: [], colors: [], uvs: [] };
  return { add: (a, b, c, away, color) => addFacet(lists, [a, b, c], away, color), toGeometry: () => toGeometry(lists) };
}

const edge1 = new THREE.Vector3();
const edge2 = new THREE.Vector3();
const normal = new THREE.Vector3();

function addFacet(lists, [a, b, c], away, color) {
  edge1.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  edge2.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  normal.crossVectors(edge1, edge2);
  if (normal.lengthSq() < 1e-10) {
    return;
  }
  normal.normalize();
  const flip = away && normal.x * away[0] + normal.y * away[1] + normal.z * away[2] < 0;
  if (flip) {
    normal.negate();
  }
  for (const corner of flip ? [a, c, b] : [a, b, c]) {
    lists.positions.push(...corner);
    lists.normals.push(normal.x, normal.y, normal.z);
    lists.colors.push(color.r, color.g, color.b);
    lists.uvs.push(...uvFor(corner));
  }
}

function toGeometry({ positions, normals, colors, uvs }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(Array.from({ length: positions.length / 3 }, (_, index) => index));
  return geometry;
}

// A corner's texture coordinates, projected along the axis the facet (`normal`) faces most: a level facet takes
// x and z, an upright one its height for v, so the strata run level.
function uvFor([x, y, z]) {
  const [across, up] = [Math.abs(normal.x), Math.abs(normal.z)];
  if (Math.abs(normal.y) > Math.max(across, up)) {
    return [x / ROCK_TILE, z / ROCK_TILE];
  }
  return [(across > up ? z : x) / ROCK_TILE, y / ROCK_TILE];
}
