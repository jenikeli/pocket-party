// Creates one first-person camera, weapon, and HUD for a player's split-screen viewport.

import * as THREE from 'three';
import { createHud } from './hud.js';
import { TUNING, WEAPONS } from './tuning.js';
import { createViewmodel } from './viewmodel.js';
import { eyeOf } from './world.js';
import { spreadOf } from './weapons.js';

const FIRST_PERSON_LAYER = 24;

function interpolate(previous, current, alpha) {
  return previous + (current - previous) * alpha;
}

function interpolateAngle(previous, current, alpha) {
  const delta = Math.atan2(Math.sin(current - previous), Math.cos(current - previous));
  return previous + delta * alpha;
}

export function createRenderView(scene, overlay, index, map) {
  const camera = new THREE.PerspectiveCamera(70, 1, 0.06, 220);
  camera.layers.set(0);
  camera.layers.enable(FIRST_PERSON_LAYER + index);
  scene.add(camera);
  const viewmodel = createViewmodel();
  viewmodel.setLayer(FIRST_PERSON_LAYER + index);
  camera.add(viewmodel.group);

  const element = document.createElement('div');
  element.className = 'fps-renderer-view';
  element.dataset.fpsView = String(index);
  element.style.cssText = 'position:absolute;display:none;overflow:hidden;box-sizing:border-box;border:1px solid rgba(255,255,255,.32);';
  overlay.append(element);
  const hud = createHud(element);

  function setViewport(viewport, width, height) {
    const viewWidth = viewport.w * width;
    const viewHeight = viewport.h * height;
    Object.assign(element.style, {
      display: 'block',
      left: `${viewport.x * width}px`,
      top: `${viewport.y * height}px`,
      width: `${viewWidth}px`,
      height: `${viewHeight}px`,
    });
    hud.resize(viewWidth, viewHeight);
    camera.aspect = viewWidth / Math.max(1, viewHeight);
    camera.updateProjectionMatrix();
  }

  function showPreview(spawn) {
    element.style.display = 'none';
    delete element.dataset.playerId;
    camera.layers.set(0);
    camera.layers.enable(FIRST_PERSON_LAYER + index);
    camera.position.set(spawn.x, TUNING.eyeHeight, spawn.z);
    camera.rotation.set(0, spawn.yaw, 0, 'YXZ');
    camera.fov = 70;
    camera.updateProjectionMatrix();
    viewmodel.group.visible = false;
  }

  function showPlayer(player, match, alpha, dt, feed, scoresFor) {
    camera.layers.enable(FIRST_PERSON_LAYER + index);
    const feetY = interpolate(player.py, player.y, alpha);
    const eye = eyeOf(player, TUNING);
    const dead = !player.alive;
    const pitch = dead ? -0.5 : interpolate(player.ppitch, player.pitch, alpha);
    const yaw = interpolateAngle(player.pyaw, player.yaw, alpha);
    camera.position.set(
      interpolate(player.px, player.x, alpha),
      dead ? player.y + 0.55 : feetY + (eye.y - player.y),
      interpolate(player.pz, player.z, alpha),
    );
    camera.rotation.set(pitch, yaw, dead ? 0.4 : 0, 'YXZ');
    const gun = WEAPONS[player.guns[player.slot].id];
    camera.fov = gun.zoom[player.zoom] ?? 70;
    camera.aspect = element.clientWidth / Math.max(1, element.clientHeight);
    camera.updateProjectionMatrix();
    viewmodel.group.visible = true;
    viewmodel.update(player, dt);
    element.dataset.playerId = player.id;
    hud.update({
      player,
      match,
      spread: spreadOf(player),
      fov: camera.fov,
      feed,
      showScores: scoresFor.has(player.id),
      now: match.world.time,
    });
  }

  function hide() {
    element.style.display = 'none';
    viewmodel.group.visible = false;
  }

  return { camera, element, setViewport, showPreview, showPlayer, hide };
}
