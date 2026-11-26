// Breakwater effects: turns the rules' events (shot, impact, explode, flash, smoke, kill) into tracers, sparks, dust,
// bullet holes, explosions and smoke clouds, and draws grenade bodies. The renderer calls handle(events) and
// update(dt) once per frame and sync(world) each frame. Everything is pooled; nothing is allocated per frame.

import * as THREE from 'three';
import { makeTextures, createLayer } from './effects-layer.js';
import { createTracers, createDecals, createGrenadeBodies, createFireballs } from './effects-meshes.js';

const SPARK = { life: 0.35, size: 0.07, grav: 9, drag: 1, r: 1, g: 0.8, b: 0.45, a: 1, spread: 3 };
const DUST = { life: 0.8, size: 0.22, grow: 0.5, grav: -0.2, drag: 2, r: 0.55, g: 0.53, b: 0.5, a: 0.55, spread: 1.2 };
const SPLINTER = { life: 0.5, size: 0.05, grav: 9, drag: 0.5, r: 0.62, g: 0.45, b: 0.27, a: 1, spread: 3 };
const BLOOD = { life: 0.5, size: 0.12, grow: 0.3, grav: 4, drag: 2, r: 0.55, g: 0.03, b: 0.03, a: 0.75, spread: 2 };
const FLASH = { life: 0.18, size: 1, grow: 6, drag: 0, r: 1, g: 0.95, b: 0.8, a: 1 };
const FIRE = { life: 0.55, size: 0.5, grow: 1.6, grav: -1, drag: 2, r: 1, g: 0.5, b: 0.12, a: 0.8, spread: 3 };
const BOOM_SMOKE = { life: 2.5, size: 0.8, grow: 0.9, grav: -0.7, drag: 1.5, r: 0.13, g: 0.13, b: 0.14, a: 0.8, spread: 3 };
const CLOUD = { life: 1, size: 1.3, grow: 0.04, grav: -0.04, drag: 0.4, r: 0.66, g: 0.68, b: 0.7, a: 1, spread: 0.5 };
const BANG = { life: 0.6, size: 6, grow: 4, drag: 0, r: 1, g: 1, b: 1, a: 1 };

export function createEffects(scene) {
  const textures = makeTextures();
  const sparks = createLayer(scene, textures.spark, 400, true, 700);
  const glow = createLayer(scene, textures.soft, 120, true, 700);
  const smoke = createLayer(scene, textures.smoke, 500, false, 700);
  const tracers = createTracers(scene);
  const decals = createDecals(scene, textures.hole);
  const bodies = createGrenadeBodies(scene);
  const fire = createFireballs(scene);

  // n particles leaving a point along (nx,ny,nz) at `speed`, each randomised by the kind's spread.
  function burst(layer, kind, e, n, speed, size = 1) {
    for (let i = 0; i < n; i++) layer.spawn(kind, e.x, e.y, e.z, e.nx * speed, e.ny * speed, e.nz * speed, size);
  }

  const impacts = {
    container: (e) => { burst(sparks, SPARK, e, 5, 3); decals.spawn(e.x, e.y, e.z, e.nx, e.ny, e.nz); },
    steel: (e) => { burst(sparks, SPARK, e, 6, 3.5); decals.spawn(e.x, e.y, e.z, e.nx, e.ny, e.nz); },
    metal: (e) => { burst(sparks, SPARK, e, 5, 3); decals.spawn(e.x, e.y, e.z, e.nx, e.ny, e.nz); },
    concrete: (e) => { burst(smoke, DUST, e, 3, 0.8); burst(sparks, SPARK, e, 1, 2); decals.spawn(e.x, e.y, e.z, e.nx, e.ny, e.nz); },
    wood: (e) => { burst(smoke, SPLINTER, e, 5, 2.5); decals.spawn(e.x, e.y, e.z, e.nx, e.ny, e.nz); },
    flesh: (e) => burst(smoke, BLOOD, e, 4, 1.5),
  };

  function explode(e) {
    const r = e.radius || 5;
    glow.spawn(FLASH, e.x, e.y + 0.3, e.z, 0, 0, 0, r * 0.4);
    fire.explode(e.x, e.y + 0.3, e.z, r);
    for (let i = 0; i < 8; i++) glow.spawn(FIRE, e.x, e.y + 0.3, e.z, 0, 1.5, 0, r * 0.35);
    for (let i = 0; i < 10; i++) smoke.spawn(BOOM_SMOKE, e.x, e.y + 0.3, e.z, 0, 1, 0, r * 0.3);
    for (let i = 0; i < 24; i++) sparks.spawn(SPARK, e.x, e.y + 0.3, e.z, 0, 4, 0, 1.5, 2);
  }

  function smokeCloud(e) {
    const r = e.radius || 4;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * 6.283, d = Math.random() * r * 0.55;
      smoke.spawn(CLOUD, e.x + Math.cos(a) * d, e.y + 0.4 + Math.random() * r * 0.35, e.z + Math.sin(a) * d, 0, 0, 0, r, e.seconds || 15);
    }
  }

  function handleOne(e) {
    if (e.type === 'shot') tracers.spawn(e.x, e.y, e.z, e.ex, e.ey, e.ez);
    else if (e.type === 'impact') (impacts[e.mat] || impacts.concrete)(e);
    else if (e.type === 'explode') explode(e);
    else if (e.type === 'flash') {
      glow.spawn(BANG, e.x, e.y, e.z, 0, 0, 0);
      fire.flashLight(e.x, e.y + 0.3, e.z, 0xffffff, 500, 0.4);
    } else if (e.type === 'smoke') smokeCloud(e);
    else if (e.type === 'kill') burst(smoke, BLOOD, { x: e.x, y: e.y + 1, z: e.z, nx: 0, ny: 0.5, nz: 0 }, 8, 2, 1.5);
  }

  return {
    handle(events) { for (let i = 0; i < events.length; i++) handleOne(events[i]); },
    sync(world) { bodies.sync(world.grenades); },
    // pixels = viewHeightPx / (2 * tan(fov / 2)) of the view being drawn; sizes of sprites scale with it.
    setPointScale(pixels) { sparks.material.uniforms.uScale.value = glow.material.uniforms.uScale.value = smoke.material.uniforms.uScale.value = pixels; },
    update(dt) {
      sparks.update(dt); glow.update(dt); smoke.update(dt);
      tracers.update(dt); decals.update(dt); fire.update(dt);
    },
  };
}
