// The bay's rocky islands (M9, Palm Bay Airport; built to "M9: rock study" in docs/3d-findings.md), a landmark:
// limestone masses of flat facets stacked in strata, notched at the waterline with fallen blocks round the foot,
// a thick grass cap hanging over the cliffs with bushes and a few palms, a beach in the lee, and turquoise
// shallows and foam round it. Each seed gives its own island: a sea stack with smaller stacks (seed 1, 4, ...), a
// flat-topped mesa with a beach (2, 5, ...) or huddled karst peaks (3, 6, ...). Planned in kit/rock-island-plan.js
// (its masses in kit/rock-island-mass.js), its shapes built in kit/rock-island-cliffs.js, kit/rock-island-top.js and
// kit/rock-island-water.js, its rock drawn in kit/rock-island-maps.js. Used by the airport's dressing
// (airport-scenery.js) and kit-shots (host/kit-shots/airport-l-pieces.js).
//
// It stands on its origin: its middle at (0, 0), y = 0 the sea's surface (place it at the sea's level), its beach
// toward +x.

import * as THREE from 'three';
import { buildPalm } from './palm.js';
import { planRockIsland, capPoint, beachPoint } from './rock-island-plan.js';
import { buildRockFacets } from './rock-island-cliffs.js';
import { buildIslandTop } from './rock-island-top.js';
import { buildIslandWater, shallowsReach } from './rock-island-water.js';
import { islandRockMaterial } from './rock-island-maps.js';

// The water's see-through amount swells and fades once every this many seconds, as the surf comes and goes.
const SURF_SECONDS = 4.3;

// The island's shapes for `{ seed, size }` (size: its radius at the waterline, in units): { parts: { rock, grass,
// sand, water }, palms: [{ x, y, z, turn, size }] } (sand null without a beach). Needs no canvas, so the unit
// tests can count its triangles.
export function rockIslandGeometry({ seed, size }) {
  const island = planRockIsland({ seed, size });
  const { grass, sand } = buildIslandTop(island, seed);
  const parts = { rock: buildRockFacets(island, seed), grass, sand, water: buildIslandWater(island) };
  return { parts, palms: palmSpots(island) };
}

// What the island covers seen from above (a circle round its origin, shallows included) and how tall its rock
// and grass stand above the water (its bushes and palms stand higher), for the dressing's layout.
export function rockIslandFootprint({ seed, size }) {
  const island = planRockIsland({ seed, size });
  return { radius: shallowsReach(island), height: Math.max(...island.masses.map((mass) => capPoint(mass, 0, 0)[1])) };
}

// `kit` is the course's kit (kit/kit.js). Returns { object, update(dt) }: the island as a group, and the surf
// coming and going.
export function buildRockIsland(kit, { seed, size }) {
  const { parts, palms } = rockIslandGeometry({ seed, size });
  const materials = islandMaterials(kit);
  const object = new THREE.Group();
  for (const [name, geometry] of Object.entries(parts)) {
    if (geometry) {
      const mesh = new THREE.Mesh(kit.keep(geometry), materials[name]);
      // See-through water casts no shadow and takes none.
      mesh.castShadow = name !== 'water';
      mesh.receiveShadow = name !== 'water';
      object.add(mesh);
    }
  }
  object.add(...buildPalms(kit, palms));
  let time = 0;
  function update(dt) {
    time += dt;
    materials.water.opacity = 0.85 + 0.15 * Math.sin((2 * Math.PI * time) / SURF_SECONDS);
  }
  return { object, update };
}

// Each palm on its cap or beach: { x, y, z, turn, size }, standing a little sunk into the ground.
function palmSpots(island) {
  return island.palms.map((palm) => {
    const [x, y, z] = palm.beach === undefined ? capPoint(island.masses[palm.mass], palm.corner, palm.share) : beachPoint(island, palm.corner, palm.beach);
    return { x, y: y - 0.2, z, turn: palm.turn, size: palm.size };
  });
}

// The kit's palm (kit/palm.js), its two geometries shared by every island of the course, drawn as one instanced
// mesh each per island.
const palmGeometries = new WeakMap();

function buildPalms(kit, spots) {
  if (!palmGeometries.has(kit.keep)) {
    const { trunk, fronds } = buildPalm();
    palmGeometries.set(kit.keep, { trunk: kit.keep(trunk), fronds: kit.keep(fronds) });
  }
  const geometries = palmGeometries.get(kit.keep);
  const matrix = new THREE.Matrix4();
  const turn = new THREE.Quaternion();
  return [[geometries.trunk, kit.palm.trunk], [geometries.fronds, kit.palm.fronds]].map(([geometry, material]) => {
    const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
    spots.forEach((spot, index) => {
      turn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.turn);
      mesh.setMatrixAt(index, matrix.compose(new THREE.Vector3(spot.x, spot.y, spot.z), turn, new THREE.Vector3(spot.size, spot.size, spot.size)));
    });
    mesh.castShadow = true;
    return mesh;
  });
}

// The islands' materials, made once per course (keyed by its keep, as kit/rock-island-maps.js's rock): the rock,
// the grass and sand with the kit's textures, and the see-through water.
const courseMaterials = new WeakMap();

function islandMaterials(kit) {
  const { keep, textures } = kit;
  if (!courseMaterials.has(keep)) {
    courseMaterials.set(keep, {
      rock: islandRockMaterial(kit),
      grass: keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.grass, roughness: 0.95 })),
      sand: keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.sand, roughness: 0.9 })),
      // Drawn after what is under it and seen through: it must not hide it in the depth buffer.
      water: keep(new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, depthWrite: false, roughness: 0.3 })),
    });
  }
  return courseMaterials.get(keep);
}
