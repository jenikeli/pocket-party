// The kit's road (M7d2), built from the same stations the kart rules drive on, so what is drawn is exactly where
// karts drive: textured asphalt with large lighter and darker patches (so its tile does not show), riveted metal
// in anti-gravity sections, grass shoulders mown in stripes, concrete underneath and down the sides, and on top
// the paint (kit/road-paint.js), the LED panels (kit/led-panels.js) and the ramp plates (kit/ramp-plate.js).
// Walls are not drawn here: a course's barriers stand on them (kit/barriers.js). Gaps are left empty.
// Used by a kit-dressed course's scenery (see scenery.js).

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { createTileNoise } from '../noise.js';
import { createRandom } from '../random.js';
import { createAsphaltTexture, createMetalTexture, createGrassTexture } from './road-textures.js';
import { createConcreteTexture } from './concrete.js';
import { buildRoadPaint } from './road-paint.js';
import { buildLedPanels } from './led-panels.js';
import { buildRampPlates } from './ramp-plate.js';

// The road's thickness, under its surface: what holds it up (kit/supports.js) starts below this.
export const ROAD_THICKNESS = 0.6;
// The asphalt is drawn in this many lanes across, so its patches can vary across the road too.
const ASPHALT_LANES = 8;
// Patches about this many units across, big and small; laid over the lap so they repeat once a lap.
const BIG_PATCH = 18;
const SMALL_PATCH = 5;
const PATCH_ACROSS = 48;
const MOWN_STATIONS = 4;
const COLORS = { metal: 0xc4d8ff, grass: 0xffffff, grassMown: 0xd8ecc8, concrete: 0xc8c2b8 };

// `theme` is the course's road colours: { asphalt, edgeLine, curb: [first, second], checks: [light, dark] }.
// Returns { meshes, update(dt), dispose() }.
export function buildKitRoad(track, theme) {
  const textures = {
    asphalt: createAsphaltTexture(),
    metal: createMetalTexture(),
    grass: createGrassTexture(),
    concrete: createConcreteTexture(),
  };
  const builders = Object.fromEntries(Object.keys(textures).map((name) => [name, createStripBuilder()]));
  const shadeOf = createPatchShade(track);
  track.stations.forEach((station, index) => {
    if (station.gap) {
      return;
    }
    const segment = { station, next: track.stations[(index + 1) % track.stations.length], index };
    if (station.antiGravity) {
      addLanes(builders.metal, segment, COLORS.metal, 4);
    } else {
      addLanes(builders.asphalt, segment, theme.asphalt, ASPHALT_LANES, shadeOf);
    }
    addShoulders(builders.grass, segment);
    addUnderside(builders.concrete, segment);
  });
  const roughness = { asphalt: 0.85, metal: 0.4, grass: 0.95, concrete: 0.9 };
  const surfaces = Object.keys(textures).map((name) => {
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, map: textures[name], roughness: roughness[name], metalness: name === 'metal' ? 0.5 : 0 });
    const mesh = new THREE.Mesh(builders[name].build(), material);
    mesh.receiveShadow = true;
    return mesh;
  });
  const paint = buildRoadPaint(track, theme);
  const panels = buildLedPanels(track);
  const plates = buildRampPlates(track);

  function dispose() {
    for (const mesh of surfaces) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    Object.values(textures).forEach((texture) => texture.dispose());
    [paint, panels, plates].forEach((part) => part.dispose());
  }

  return { meshes: [...surfaces, ...paint.meshes, ...panels.meshes, ...plates.meshes], update: panels.update, dispose };
}

// shadeOf(s, lateral): how much lighter or darker the asphalt is there, about 0.8 to 1.15: big soft patches,
// smaller ones on top, and a slightly darker band down the middle where karts drive most.
function createPatchShade(track) {
  const random = createRandom(59);
  const big = createTileNoise(random, Math.round(track.length / BIG_PATCH), Math.round(PATCH_ACROSS / BIG_PATCH));
  const small = createTileNoise(random, Math.round(track.length / SMALL_PATCH), Math.round(PATCH_ACROSS / SMALL_PATCH));
  return (s, lateral) => {
    const x = s / track.length;
    const y = lateral / PATCH_ACROSS;
    const band = 0.06 * Math.exp(-((lateral / 4) ** 2));
    return 0.8 + 0.25 * big(x, y) + 0.1 * small(x, y) - band;
  };
}

// The road between its edges in `lanes` strips across, so a shade can change across it.
function addLanes(builder, segment, hex, lanes, shadeOf) {
  const up = (station) => station.normal;
  for (let lane = 0; lane < lanes; lane += 1) {
    const from = (station) => station.halfWidth * (-1 + (2 * lane) / lanes);
    const to = (station) => station.halfWidth * (-1 + (2 * (lane + 1)) / lanes);
    builder.strip(segment, from, 0, to, 0, up, hex, { shadeOf });
  }
}

// Each side's grass between its edges at both stations (shoulders ease in and out, see track-builder.js).
function addShoulders(builder, segment) {
  const up = (station) => station.normal;
  const { station, next } = segment;
  const hex = Math.floor(segment.index / MOWN_STATIONS) % 2 === 0 ? COLORS.grassMown : COLORS.grass;
  if (station.shoulderLeft > 0 || next.shoulderLeft > 0) {
    builder.strip(segment, (at) => -at.halfWidth - at.shoulderLeft, 0, (at) => -at.halfWidth, 0, up, hex);
  }
  if (station.shoulderRight > 0 || next.shoulderRight > 0) {
    builder.strip(segment, (at) => at.halfWidth, 0, (at) => at.halfWidth + at.shoulderRight, 0, up, hex);
  }
}

// The bottom of the road (facing down: drawn right to left so its front faces away from the top), and its side
// faces at the outer edges of the ground, from the top down to the bottom.
function addUnderside(builder, segment) {
  const edge = (side) => (station) => side * (station.halfWidth + (side > 0 ? station.shoulderRight : station.shoulderLeft));
  const down = (station) => ({ x: -station.normal.x, y: -station.normal.y, z: -station.normal.z });
  builder.strip(segment, edge(1), -ROAD_THICKNESS, edge(-1), -ROAD_THICKNESS, down, COLORS.concrete);
  for (const side of [-1, 1]) {
    const outward = (station) => ({ x: station.right.x * side, y: station.right.y * side, z: station.right.z * side });
    const [first, second] = side > 0 ? [0, -ROAD_THICKNESS] : [-ROAD_THICKNESS, 0];
    builder.strip(segment, edge(side), first, edge(side), second, outward, COLORS.concrete);
  }
}
