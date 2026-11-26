// Builds a map's look in a Three.js scene: every box drawn as an instance of one unit cube (one InstancedMesh per
// material, tinted per box), the wet ground, fog, sky and lights. The collision uses the same boxes (collision.js).
// Used by renderer.js.

import * as THREE from 'three';

function makeSignTexture(text, accent = '#ffb347') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#171c1f';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = accent;
  context.fillRect(0, 0, 18, canvas.height);
  context.strokeStyle = 'rgba(232,228,218,.35)';
  context.strokeRect(28, 20, canvas.width - 56, canvas.height - 40);
  context.fillStyle = '#e8e4da';
  context.font = '900 48px Arial Narrow, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2 + 8, canvas.height / 2, canvas.width - 58);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addChainLinkFence(group, z, material) {
  const positions = [];
  const width = 76;
  const height = 3.6;
  const cell = 0.42;
  for (let x = -width / 2; x < width / 2; x += cell) {
    for (let y = 0.08; y < height; y += cell) {
      const halfWidth = cell / 2;
      const halfHeight = cell / 2;
      const points = [
        [x, y + halfHeight],
        [x + halfWidth, y],
        [x + cell, y + halfHeight],
        [x + halfWidth, y + cell],
        [x, y + halfHeight],
      ];
      for (let index = 0; index < points.length - 1; index += 1) {
        positions.push(points[index][0], points[index][1], z, points[index + 1][0], points[index + 1][1], z);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mesh = new THREE.LineSegments(geometry, material);
  mesh.frustumCulled = false;
  group.add(mesh);

  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x48545a, roughness: 0.48, metalness: 0.72 });
  for (let x = -width / 2; x <= width / 2; x += 6) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, height + 0.12, 8), frameMaterial);
    post.position.set(x, height / 2, z);
    group.add(post);
  }
  for (const y of [0.08, height - 0.04]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, width, 8), frameMaterial);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, y, z);
    group.add(rail);
  }
}

