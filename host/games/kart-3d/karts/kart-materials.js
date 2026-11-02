// The materials the karts are drawn with (M7d5), one per kind of surface rather than one per colour, since the
// host pays for every draw call: glossy clear-coated paint, matte, skin (a faint warm glow), cloth (a weave and a
// soft sheen) and metal (all five coloured per vertex, shared by every kart), one decal material per design (its emblem), and one wheel material per kart, whose rims
// glow cyan as far as that kart's wheels have turned flat for anti-gravity. Used by kart-models.js.

import * as THREE from 'three';
import { createCanvas, canvasTexture } from '../canvas-texture.js';
import { createWheelMaps } from './wheel-maps.js';
import { createWeaveMap } from './cloth-weave.js';

const EMBLEM_SIZE = 256;
const SKIN_GLOW_HEX = 0xffa47a;
const SKIN_GLOW = 0.22;
const GLOW_HEX = 0x2ee6ff;
// How bright the rims glow when the wheels are flat: above 1, so bloom (High quality) spreads it.
const GLOW_BRIGHTNESS = 2.2;

// `designs` is kart-designs.js's KART_DESIGNS, `kartCount` how many karts are drawn. Returns { byKind (glossy,
// matte, skin, cloth, metal), decals (one per design), wheels (one per kart), setGlow(kartIndex, share), dispose() }.
export function createKartMaterials(designs, kartCount) {
  // The clear coat is not quite a mirror: a perfectly sharp one turns the low sun into a glare far brighter than
  // anything else, which bloom then spreads over the whole kart.
  const byKind = {
    glossy: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.25 }),
    matte: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }),
    // Faces sit in the shade of their own caps and of the kart; a faint warm glow keeps them peach, as the
    // references' faces are, instead of greying.
    skin: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: SKIN_GLOW_HEX, emissiveIntensity: SKIN_GLOW }),
    // Sheen is the soft bright rim fabric shows where it turns away from the eye.
    cloth: new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.85, sheen: 1, sheenRoughness: 0.45, sheenColor: 0xffffff,
      normalMap: createWeaveMap(), normalScale: new THREE.Vector2(0.6, 0.6),
    }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 1 }),
  };
  const emblems = designs.map(drawEmblemTexture);
  const decals = emblems.map((map) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.25 }));
  const wheelMaps = createWheelMaps();
  const wheels = Array.from({ length: kartCount }, () =>
    new THREE.MeshStandardMaterial({
      map: wheelMaps.map,
      normalMap: wheelMaps.normalMap,
      roughnessMap: wheelMaps.surfaceMap,
      metalnessMap: wheelMaps.surfaceMap,
      roughness: 1,
      metalness: 1,
      emissive: GLOW_HEX,
      emissiveMap: wheelMaps.emissiveMap,
      emissiveIntensity: 0,
    }),
  );

  // `share` is how far the kart's wheels have turned flat, eased (0 to 1).
  function setGlow(kartIndex, share) {
    wheels[kartIndex].emissiveIntensity = share * GLOW_BRIGHTNESS;
  }

  function dispose() {
    [...Object.values(byKind), ...decals, ...wheels].forEach((material) => material.dispose());
    [...emblems, ...Object.values(wheelMaps), byKind.cloth.normalMap].forEach((texture) => texture.dispose());
  }

  return { byKind, decals, wheels, setGlow, dispose };
}

function drawEmblemTexture(design) {
  const { canvas, context } = createCanvas(EMBLEM_SIZE, EMBLEM_SIZE);
  design.drawEmblem(context, EMBLEM_SIZE);
  return canvasTexture(canvas);
}
