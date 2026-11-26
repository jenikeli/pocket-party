// Builds and draws Breakwater's project-authored Three.js scene with one split-screen view per player.

import * as THREE from 'three';
import { layoutViews, MAX_VIEWS } from '/host/games/temple-run/layout.js';
import { createEffects } from './effects.js';
import { buildMap } from './map-view.js';
import { createMaterials } from './textures.js';
import { createRenderActors } from './renderer-actors.js';
import { createRenderView } from './renderer-view.js';
import { DEFAULT_MAP, MAPS } from './maps/index.js';

function disposeScene(scene) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
      for (const uniform of Object.values(material.uniforms ?? {})) {
        if (uniform.value?.isTexture) textures.add(uniform.value);
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

function createRendererState(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.className = 'fps-renderer-canvas';
  renderer.domElement.setAttribute('aria-label', 'Breakwater shooter scene');
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  container.style.position = 'relative';
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const map = MAPS[DEFAULT_MAP];
  const mapGroup = buildMap(scene, map, createMaterials());
  const effects = createEffects(scene);
  const overlay = document.createElement('div');
  overlay.className = 'fps-renderer-overlay';
  overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
  container.append(overlay);
  const actors = createRenderActors(scene);
  const views = Array.from({ length: MAX_VIEWS }, (_, index) => createRenderView(scene, overlay, index, map));
  return {
    renderer, scene, map, mapGroup, effects, overlay, actors, views, container,
    width: 0, height: 0, previousFrame: performance.now(),
  };
}

function resize(state) {
  const width = state.container.clientWidth;
  const height = state.container.clientHeight;
  if (width !== state.width || height !== state.height) {
    state.width = width;
    state.height = height;
    state.renderer.setSize(width, height, false);
  }
  return width > 0 && height > 0;
}

function updateRelays(mapGroup, match) {
  for (const [index, relay] of (match?.relays ?? []).entries()) {
    const core = mapGroup.userData.relayCores[index]?.core;
    if (!core) continue;
    core.material.color.setHex(relay.cut ? 0x58bd7a : 0xffb347);
    core.material.emissive.setHex(relay.cut ? 0x1d6b38 : 0xff7b24);
  }
}

function updateWorld(state, payload, dt) {
  const match = payload.match;
  const players = match?.world.players ?? [];
  state.actors.synchronize(players, payload.alpha ?? 1, dt);
  state.effects.handle(payload.events ?? []);
  state.effects.sync(match?.world ?? { grenades: [] });
  state.effects.update(dt);
  updateRelays(state.mapGroup, match);
  return players;
}

function drawViews(state, payload, players) {
  const match = payload.match;
  const viewerIds = match ? (payload.viewers ?? []).slice(0, MAX_VIEWS) : [];
  const count = match ? Math.max(1, viewerIds.length) : 1;
  const fractions = layoutViews(count);

  for (let index = 0; index < state.views.length; index += 1) {
    const view = state.views[index];
    if (index >= count) {
      view.hide();
      continue;
    }
    const viewport = fractions[index];
    view.setViewport(viewport, state.width, state.height);
    const player = match ? players.find((candidate) => candidate.id === viewerIds[index]) : null;
    if (player) {
      state.actors.configureCamera(view.camera, player.id);
      view.showPlayer(player, match, payload.alpha ?? 1, payload.dt, payload.feed ?? [], payload.scoresFor ?? new Set());
    } else {
      view.showPreview(state.map.spawns[0][2]);
    }

    const left = viewport.x * state.width;
    const viewWidth = viewport.w * state.width;
    const viewHeight = viewport.h * state.height;
    const bottom = state.height - (viewport.y + viewport.h) * state.height;
    state.renderer.setViewport(left, bottom, viewWidth, viewHeight);
    state.renderer.setScissor(left, bottom, viewWidth, viewHeight);
    state.renderer.setScissorTest(true);
    state.renderer.render(state.scene, view.camera);
  }
  state.renderer.setScissorTest(false);
}

function drawFrame(state, payload) {
  if (!resize(state)) return;
  const now = performance.now();
  const dt = Math.min(0.1, (now - state.previousFrame) / 1000);
  state.previousFrame = now;
  const players = updateWorld(state, payload, dt);
  drawViews(state, { ...payload, dt }, players);
}

function destroyRenderer(state) {
  state.actors.destroy();
  state.views.forEach((view) => view.element.remove());
  state.overlay.remove();
  disposeScene(state.scene);
  state.renderer.dispose();
  state.renderer.forceContextLoss();
  state.renderer.domElement.remove();
}

export function createRenderer(container) {
  const state = createRendererState(container);
  return {
    draw: (payload) => drawFrame(state, payload),
    destroy: () => destroyRenderer(state),
  };
}
