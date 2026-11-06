// The airport's shore water (M9, Palm Bay Airport), as off the kit's beach islands: turquoise shallows over the
// sand shelving off the beaches, fading into the deep blue, the whole bay shallow and pale; white foam where the
// water meets the sand, and where it laps at the seawalls' feet, coming and going. Both are see-through sheets
// lying just on the sea, tinted per vertex with their own see-through amount. Used by airport-scenery.js.

import * as THREE from 'three';
import { inSea, inRect, seaBedAt, distanceToBeach, landHeightAt, BAY, SEAWALLS, GROUND } from '../airport-ground.js';

// The shallows reach this far from a beach's edge, drawn in cells this big; the foam in finer ones, within a
// band this far either side of the beach's edge plus the shelf's water line.
const SHALLOWS_REACH = 36;
const SHALLOWS_CELL = 2;
const FOAM_CELL = 1;
const FOAM_BAND = [3, 12];
const NEAR = new THREE.Color(0x46dccb);
const FAR = new THREE.Color(0x2b9fc4);
// The foam comes and goes once every this many seconds.
const FOAM_SECONDS = 3.7;
const WALL_FOAM_REACH = 1.2;
// The shallows and the beaches' foam are drawn over this part of the grid.
const SHORE_AREA = Object.freeze({ fromX: -100, toX: 200, fromZ: 96, toZ: 324 });

// Adds the shallows and the foam to `kit.world` (kit/kit.js); the sea's surface is at `seaLevel`. Returns
// { update(dt) }.
export function buildShoreWater({ world, keep }, seaLevel) {
  const shallowsMaterial = keep(createWaterMaterial(0.15, 'airport-shallows'));
  const foamMaterial = keep(createWaterMaterial(0.6, 'airport-foam'));
  const shallows = new THREE.Mesh(keep(buildShallows(seaLevel)), shallowsMaterial);
  const foam = new THREE.Mesh(keep(buildFoam(seaLevel)), foamMaterial);
  foam.renderOrder = 1;
  world.add(shallows, foam);
  let time = 0;
  return {
    update(dt) {
      time += dt;
      foamMaterial.opacity = 0.8 + 0.2 * Math.sin((2 * Math.PI * time) / FOAM_SECONDS);
    },
  };
}

// The shallows' sheet: turquoise near the beaches, fading out to sea; the whole bay at least half turquoise.
function buildShallows(seaLevel) {
  const sheet = createSheet();
  const wanted = (x, z) => inSea(x, z) && (distanceToBeach(x, z) < SHALLOWS_REACH || inRect(BAY, x, z));
  eachCell(SHORE_AREA, SHALLOWS_CELL, wanted, (x, z) => {
    const near = 1 - smoothstep(Math.min(Math.max((distanceToBeach(x, z) - 7) / (SHALLOWS_REACH - 7), 0), 1));
    const amount = inRect(BAY, x, z) ? Math.max(near, 0.5) : near;
    return { color: FAR.clone().lerp(NEAR, amount), alpha: 0.75 * amount };
  }, sheet, seaLevel + 0.04);
  return sheet.build();
}

// The foam's sheet: along the beaches where the sea bed meets the water, and at the seawalls' feet.
function buildFoam(seaLevel) {
  const sheet = createSheet();
  const white = new THREE.Color(0xffffff);
  const wanted = (x, z) => inSea(x, z) && distanceToBeach(x, z) > FOAM_BAND[0] && distanceToBeach(x, z) < FOAM_BAND[1];
  eachCell(SHORE_AREA, FOAM_CELL, wanted, (x, z) => {
    const depth = seaLevel - seaBedAt(x, z);
    return { color: white, alpha: 0.9 * Math.max(0, 1 - Math.abs(depth - 0.12) / 0.4) * patchy(x + z) };
  }, sheet, seaLevel + 0.07);
  addWallFoam(sheet, seaLevel + 0.07, seaLevel);
  return sheet.build();
}

// A see-through material coloured by each vertex's `tint` (colour and see-through amount). Not the usual vertex
// colours: the course's baked shade (baked-shade.js) darkens every mesh coloured per vertex, and water, lying
// open on the sea, should not go grey at the foot of the seawalls.
function createWaterMaterial(roughness, cacheKey) {
  const material = new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, roughness, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 tint;\nvarying vec4 vTint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = tint;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor *= vTint;');
  };
  material.customProgramCacheKey = () => cacheKey;
  return material;
}

// Calls `colourAt(x, z)` -> { color, alpha } at the corners of every `size` cell in `area` whose middle passes
// `wanted`, and adds those cells to `sheet` at height `y`.
function eachCell(area, size, wanted, colourAt, sheet, y) {
  for (let z = area.fromZ; z < area.toZ; z += size) {
    for (let x = area.fromX; x < area.toX; x += size) {
      if (wanted(x + size / 2, z + size / 2)) {
        const ids = [[x, z], [x + size, z], [x, z + size], [x + size, z + size]].map(([cornerX, cornerZ]) => {
          const { color, alpha } = colourAt(cornerX, cornerZ);
          return sheet.vertex(`${size}:${cornerX},${cornerZ}`, cornerX, y, cornerZ, color, alpha);
        });
        sheet.quad(...ids);
      }
    }
  }
}

// Foam along each seawall's foot where the wall stands above the water, fading out to sea.
function addWallFoam(sheet, y, seaLevel) {
  const white = new THREE.Color(0xffffff);
  for (const { from, to, seaward } of SEAWALLS) {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const along = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
    for (let distance = 0; distance < length; distance += GROUND.cell) {
      const ends = [distance, Math.min(distance + GROUND.cell, length)].map((at) => [from[0] + along[0] * at, from[1] + along[1] * at]);
      if (ends.every(([x, z]) => landHeightAt(x, z) < seaLevel)) {
        continue;
      }
      const ids = ends.flatMap(([x, z], index) => {
        const at = distance + index * GROUND.cell;
        const foot = sheet.vertex(`wall:${x},${z}`, x + seaward[0] * 0.02, y, z + seaward[1] * 0.02, white, 0.85 * patchy(at));
        const out = sheet.vertex(`wall-out:${x},${z}`, x + seaward[0] * WALL_FOAM_REACH, y, z + seaward[1] * WALL_FOAM_REACH, white, 0);
        return [foot, out];
      });
      sheet.quad(ids[0], ids[2], ids[1], ids[3]);
    }
  }
}

// 0.1 to 1, changing along the shore, so foam reads as breaking surf rather than a painted line.
function patchy(along) {
  return 0.55 + 0.45 * Math.sin(along * 0.9) * Math.sin(along * 0.37 + 1);
}

// A flat sheet's vertices (each made once per key) with a colour and a see-through amount each (its `tint`), and
// its triangles, facing up either way round (drawn from both sides).
function createSheet() {
  const positions = [];
  const colors = [];
  const indices = [];
  const ids = new Map();
  return {
    vertex(key, x, y, z, color, alpha) {
      if (!ids.has(key)) {
        ids.set(key, positions.length / 3);
        positions.push(x, y, z);
        colors.push(color.r, color.g, color.b, alpha);
      }
      return ids.get(key);
    },
    quad(first, second, third, fourth) {
      indices.push(first, third, second, second, third, fourth);
    },
    build() {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(positions.map((unused, index) => (index % 3 === 1 ? 1 : 0)), 3));
      geometry.setAttribute('tint', new THREE.Float32BufferAttribute(colors, 4));
      geometry.setIndex(indices);
      return geometry;
    },
  };
}

function smoothstep(share) {
  return share * share * (3 - 2 * share);
}