function addHarborBackdrop(group, material) {
  const containers = [];
  for (const z of [-34, 34]) {
    for (let x = -30; x <= 30; x += 12) {
      for (let level = 0; level < 3; level += 1) {
        containers.push({ x, z, level, alongX: true, color: (Math.round((x + 30) / 12.2) + level) % 2 ? 0x263e52 : 0x754133 });
      }
    }
  }
  for (const x of [-45, 45]) {
    for (let z = -18; z <= 18; z += 12) {
      for (let level = 0; level < 3; level += 1) {
        containers.push({ x, z, level, alongX: false, color: (Math.round((z + 18) / 12.2) + level) % 2 ? 0x263e52 : 0x754133 });
      }
    }
  }
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geometry, material, containers.length);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  containers.forEach((container, index) => {
    const width = container.alongX ? 12.2 : 2.45;
    const depth = container.alongX ? 2.45 : 12.2;
    matrix.makeScale(width, 2.6, depth).setPosition(container.x, container.level * 2.6 + 1.3, container.z);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, color.setHex(container.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  group.add(mesh);
}

// Returns the group added to `scene`. `materials` is the keyed set from textures.js.
export function buildMap(scene, map, materials) {
  const group = new THREE.Group();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const byMaterial = new Map();
  for (const box of map.boxes) {
    if (!byMaterial.has(box.mat)) {
      byMaterial.set(box.mat, []);
    }
    byMaterial.get(box.mat).push(box);
  }
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  for (const [mat, boxes] of byMaterial) {
    const isHarbor = map.id === 'harbor';
    const renderedBoxes = isHarbor && mat === 'concrete'
      ? boxes.filter((box) => {
        const width = box.x1 - box.x0;
        const depth = box.z1 - box.z0;
        return !(Math.max(width, depth) >= 2.8 && Math.max(width, depth) <= 3.2 && Math.min(width, depth) <= 0.65 && box.y1 - box.y0 <= 1.1);
      })
      : boxes;
    const mesh = new THREE.InstancedMesh(cube, materials[mat] ?? materials.concrete, renderedBoxes.length);
    renderedBoxes.forEach((box, index) => {
      matrix.makeScale(box.x1 - box.x0, box.y1 - box.y0, box.z1 - box.z0).setPosition((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, (box.z0 + box.z1) / 2);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, color.setHex(box.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (renderedBoxes.length) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);

    if (mat === 'container' && boxes.length) {
      const ribGeometry = new THREE.BoxGeometry(1, 1, 1);
      const ribMaterial = new THREE.MeshStandardMaterial({ color: 0x343b3e, roughness: 0.52, metalness: 0.55 });
      const ribCount = boxes.reduce((count, box) => {
        const width = box.x1 - box.x0;
        const depth = box.z1 - box.z0;
        const long = Math.max(width, depth);
        const short = Math.min(width, depth);
        return count + 2 * Math.ceil(long / 0.4) + 2 * Math.ceil(short / 0.4) + 8;
      }, 0);
      const ribs = new THREE.InstancedMesh(ribGeometry, ribMaterial, ribCount);
      let ribIndex = 0;
      boxes.forEach((box) => {
        const width = box.x1 - box.x0;
        const depth = box.z1 - box.z0;
        const height = box.y1 - box.y0;
        const cx = (box.x0 + box.x1) / 2;
        const cy = (box.y0 + box.y1) / 2;
        const cz = (box.z0 + box.z1) / 2;
        const alongX = width > depth;
        const length = alongX ? width : depth;
        const longCount = Math.ceil(length / 0.4);
        const short = alongX ? depth : width;
        const shortCount = Math.ceil(short / 0.4);
        for (let rib = 0; rib < longCount; rib += 1) {
          const position = -length / 2 + ((rib + 0.5) / longCount) * length;
          for (const side of [-1, 1]) {
            const x = alongX ? cx + position : cx + side * (width / 2 - 0.055);
            const z = alongX ? cz + side * (depth / 2 - 0.055) : cz + position;
            matrix.makeScale(alongX ? 0.065 : 0.11, height * 0.96, alongX ? 0.11 : 0.065).setPosition(x, cy, z);
            ribs.setMatrixAt(ribIndex++, matrix);
          }
        }
        for (let rib = 0; rib < shortCount; rib += 1) {
          const position = -short / 2 + ((rib + 0.5) / shortCount) * short;
          for (const side of [-1, 1]) {
            const x = alongX ? cx + position : cx + side * (width / 2 - 0.055);
            const z = alongX ? cz + side * (depth / 2 - 0.055) : cz + position;
            matrix.makeScale(0.065, height * 0.96, 0.065).setPosition(x, cy, z);
            ribs.setMatrixAt(ribIndex++, matrix);
          }
        }
        for (const xSide of [-1, 1]) {
          for (const zSide of [-1, 1]) {
            matrix.makeScale(0.14, height, 0.14).setPosition(cx + xSide * (width / 2 - 0.07), cy, cz + zSide * (depth / 2 - 0.07));
            ribs.setMatrixAt(ribIndex++, matrix);
          }
        }
        for (const offset of [-0.38, 0.38]) {
          if (alongX) {
            for (const zSide of [-1, 1]) {
              matrix.makeScale(0.045, height * 0.78, 0.045).setPosition(cx + offset, cy, cz + zSide * (depth / 2 + 0.015));
              ribs.setMatrixAt(ribIndex++, matrix);
            }
          } else {
            for (const xSide of [-1, 1]) {
              matrix.makeScale(0.045, height * 0.78, 0.045).setPosition(cx + xSide * (width / 2 + 0.015), cy, cz + offset);
              ribs.setMatrixAt(ribIndex++, matrix);
            }
          }
        }
      });
      ribs.instanceMatrix.needsUpdate = true;
      ribs.castShadow = true;
      ribs.frustumCulled = false;
      group.add(ribs);

      const capGeometry = new THREE.BoxGeometry(1, 1, 1);
      const caps = new THREE.InstancedMesh(capGeometry, ribMaterial, boxes.length * 6);
      let capIndex = 0;
      boxes.forEach((box) => {
        const cx = (box.x0 + box.x1) / 2;
        const cy = (box.y0 + box.y1) / 2;
        const cz = (box.z0 + box.z1) / 2;
        const width = box.x1 - box.x0;
        const depth = box.z1 - box.z0;
        const alongX = width > depth;
        const length = Math.max(width, depth);
        for (const side of [-1, 1]) {
          for (const y of [box.y0 + 0.08, box.y1 - 0.08, cy]) {
            matrix.makeScale(alongX ? length : 0.08, 0.07, alongX ? 0.08 : length).setPosition(
              alongX ? cx : cx + side * (width / 2 + 0.005),
              y,
              alongX ? cz + side * (depth / 2 + 0.005) : cz,
            );
            caps.setMatrixAt(capIndex++, matrix);
          }
        }
      });
      caps.instanceMatrix.needsUpdate = true;
      caps.castShadow = true;
      caps.frustumCulled = false;
      group.add(caps);

      const decalMaterial = new THREE.MeshBasicMaterial({ map: makeSignTexture('BREAKWATER  /  FREIGHT', '#c99562'), transparent: true, depthWrite: false });
      boxes.forEach((box, index) => {
        if (index % 2 !== 0) return;
        const width = box.x1 - box.x0;
        const depth = box.z1 - box.z0;
        const alongX = width > depth;
        const decal = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), decalMaterial);
        decal.position.set((box.x0 + box.x1) / 2, box.y0 + (box.y1 - box.y0) * 0.56, alongX ? box.z1 + 0.012 : box.x1 + 0.012);
        decal.rotation.y = alongX ? 0 : Math.PI / 2;
        group.add(decal);
      });
    }
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 220), materials.ground);
  ground.rotation.x = -Math.PI / 2;
  if (materials.ground.map) {
    materials.ground.map.repeat.set(52, 44);
    materials.ground.map.needsUpdate = true;
  }
  ground.receiveShadow = true;
  group.add(ground);
  if (map.id === 'harbor') addHarborBackdrop(group, materials.container);

  const signMaterial = new THREE.MeshBasicMaterial({ map: makeSignTexture('BREAKWATER PORT'), transparent: true });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), signMaterial);
  sign.position.set(-38.8, 6.2, 0);
  sign.rotation.y = Math.PI / 2;
  group.add(sign);

  const berthMaterial = new THREE.MeshBasicMaterial({ map: makeSignTexture('BERTH 04 / DOCKSIDE', '#d2622a'), transparent: true });
  const berth = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), berthMaterial);
  berth.position.set(38.8, 5.2, 12);
  berth.rotation.y = -Math.PI / 2;
  group.add(berth);

  const hazardGeometry = new THREE.PlaneGeometry(0.7, 8);
  const hazardMaterial = new THREE.MeshBasicMaterial({ color: 0xffb347, side: THREE.DoubleSide });
  for (const z of [-22, -16, -10, 10, 16, 22]) {
    const stripe = new THREE.Mesh(hazardGeometry, hazardMaterial);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(-39.2, 0.055, z);
    group.add(stripe);
  }

  const puddleMaterial = new THREE.MeshStandardMaterial({ color: 0x7f9298, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.58 });
  for (const [x, z, sx, sz] of [[-18, 4, 5, 2.4], [12, -8, 7, 2.8], [26, 18, 4.5, 2], [0, 20, 6, 2.2], [-30, -12, 4, 1.8], [32, 6, 3.2, 1.4], [-24, -22, 4.8, 1.8]]) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 24), puddleMaterial);
    puddle.rotation.x = -Math.PI / 2;
    puddle.scale.set(sx, sz, 1);
    puddle.position.set(x, 0.025, z);
    group.add(puddle);
  }

  const fenceMaterial = new THREE.LineBasicMaterial({ color: 0x899093, transparent: true, opacity: 0.58, depthWrite: false });
  for (const z of [-27.2, 27.2]) addChainLinkFence(group, z, fenceMaterial);

  if (map.id === 'harbor') {
    const barrierGeometry = new THREE.ExtrudeGeometry(new THREE.Shape([
      new THREE.Vector2(-1.5, 0),
      new THREE.Vector2(1.5, 0),
      new THREE.Vector2(1.23, 0.95),
      new THREE.Vector2(-1.23, 0.95),
    ]), { depth: 0.6, bevelEnabled: false });
    const barrierMaterial = new THREE.MeshStandardMaterial({ color: 0x86827a, roughness: 0.86 });
    const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0xc98a45, roughness: 0.68, emissive: 0x281506, emissiveIntensity: 0.1 });
    const barrierBoxes = map.boxes.filter((box) => {
      const width = box.x1 - box.x0;
      const depth = box.z1 - box.z0;
      return Math.max(width, depth) >= 2.8 && Math.max(width, depth) <= 3.2 && Math.min(width, depth) <= 0.65 && box.y1 - box.y0 <= 1.1;
    });
    for (const box of barrierBoxes) {
      const width = box.x1 - box.x0;
      const depth = box.z1 - box.z0;
      const alongX = width > depth;
      const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
      barrier.position.set(alongX ? (box.x0 + box.x1) / 2 : box.x0, box.y0, alongX ? box.z0 : (box.z0 + box.z1) / 2);
      if (!alongX) barrier.rotation.y = Math.PI / 2;
      barrier.castShadow = true;
      barrier.receiveShadow = true;
      group.add(barrier);
      for (const stripeX of [-0.76, 0.76]) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.025), stripeMaterial);
        stripe.position.set((box.x0 + box.x1) / 2 + (alongX ? stripeX : 0.31), box.y0 + 0.48, (box.z0 + box.z1) / 2 + (alongX ? depth / 2 + 0.016 : stripeX));
        if (!alongX) stripe.rotation.y = Math.PI / 2;
        group.add(stripe);
      }
    }
  }

  const rubbleGeometry = new THREE.DodecahedronGeometry(0.28, 0);
  const rubbleMaterial = new THREE.MeshStandardMaterial({ color: 0x5e6464, roughness: 0.9, metalness: 0.08 });
  const rubble = new THREE.InstancedMesh(rubbleGeometry, rubbleMaterial, 70);
  let seed = 91;
  for (let index = 0; index < 70; index += 1) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const x = -36 + (seed / 4294967296) * 72;
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const z = -24 + (seed / 4294967296) * 48;
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const size = 0.45 + (seed / 4294967296) * 0.9;
    matrix.makeScale(size, size * 0.55, size).setPosition(x, size * 0.28, z);
    rubble.setMatrixAt(index, matrix);
  }
  rubble.instanceMatrix.needsUpdate = true;
  rubble.frustumCulled = false;
  group.add(rubble);

  const craneMaterial = new THREE.MeshStandardMaterial({ color: 0x5d6a70, roughness: 0.45, metalness: 0.35 });
  for (const x of [-33, 33]) {
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.18, 11, 0.18), craneMaterial);
    mast.position.set(x, 5.5, -25);
    group.add(mast);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(10, 0.16, 0.16), craneMaterial);
    arm.position.set(x + (x < 0 ? 5 : -5), 11, -25);
    group.add(arm);
  }

  const dockMaterial = new THREE.MeshStandardMaterial({ color: 0x343f43, roughness: 0.22, metalness: 0.18, transparent: true, opacity: 0.92 });
  for (const [x, z, sx, sz] of [[-4, 27, 74, 5], [4, -27, 74, 5], [-38, 0, 4, 48], [38, 0, 4, 48]]) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.12, sz), dockMaterial);
    dock.position.set(x, 0.04, z);
    group.add(dock);
  }

  const waterMaterial = new THREE.MeshPhysicalMaterial({ color: 0x1d343b, roughness: 0.18, metalness: 0.12, transparent: true, opacity: 0.72 });
  for (const [x, z, sx, sz] of [[-46, 0, 8, 56], [46, 0, 8, 56]]) {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, -0.02, z);
    group.add(water);
  }

  const beamMaterial = new THREE.MeshStandardMaterial({ color: 0x4d575c, roughness: 0.42, metalness: 0.48 });
  const orangeMaterial = new THREE.MeshStandardMaterial({ color: 0xb56c31, roughness: 0.55, metalness: 0.12 });
  for (const [x, z] of [[-31, -25], [31, 25]]) {
    for (const dx of [-3.2, 3.2]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 10.5, 0.34), beamMaterial);
      leg.position.set(x + dx, 5.25, z);
      group.add(leg);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.42, 0.42), beamMaterial);
    beam.position.set(x, 10.5, z);
    group.add(beam);
    for (const dx of [-2.8, 0, 2.8]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.7), orangeMaterial);
      lamp.position.set(x + dx, 10.15, z);
      group.add(lamp);
      const glow = new THREE.PointLight(0xffc977, 0.45, 10);
      glow.position.set(x + dx, 9.9, z);
      group.add(glow);
    }
  }

  const relayMaterial = new THREE.MeshStandardMaterial({ color: 0x69777b, roughness: 0.38, metalness: 0.45 });
  const relayCores = [];
  for (const relay of (map.relays ?? [])) {
    const { x, z } = relay;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.18, 20), relayMaterial);
    base.position.set(x, 0.09, z);
    group.add(base);
    const column = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.7, 0.24), relayMaterial);
    column.position.set(x, 0.94, z);
    group.add(column);
    const coreMaterial = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff7b24, emissiveIntensity: 1.4, roughness: 0.25 });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), coreMaterial);
    core.position.set(x, 1.85, z);
    core.userData.relay = true;
    group.add(core);
    const beacon = new THREE.PointLight(0xff9b3d, 1.5, 9);
    beacon.position.set(x, 2, z);
    group.add(beacon);
    relayCores.push({ core, beacon });
  }
  group.userData.relayCores = relayCores;

  const cableMaterial = new THREE.LineBasicMaterial({ color: 0x252b2e, transparent: true, opacity: 0.82 });
  for (const [from, to] of [[[-31, 10.5, -25], [31, 10.5, -25]], [[-31, 10.5, -25], [-31, 10.5, 25]], [[31, 10.5, -25], [31, 10.5, 25]]]) {
    const points = [new THREE.Vector3(...from), new THREE.Vector3((from[0] + to[0]) / 2, from[1] - 1.2, (from[2] + to[2]) / 2), new THREE.Vector3(...to)];
    const cableCurve = new THREE.CatmullRomCurve3(points);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 16, 0.018, 5, false), new THREE.MeshStandardMaterial({ color: 0x252b2e, roughness: 0.7, metalness: 0.3 }));
    group.add(cable);
  }

  const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xc6d5d8, emissive: 0x86b9c2, emissiveIntensity: 0.7, roughness: 0.3 });
  for (const [x, z] of [[-40, 0], [40, 0], [0, -28], [0, 28]]) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.8), markerMaterial);
    marker.position.set(x, 0.18, z);
    group.add(marker);
  }
  const { look } = map;
  scene.background = new THREE.Color(look.sky);
  scene.fog = new THREE.FogExp2(look.fog, look.fogDensity ?? 0.012);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(180, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(look.skyTop ?? 0x5d6b73) },
        horizon: { value: new THREE.Color(look.skyHorizon ?? look.fog) },
        bottom: { value: new THREE.Color(look.skyBottom ?? look.fog) },
      },
      vertexShader: 'varying vec3 vWorld; void main(){ vWorld=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform vec3 top;
        uniform vec3 horizon;
        uniform vec3 bottom;
        varying vec3 vWorld;
        void main() {
          float h = smoothstep(-40.0, 130.0, vWorld.y);
          float band = smoothstep(0.0, 0.34, h);
          vec3 low = mix(bottom, horizon, band);
          gl_FragColor = vec4(mix(low, top, smoothstep(0.34, 1.0, h)), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    }),
  );
  group.add(sky);
  group.add(new THREE.HemisphereLight(look.skyLight ?? 0xb4c4d2, look.groundLight ?? 0x3a4046, look.ambientIntensity ?? 1.5));
  const sun = new THREE.DirectionalLight(look.sunColor ?? 0xdfe6ec, look.sunIntensity ?? 1.8);
  sun.position.set(...(look.sunPosition ?? [-30, 60, 20]));
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -55;
  sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55;
  sun.shadow.camera.bottom = -55;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 130;
  sun.shadow.bias = -0.0002;
  group.add(sun);
  group.traverse((object) => {
    if (object.isMesh) {
      object.receiveShadow = true;
      object.castShadow = object.geometry.type !== 'PlaneGeometry'
        && !object.material.transparent
        && !object.material.isShaderMaterial
        && !object.material.isMeshBasicMaterial;
    }
  });
  scene.add(group);
  return group;
}
