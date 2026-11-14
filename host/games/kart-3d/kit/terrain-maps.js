// The airfield ground's materials (M9, Palm Bay Airport): the land, grass and sand blended per vertex, the grass
// mown in stripes; the apron's pale concrete slabs with dark joints (the reference airport course's apron); and dark
// tarmac for the taxiway and the runway. Every material takes vertex colours, so the course's baked shade darkens
// the ground at the foot of walls. Used by kit/terrain.js.

import * as THREE from 'three';
import { createSurface } from './surface-maps.js';
import { createPixelImage } from './pixel-image.js';
import { createLayeredNoise } from '../noise.js';
import { createRandom, between } from '../random.js';
import { drawnOnce } from '../canvas-texture.js';

// The land's maps repeat every this many units; its sand comes in finer, and its grass is mown in stripes this
// wide, across x (the runway's way).
export const LAND_TILE = 6;
const STRIPE_WIDTH = 6;
// The kit's sand map is pale: tinted warm, as the beach islands' sand is (linear colour).
const SAND_TINT = '0.95, 0.82, 0.55';
// The apron's tile: SLABS by SLABS slabs, each SLAB units square, drawn at this many pixels a unit.
export const APRON_TILE = 16;
const SLAB = 4;
const APRON_PIXELS = 24;
export const TARMAC_TILE = 8;
const TARMAC_SIZE = 256;
// Paved ground lies flat under the road at the same height, so it is pushed back a little to lose there.
const PUSHED_BACK = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 };

// The land: the grass map (the kit's), and the sand's mixed in where the vertex's `sandy` attribute says (0 to 1);
// the grass a shade lighter and darker in alternate mown stripes, and in broad patches (the same map read
// thirteen times larger), so the big fields do not show their tile. Where grass meets sand the grass map's own
// blades and patches break the line up, as grass thinning out over sand.
export function createLandMaterial({ keep, textures }) {
  const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.grass, roughness: 0.95 }));
  material.onBeforeCompile = (shader) => {
    shader.uniforms.sandMap = { value: textures.sand };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float sandy;\nvarying float vSandy;\nvarying vec2 vGround;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSandy = sandy;\nvGround = position.xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D sandMap;\nvarying float vSandy;\nvarying vec2 vGround;')
      .replace('#include <map_fragment>', `
        vec4 grass = texture2D(map, vMapUv);
        float broad = texture2D(map, vMapUv * 0.077).g;
        float stripe = smoothstep(0.42, 0.58, abs(fract(vGround.x / ${(2 * STRIPE_WIDTH).toFixed(1)}) - 0.5) * 2.0);
        grass.rgb *= (0.93 + 0.1 * stripe) * (0.7 + 0.6 * broad);
        vec4 sand = texture2D(sandMap, vMapUv) * vec4(${SAND_TINT}, 1.0);
        float sandShare = smoothstep(0.3, 0.7, vSandy + (broad - 0.5) * 0.6 + (grass.g - 0.35) * 0.5);
        diffuseColor *= mix(grass, sand, sandShare);`);
  };
  material.customProgramCacheKey = () => 'airport-land';
  return material;
}

// The land's vertex colour at `height`: darker as the sand gets wet toward the water line.
export function landShade(height) {
  const wet = Math.min(Math.max((-6.6 - height) / 1.4, 0), 1);
  return new THREE.Color(1, 1, 1).multiplyScalar(1 - 0.32 * wet * wet * (3 - 2 * wet));
}

