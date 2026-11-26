// The pooled solid effects for Saltline: bullet tracers, bullet-hole decals, grenade bodies, explosion fire spheres
// and the one shared flash light. Used by effects.js; every piece is made once and reused, never created per event.

import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);
const direction = new THREE.Vector3();
const normal = new THREE.Vector3();

export function createTracers(scene, count = 24) {
  const geometry = new THREE.CylinderGeometry(0.012, 0.012, 1, 4, 1, true);
  const pool = [];
  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);
    pool.push({ mesh, life: 0 });
  }
  let next = 0;
  const LIFE = 0.07;
  return {
    // From (x,y,z) to (ex,ey,ez); starts a little in front of the muzzle. Short shots draw nothing.
    spawn(x, y, z, ex, ey, ez) {
      direction.set(ex - x, ey - y, ez - z);
      const length = direction.length();
      if (length < 3) return;
      direction.divideScalar(length);
      const start = Math.min(0.8, length * 0.3);
      const tracer = pool[next];
      next = (next + 1) % count;
      tracer.life = LIFE;
      tracer.mesh.visible = true;
      tracer.mesh.scale.set(1, length - start, 1);
      tracer.mesh.position.set(x, y, z).addScaledVector(direction, start + (length - start) / 2);
      tracer.mesh.quaternion.setFromUnitVectors(UP, direction);
    },
    update(dt) {
      for (const tracer of pool) {
        if (!tracer.mesh.visible) continue;
        tracer.life -= dt;
        tracer.mesh.visible = tracer.life > 0;
        tracer.mesh.material.opacity = Math.max(0, tracer.life / LIFE);
      }
    },
  };
}

export function createDecals(scene, texture, count = 60) {
  const geometry = new THREE.PlaneGeometry(0.14, 0.14);
  const pool = [];
  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);
    pool.push({ mesh, age: 0 });
  }
  let next = 0; // the ring reuses the oldest decal first
  const HOLD = 5, FADE = 3;
  return {
    spawn(x, y, z, nx, ny, nz) {
      const decal = pool[next];
      next = (next + 1) % count;
      decal.age = 0;
      decal.mesh.visible = true;
      decal.mesh.material.opacity = 1;
      normal.set(nx, ny, nz);
      decal.mesh.position.set(x + nx * 0.012, y + ny * 0.012, z + nz * 0.012);
      decal.mesh.quaternion.setFromUnitVectors(FORWARD, normal);
      decal.mesh.rotateZ(Math.random() * 6.28);
    },
    update(dt) {
      for (const decal of pool) {
        if (!decal.mesh.visible) continue;
        decal.age += dt;
        decal.mesh.visible = decal.age < HOLD + FADE;
        decal.mesh.material.opacity = Math.min(1, (HOLD + FADE - decal.age) / FADE);
      }
    },
  };
}

// Grenade bodies: a pool per kind; sync() places one mesh per grenade in the world and hides the rest.
export function createGrenadeBodies(scene, perKind = 10) {
  const sphere = new THREE.SphereGeometry(0.055, 10, 8);
  const can = new THREE.CylinderGeometry(0.04, 0.04, 0.14, 10);
  const kinds = {
    frag: { geometry: sphere, material: new THREE.MeshLambertMaterial({ color: 0x3d4a24 }) },
    smoke: { geometry: can, material: new THREE.MeshLambertMaterial({ color: 0x8a8d90 }) },
    flash: { geometry: can, material: new THREE.MeshLambertMaterial({ color: 0xd9c46a }) },
  };
  const pools = {};
  for (const [kind, { geometry, material }] of Object.entries(kinds)) {
    pools[kind] = [];
    for (let i = 0; i < perKind; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      scene.add(mesh);
      pools[kind].push(mesh);
    }
  }
  const used = { frag: 0, smoke: 0, flash: 0 };
  return {
    sync(grenades) {
      used.frag = used.smoke = used.flash = 0;
      for (const grenade of grenades) {
        const kind = pools[grenade.kind] ? grenade.kind : 'frag';
        const mesh = pools[kind][used[kind]++];
        if (!mesh) continue;
        mesh.visible = true;
        mesh.position.set(grenade.body.x, grenade.body.y, grenade.body.z);
        mesh.rotation.set(grenade.body.x * 7, 0, grenade.body.z * 5); // a tumble that follows its travel
      }
      for (const kind in pools) for (let i = used[kind]; i < pools[kind].length; i++) pools[kind][i].visible = false;
    },
  };
}

// Expanding fire spheres plus one point light that lights the ground for a moment. The light exists from the start
// (intensity 0) so lit materials never recompile when the first explosion happens.
export function createFireballs(scene, count = 4) {
  const geometry = new THREE.SphereGeometry(1, 14, 10);
  const pool = [];
  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);
    pool.push({ mesh, age: 0, radius: 1 });
  }
  const light = new THREE.PointLight(0xffaa55, 0, 20, 2);
  scene.add(light);
  let next = 0, lightLife = 0, lightTotal = 1, lightPeak = 0;
  const LIFE = 0.5;
  return {
    explode(x, y, z, radius) {
      const ball = pool[next];
      next = (next + 1) % count;
      ball.age = 0;
      ball.radius = radius;
      ball.mesh.visible = true;
      ball.mesh.position.set(x, y, z);
      this.flashLight(x, y + 0.5, z, 0xffaa55, 400, 0.3);
    },
    flashLight(x, y, z, color, intensity, seconds) {
      light.position.set(x, y, z);
      light.color.setHex(color);
      lightPeak = intensity;
      lightLife = lightTotal = seconds;
      light.intensity = intensity;
    },
    update(dt) {
      for (const ball of pool) {
        if (!ball.mesh.visible) continue;
        ball.age += dt;
        const f = ball.age / LIFE;
        ball.mesh.visible = f < 1;
        ball.mesh.scale.setScalar(ball.radius * (0.1 + 0.55 * Math.sqrt(f)));
        ball.mesh.material.opacity = 0.85 * (1 - f) * (1 - f);
      }
      lightLife = Math.max(0, lightLife - dt);
      light.intensity = lightLife > 0 ? lightPeak * (lightLife / lightTotal) : 0;
    },
  };
}
