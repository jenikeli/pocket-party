// Unit tests for the palm's look (M7d4c4, brought close to the Blender palm), which run without a browser: the
// parts and their materials, the trunk's 12 scales with 8 rounded teeth and a dark crease under each lip, the
// fronds' cards inside their texture, no NaN anywhere, and the maps' sizes and cut-out.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The palm imports Three.js by its bare name, which the browser's import map points at the vendored copy. Node
// has no import map and Three.js is not an npm dependency, so a resolve hook does the same here.
const threeFolder = pathToFileURL(new URL('../../host/vendor/three-0.186.1/', import.meta.url).pathname).href;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three') {
      return next(`${threeFolder}three.module.js`, context);
    }
    if (specifier.startsWith('three/addons/')) {
      return next(`${threeFolder}addons/${specifier.slice('three/addons/'.length)}`, context);
    }
    return next(specifier, context);
  },
});

// The textures are drawn on canvases, which Node lacks: a canvas that keeps the last picture put on it stands in,
// so the test can read the maps' sizes and pixels.
globalThis.document = {
  createElement: () => {
    const canvas = { width: 0, height: 0, picture: null };
    canvas.getContext = () => ({
      createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: (picture) => (canvas.picture = picture),
    });
    return canvas;
  },
};

const { buildPalm, buildPalmParts, createPalmMaterials } = await import('../../host/games/kart-3d/kit/palm.js');

const SCALES = 12;
const TEETH = 8;
// Drawing the textures takes about a second in Node, so the materials are made once for every test.
const MATERIALS = createPalmMaterials((thing) => thing);

function valuesOf(attribute) {
  return Array.from(attribute.array);
}

test('the parts are the trunk and the fronds, with the kit palm materials', () => {
  const materials = MATERIALS;
  const parts = buildPalmParts({ keep: (thing) => thing, palm: materials });
  assert.equal(parts.length, 2);
  assert.equal(parts[0].material, materials.trunk);
  assert.equal(parts[1].material, materials.fronds);
  assert.ok(materials.trunk.vertexColors && materials.trunk.map && materials.trunk.normalMap);
  assert.ok(materials.fronds.alphaMap && materials.fronds.alphaTest > 0);
});

test('no NaN in the positions, normals and texture coordinates', () => {
  for (const geometry of Object.values(buildPalm())) {
    for (const name of ['position', 'normal', 'uv', 'color']) {
      assert.ok(valuesOf(geometry.attributes[name]).every(Number.isFinite), name);
    }
  }
});

test('the trunk is as many triangles as the Blender palm, the fronds ten cards', () => {
  const { trunk, fronds } = buildPalm();
  // 47 rows of faces 32 columns round, and four balls of 80 triangles (the crown knob and three coconuts).
  assert.equal(trunk.index.count / 3, 47 * 32 * 2 + 4 * 80);
  assert.equal(fronds.index.count / 3, 10 * 10 * 4 * 2);
});

test('each lip hangs in rounded teeth, and the crease under it is dark', () => {
  const { position, color } = buildPalm().trunk.attributes;
  // The lightest vertices are the lips' edges (all but the foot's, flat on the ground): the first's hang lower at a
  // tooth's middle than at a notch.
  const lipHeights = [];
  for (let index = 0; index < position.count; index += 1) {
    if (color.getX(index) > 1.01 && position.getY(index) > 0.01) {
      lipHeights.push(position.getY(index));
    }
  }
  assert.equal(lipHeights.length, (SCALES - 1) * (TEETH * 4 + 1));
  const firstLip = lipHeights.slice(0, TEETH * 4 + 1);
  const perScale = 8.5 / SCALES;
  const spread = Math.max(...firstLip) - Math.min(...firstLip);
  assert.ok(spread > 0.15 * perScale && spread < 0.4 * perScale, `teeth ${spread}`);
  const shades = valuesOf(color).filter((value, index) => index % 3 === 0);
  assert.ok(Math.min(...shades) <= 0.35, 'a dark crease');
});

test('the fronds cards stay inside their texture', () => {
  const uvs = valuesOf(buildPalm().fronds.attributes.uv);
  assert.ok(uvs.every((value) => value >= 0 && value <= 1));
});

test('the maps keep to the prop budget, and the frond is cut out', () => {
  const { trunk, fronds } = MATERIALS;
  for (const material of [trunk, fronds]) {
    for (const map of [material.map, material.normalMap, material.aoMap, material.roughnessMap]) {
      assert.ok(map.image.width <= 512 && map.image.height <= 512, `${map.image.width} x ${map.image.height}`);
    }
  }
  const alpha = fronds.alphaMap.image.picture.data;
  let [opaque, clear] = [0, 0];
  for (let index = 0; index < alpha.length; index += 4) {
    opaque += alpha[index + 1] > 200 ? 1 : 0;
    clear += alpha[index + 1] < 50 ? 1 : 0;
  }
  // Broad blades: much of the card is leaf, and the gaps between blades still show.
  const share = opaque / (alpha.length / 4);
  assert.ok(share > 0.3 && share < 0.8 && clear > 0, `opaque share ${share}`);
});
