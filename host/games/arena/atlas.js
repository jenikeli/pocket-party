// Loads Spirefall's puppet parts and packs them into one texture (docs/arena-plan.md section 3.5). preloadArt() runs
// behind the loading screen: it fetches every rig.json and SVG part and decodes them. buildAtlas(scene) runs when the
// renderer is created: it draws every part once into one 2048 x 2048 canvas with simple shelf packing and registers a
// named frame per part, so all characters share one texture and one draw call. Used by index.js, renderer.js,
// puppet.js and tower-sprite.js.

import { CARDS, TOKENS } from '../../../shared/arena-cards.js';

export const ATLAS_KEY = 'arena-atlas';
// Parts are drawn at this many times their size in the SVG, and shown at 1 / ART_SCALE, so they stay sharp.
export const ART_SCALE = 2;
const ATLAS_SIZE = 2048;
const GAP = 2;
const PARTS_URL = '/assets/arena/parts';
const FOLDERS = [...CARDS, ...TOKENS].map((card) => card.id).concat(['tower-warden', 'tower-keep', 'team']);

// folder -> { rig, images: Map(part name -> decoded image) }
const loaded = new Map();

export const frameName = (folder, part) => `agent/${folder}/${part}`;

export function rigOf(folder) {
  return loaded.get(folder).rig;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Spirefall art: ${url} answered ${response.status}`);
  }
  return response.json();
}

async function loadImage(url) {
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch (error) {
    throw new Error(`Spirefall art: could not decode ${url}: ${error.message}`);
  }
  return image;
}

async function loadFolder(folder) {
  const rig = await fetchJson(`${PARTS_URL}/${folder}/rig.json`);
  const images = new Map();
  await Promise.all(Object.keys(rig.parts).map(async (name) => {
    images.set(name, await loadImage(`${PARTS_URL}/${folder}/${name}.svg`));
  }));
  loaded.set(folder, { rig, images });
}

export async function preloadArt() {
  await Promise.all(FOLDERS.filter((folder) => !loaded.has(folder)).map(loadFolder));
}

// Every part with its size in the atlas, tallest first so the shelves waste little room.
function listParts() {
  const list = [];
  for (const [folder, { rig, images }] of loaded) {
    for (const [name, info] of Object.entries(rig.parts)) {
      list.push({ folder, name, image: images.get(name), width: Math.ceil(info.w * ART_SCALE), height: Math.ceil(info.h * ART_SCALE) });
    }
  }
  return list.sort((first, second) => second.height - first.height);
}

// Call from the renderer's create(), after preloadArt() has finished. Returns the texture.
export function buildAtlas(scene) {
  if (scene.textures.exists(ATLAS_KEY)) {
    scene.textures.remove(ATLAS_KEY);
  }
  const texture = scene.textures.createCanvas(ATLAS_KEY, ATLAS_SIZE, ATLAS_SIZE);
  const context = texture.getContext();
  let x = 0;
  let y = 0;
  let shelfHeight = 0;
  for (const item of listParts()) {
    if (x + item.width > ATLAS_SIZE) {
      x = 0;
      y += shelfHeight + GAP;
      shelfHeight = 0;
    }
    if (y + item.height > ATLAS_SIZE) {
      throw new Error(`Spirefall art: the atlas is full at ${item.folder}/${item.name}`);
    }
    context.drawImage(item.image, x, y, item.width, item.height);
    texture.add(frameName(item.folder, item.name), 0, x, y, item.width, item.height);
    x += item.width + GAP;
    shelfHeight = Math.max(shelfHeight, item.height);
  }
  texture.refresh();
  return texture;
}
