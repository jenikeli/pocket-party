// The M6a spike's materials, each in two versions so the panel can measure the glossy look against a plain
// one: plain is Lambert (simple diffuse light), glossy is physically based with reflections of an environment
// map (karts also get a clear-coat layer, the toy-like shine of MK8DX's karts). Used by the scene builders.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PLAYER_COLORS } from '/host/roster.js';

// The 9 roster colours, then three more for the rest of a 12-kart field.
const KART_COLORS = [...PLAYER_COLORS, 0xecf0f1, 0x34495e, 0x8e5a2b];

// name -> { color, roughness, metalness, coat, stripes }. coat marks the kart paint; stripes the curb, whose red
// and white come from vertex colours (see world.js), so its own colour is white.
const LOOKS = {
  road: { color: 0x4a4e57, roughness: 0.7, metalness: 0 },
  curb: { color: 0xffffff, roughness: 0.5, metalness: 0, stripes: true },
  bank: { color: 0x6f8f3a, roughness: 0.95, metalness: 0 },
  ground: { color: 0x7fbf4a, roughness: 0.95, metalness: 0 },
  trunk: { color: 0x7a5230, roughness: 0.9, metalness: 0 },
  leaves: { color: 0x2f8f3a, roughness: 0.8, metalness: 0 },
  kartTrim: { color: 0x22252c, roughness: 0.4, metalness: 0.6 },
  tyre: { color: 0x15161a, roughness: 0.85, metalness: 0 },
  skin: { color: 0xf2c49b, roughness: 0.6, metalness: 0 },
  ...Object.fromEntries(KART_COLORS.map((color, index) => [`kart${index}`, { color, roughness: 0.3, metalness: 0.1, coat: true }])),
};

// Builds both versions of every look, plus the environment map the glossy ones reflect.
// Returns { forMesh(mesh, name), setGlossy(scene, glossy), refresh(), dispose() }.
export function createMaterials(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const pairs = {};
  for (const [name, look] of Object.entries(LOOKS)) {
    pairs[name] = { plain: plainMaterial(look), glossy: glossyMaterial(look) };
  }
  let glossy = false;

  // Remembers which look the mesh uses, so setGlossy can swap it later.
  function forMesh(mesh, name) {
    mesh.userData.look = name;
    mesh.material = pairs[name][glossy ? 'glossy' : 'plain'];
    return mesh;
  }

  function setGlossy(scene, isGlossy) {
    glossy = isGlossy;
    scene.environment = glossy ? environment : null;
    // The reflections only add shine: the sun and sky light the scene already.
    scene.environmentIntensity = 0.35;
    scene.traverse((object) => {
      if (object.userData.look) {
        object.material = pairs[object.userData.look][glossy ? 'glossy' : 'plain'];
      }
    });
  }

  // Three.js builds each material's shader for the lights and shadows it was first drawn with; after the
  // shadows switch changes, every material has to be rebuilt.
  function refresh() {
    for (const pair of Object.values(pairs)) {
      pair.plain.needsUpdate = true;
      pair.glossy.needsUpdate = true;
    }
  }

  function dispose() {
    environment.dispose();
    for (const pair of Object.values(pairs)) {
      pair.plain.dispose();
      pair.glossy.dispose();
    }
  }

  return { forMesh, setGlossy, refresh, dispose };
}

function plainMaterial(look) {
  return new THREE.MeshLambertMaterial({ color: look.color, vertexColors: Boolean(look.stripes) });
}

function glossyMaterial(look) {
  if (look.coat) {
    return new THREE.MeshPhysicalMaterial({
      color: look.color,
      roughness: look.roughness,
      metalness: look.metalness,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
  }
  return new THREE.MeshStandardMaterial({
    color: look.color,
    roughness: look.roughness,
    metalness: look.metalness,
    vertexColors: Boolean(look.stripes),
  });
}
