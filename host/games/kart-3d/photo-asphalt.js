// The photo-scanned asphalt (M7d4b2, which chose it over our own drawn one): ambientCG's
// Asphalt 023 S (CC0, listed in assets/manifest.json), a fine grey asphalt with light and dark stones, as four 1K
// JPG maps: colour, normal (OpenGL's convention, which Three.js uses), roughness and ambient occlusion. Loaded by
// the game's load(), before the race starts, and laid on the road's asphalt by kit/road.js. Used by host/games/kart-3d/index.js.

import * as THREE from 'three';

const FOLDER = '/assets/textures/';
const FILES = {
  map: 'Asphalt023S_1K-JPG_Color.jpg',
  normalMap: 'Asphalt023S_1K-JPG_NormalGL.jpg',
  roughnessMap: 'Asphalt023S_1K-JPG_Roughness.jpg',
  aoMap: 'Asphalt023S_1K-JPG_AmbientOcclusion.jpg',
};
// The scan is 1.25 m square. A kart is 2 units long, about a real kart's length, so a unit is about a metre; the
// tile is drawn 4 times larger than life, 5 units across, so its stones show from the chase camera as MK8DX's
// coarse asphalt does (at 3 units the road read as smooth). The road's texture coordinates count one repeat
// every 8 units (strip-builder.js).
const REPEAT = 8 / 5;

// Returns a promise of { map, normalMap, roughnessMap, aoMap }: repeating textures, sharp at low angles, the
// colour read as sRGB and the rest as data. The renderer frees them when the game stops.
export async function loadPhotoAsphalt() {
  const loader = new THREE.TextureLoader();
  const entries = await Promise.all(
    Object.entries(FILES).map(async ([slot, file]) => {
      const texture = await loader.loadAsync(FOLDER + file);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(REPEAT, REPEAT);
      texture.anisotropy = 8;
      texture.colorSpace = slot === 'map' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      return [slot, texture];
    }),
  );
  return Object.fromEntries(entries);
}