// The paved kinds' materials and tints: { apron, tarmac, runway, hangar } each { material, tint } (a hex that
// multiplies the vertex colour). The runway is the taxiway's tarmac a little darker, the hangar's floor the
// apron's slabs a little greyer.
export function createPavedMaterials({ keep }) {
  const apronMaps = Object.values(drawnOnce('apron', createApronMaps)).map(keep);
  const [map, normalMap, aoMap, roughnessMap] = apronMaps;
  const apron = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map, normalMap, aoMap, roughnessMap, roughness: 1, ...PUSHED_BACK }));
  const tarmacMaps = drawnOnce('tarmac', createTarmacMaps);
  keep(tarmacMaps.map);
  keep(tarmacMaps.normalMap);
  const tarmac = keep(new THREE.MeshStandardMaterial({ vertexColors: true, ...tarmacMaps, roughness: 0.9, ...PUSHED_BACK }));
  return {
    apron: { material: apron, tint: 0xffffff },
    hangar: { material: apron, tint: 0xd6dade },
    tarmac: { material: tarmac, tint: 0xffffff },
    runway: { material: tarmac, tint: 0xdcdcdc },
  };
}

// Pale concrete slabs, each a slightly different shade, with dark sealed joints between them, weathered with
// soft stains and fine grit. Returns { map, normalMap, aoMap, roughnessMap }.
function createApronMaps() {
  const random = createRandom(83);
  const surface = createSurface(APRON_TILE, APRON_TILE, APRON_PIXELS, { color: [222, 218, 207], roughness: 0.8, base: 120 });
  const slabs = APRON_TILE / SLAB;
  for (let row = 0; row < slabs; row += 1) {
    for (let column = 0; column < slabs; column += 1) {
      const tone = between(random, -10, 8);
      const color = [224 + tone, 220 + tone, 208 + tone];
      surface.panel({ left: column * SLAB, bottom: row * SLAB, width: SLAB, height: SLAB }, { lift: 10, bevel: 0.06, paint: { color, roughness: between(random, 0.72, 0.86) } });
    }
  }
  const stains = createLayeredNoise(random, 3, 2);
  const size = surface.width;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const stain = Math.max(0, stains(x / size, y / size) - 0.45) * 1.4;
      const grit = random() - 0.5;
      surface.colors.mix(x, y, [150, 148, 140], stain * 0.5 + grit * 0.12);
      surface.setHeight(x, y, surface.heightAt(x, y) + grit * 14);
    }
  }
  const joint = { size: 0.1, depth: 40, color: [96, 94, 90], amount: 0.75, roughness: 0.95 };
  for (let line = 0; line < APRON_TILE; line += SLAB) {
    surface.groove([0, line], [APRON_TILE, line], joint);
    surface.groove([line, 0], [line, APRON_TILE], joint);
  }
  for (let index = 0; index < 900; index += 1) {
    const [x, y] = [random() * size, random() * size];
    surface.colors.dot(x, y, between(random, 0.4, 1.1), random() < 0.5 ? [176, 174, 166] : [232, 232, 226]);
  }
  return surface.toMaps({ depth: 6, shade: { reach: 0.15, strength: 1.5 }, repeat: true });
}

// Dark tarmac: fine grey aggregate, lighter and darker stones in it, and broad patches where it has worn paler.
// Returns { map, normalMap }.
function createTarmacMaps() {
  const random = createRandom(89);
  const image = createPixelImage(TARMAC_SIZE, TARMAC_SIZE);
  const heights = createPixelImage(TARMAC_SIZE, TARMAC_SIZE);
  const patches = createLayeredNoise(random, 3, 3);
  image.fill((x, y) => {
    const value = 132 + (patches(x / TARMAC_SIZE, y / TARMAC_SIZE) - 0.5) * 12 + (random() - 0.5) * 26;
    return [value, value * 0.98, value * 0.94];
  });
  heights.fill(() => {
    const value = 128 + (random() - 0.5) * 70;
    return [value, value, value];
  });
  for (let index = 0; index < 2400; index += 1) {
    const [x, y, radius] = [random() * TARMAC_SIZE, random() * TARMAC_SIZE, between(random, 0.4, 1.2)];
    image.dot(x, y, radius, random() < 0.6 ? [150, 148, 144] : [52, 52, 56]);
    heights.dot(x, y, radius, [220, 220, 220]);
  }
  return { map: image.toTexture(), normalMap: heights.toReliefTexture({ depth: 1.5 }) };
}
