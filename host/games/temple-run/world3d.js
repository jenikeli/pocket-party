// The temple run's 3D world: an ancient stone causeway, a wall you run along the top of with no walls beside it,
// rising out of a jungle that fills everything below, under a hazy sunset sky. The causeway is built one straight
// stretch at a time (with sharp corners, and pulsing gold arrows on the ground telling you which way to turn),
// plus the props on it (logs, beams, walls, fire, gaps, falling tiles, coins, powerups). Stretches and props are made as
// the cameras near them and dropped behind. All textures are drawn on canvases; nothing is loaded. Used by renderer.js.

import * as THREE from 'three';
import { obstaclesBetween, pickupsBetween, obstacleId, fireIsOn, OBSTACLE, PICKUP, TILE_FALL_DELAY } from './track.js';
import { pathPoint, straightSegments, LANE_WIDTH } from './path.js';

const BEHIND = 60;
const AHEAD = 170;
// Half the causeway's width, and how deep the wall under it goes.
const HALF = 1.5 * LANE_WIDTH + 1.1;
const DEPTH = 34;
const CANOPY_Y = -9;
const HAZE = 0xb7c59a;
const TREE_CHANCE_PER_UNIT = 0.9;

// A canvas of stone blocks with mortar, speckle and (optionally) moss, as a repeating texture.
function stoneTexture(base, cells, moss) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const cell = size / cells;
  for (let row = 0; row < cells; row += 1) {
    for (let column = 0; column < cells; column += 1) {
      const shift = (Math.random() - 0.5) * 34;
      const offset = row % 2 ? cell / 2 : 0;
      context.fillStyle = `rgb(${base[0] + shift},${base[1] + shift},${base[2] + shift})`;
      context.fillRect(column * cell + offset, row * cell, cell, cell);
      context.fillRect(column * cell + offset - size, row * cell, cell, cell);
    }
  }
  context.strokeStyle = 'rgba(25,18,10,0.7)';
  context.lineWidth = 3;
  for (let line = 0; line <= cells; line += 1) {
    context.beginPath();
    context.moveTo(0, line * cell);
    context.lineTo(size, line * cell);
    context.stroke();
    for (let column = 0; column <= cells; column += 1) {
      const x = column * cell + (line % 2 ? cell / 2 : 0);
      context.beginPath();
      context.moveTo(x, line * cell);
      context.lineTo(x, (line + 1) * cell);
      context.stroke();
    }
  }
  for (let speck = 0; speck < 1100; speck += 1) {
    context.fillStyle = `rgba(0,0,0,${Math.random() * 0.2})`;
    context.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  for (let patch = 0; patch < moss; patch += 1) {
    context.fillStyle = `rgba(${50 + Math.random() * 40},${100 + Math.random() * 50},40,${0.12 + Math.random() * 0.16})`;
    context.beginPath();
    context.ellipse(Math.random() * size, Math.random() * size, 6 + Math.random() * 22, 4 + Math.random() * 12, Math.random() * 3, 0, 7);
    context.fill();
  }
  return repeating(canvas);
}

function repeating(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Mottled leaves, for the jungle canopy seen from above.
function leafTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#2c5a28';
  context.fillRect(0, 0, size, size);
  for (let leaf = 0; leaf < 700; leaf += 1) {
    context.fillStyle = `rgba(${30 + Math.random() * 60},${90 + Math.random() * 90},${30 + Math.random() * 40},0.75)`;
    context.beginPath();
    context.ellipse(Math.random() * size, Math.random() * size, 5 + Math.random() * 14, 3 + Math.random() * 8, Math.random() * 3, 0, 7);
    context.fill();
  }
  return repeating(canvas);
}

function skyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#2c68b0');
  gradient.addColorStop(0.35, '#7fb0dc');
  gradient.addColorStop(0.55, '#f0cf98');
  gradient.addColorStop(0.7, '#d8c690');
  gradient.addColorStop(1, '#b7c59a');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 4, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Gold chevrons pointing along +x, for the turn arrows on the ground.
function arrowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.strokeStyle = '#ffcf4d';
  context.lineWidth = 22;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.shadowColor = '#ff9a1f';
  context.shadowBlur = 22;
  context.beginPath();
  context.moveTo(60, 20);
  context.lineTo(130, 64);
  context.lineTo(60, 108);
  context.moveTo(130, 20);
  context.lineTo(200, 64);
  context.lineTo(130, 108);
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,200,110,1)');
  gradient.addColorStop(0.4, 'rgba(255,130,40,0.45)');
  gradient.addColorStop(1, 'rgba(255,100,20,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

// A box whose texture coordinates repeat once per `tile` metres, so stone blocks keep their size on any length.
function tiledBox(width, height, length, tile) {
  const geometry = new THREE.BoxGeometry(width, height, length);
  const uv = geometry.attributes.uv;
  // BoxGeometry's faces, 4 vertices each: +x, -x, +y (top), -y, +z, -z.
  const scales = [[length, height], [length, height], [width, length], [width, length], [width, height], [width, height]];
  for (let face = 0; face < 6; face += 1) {
    for (let vertex = 0; vertex < 4; vertex += 1) {
      const index = face * 4 + vertex;
      uv.setXY(index, (uv.getX(index) * scales[face][0]) / tile, (uv.getY(index) * scales[face][1]) / tile);
    }
  }
  return geometry;
}

export function createWorld(scene) {
  const textures = {
    road: stoneTexture([118, 100, 78], 4, 5),
    wall: stoneTexture([104, 94, 82], 3, 26),
    leaf: leafTexture(),
    sky: skyTexture(),
    arrow: arrowTexture(),
    glow: glowTexture(),
  };
  textures.leaf.repeat.set(60, 60);
  scene.background = textures.sky;
  scene.fog = new THREE.Fog(HAZE, 45, 190);
  const materials = {
    top: new THREE.MeshStandardMaterial({ map: textures.road, roughness: 0.95 }),
    side: new THREE.MeshStandardMaterial({ map: textures.wall, roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ map: textures.wall, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1 }),
    vine: new THREE.MeshStandardMaterial({ color: 0x3f8a3f, roughness: 1 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 1 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
    canopy: new THREE.MeshStandardMaterial({ map: textures.leaf, roughness: 1 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x1d3a1c, roughness: 1 }),
    glow: new THREE.SpriteMaterial({ map: textures.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
    coin: new THREE.MeshStandardMaterial({ color: 0xffc933, emissive: 0x6a4a00, metalness: 0.7, roughness: 0.3 }),
    magnet: new THREE.MeshStandardMaterial({ color: 0xe03030, emissive: 0x401010, roughness: 0.4 }),
    shield: new THREE.MeshStandardMaterial({ color: 0x4cc9f0, emissive: 0x104050, roughness: 0.3, flatShading: true }),
    boost: new THREE.MeshStandardMaterial({ color: 0xff8a1f, emissive: 0x5a2a00, roughness: 0.4 }),
    fire: new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.92 }),
    fireCore: new THREE.MeshBasicMaterial({ color: 0xffd23f }),
    hole: new THREE.MeshBasicMaterial({ color: 0x030303 }),
    tile: new THREE.MeshStandardMaterial({ map: textures.road, color: 0xe0a070, roughness: 0.9 }),
  };
  const halo = { magnet: 0xe03030, shield: 0x4cc9f0, boost: 0xff8a1f };
  const shapes = {
    curb: new THREE.BoxGeometry(0.5, 0.32, 1),
    post: new THREE.BoxGeometry(0.62, 0.7, 0.62),
    treeTrunk: new THREE.CylinderGeometry(0.45, 0.75, 1, 6),
    treeLeaves: new THREE.IcosahedronGeometry(1, 1),
    arrow: new THREE.PlaneGeometry(4.2, 2.1).rotateX(-Math.PI / 2),
    log: new THREE.CylinderGeometry(0.3, 0.3, LANE_WIDTH * 0.95, 14),
    gatePost: new THREE.CylinderGeometry(0.18, 0.18, 2.2, 12),
    beam: new THREE.CylinderGeometry(0.3, 0.3, LANE_WIDTH, 14),
    vine: new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6),
    wall: new THREE.BoxGeometry(LANE_WIDTH * 0.96, 2.6, 0.9),
    cap: new THREE.BoxGeometry(LANE_WIDTH * 1.0, 0.12, 1.0),
    coin: new THREE.CylinderGeometry(0.3, 0.3, 0.08, 20).rotateX(Math.PI / 2),
    magnet: new THREE.TorusGeometry(0.26, 0.09, 10, 18, Math.PI),
    shield: new THREE.IcosahedronGeometry(0.36, 1),
    boost: new THREE.ConeGeometry(0.28, 0.7, 12).rotateX(-Math.PI / 2),
    halo: new THREE.RingGeometry(0.5, 0.58, 28),
    brazier: new THREE.CylinderGeometry(0.5, 0.62, 0.3, 14),
    fireFlame: new THREE.ConeGeometry(0.32, 1.5, 10).translate(0, 0.75, 0),
    fireCore: new THREE.ConeGeometry(0.17, 1.0, 10).translate(0, 0.5, 0),
    hole: new THREE.BoxGeometry(LANE_WIDTH * 0.98, 0.03, 3.2),
    lip: new THREE.BoxGeometry(LANE_WIDTH * 0.98, 0.1, 0.16),
    tile: new THREE.BoxGeometry(LANE_WIDTH * 0.96, 0.14, 3),
  };
  const haloMaterials = Object.fromEntries(Object.entries(halo).map(([kind, color]) => [kind, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })]));

  // The jungle: a leafy canopy plane and a dark floor that follow the action, so the causeway always stands above it.
  const canopy = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), materials.canopy);
  canopy.position.y = CANOPY_Y;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), materials.floor);
  floor.position.y = -40;
  scene.add(canopy, floor);

  let currentKey = null;
  let segmentList = [];
  let coveredTo = -1;
  const built = new Map();
  const props = new Map();

  // Whether (x, z) lies on or just beside the causeway of `segment`, so no tree grows through it.
  function nearRoad(segment, x, z) {
    if (!segment) {
      return false;
    }
    const forwardX = Math.sin(segment.heading);
    const forwardZ = -Math.cos(segment.heading);
    const along = (x - segment.startX) * forwardX + (z - segment.startZ) * forwardZ;
    const across = (x - segment.startX) * Math.cos(segment.heading) + (z - segment.startZ) * Math.sin(segment.heading);
    const length = Math.hypot(segment.endX - segment.startX, segment.endZ - segment.startZ);
    return along > -HALF - 4 && along < length + HALF + 4 && Math.abs(across) < HALF + 4;
  }

  // Trees on both sides, below and beside the causeway: instanced trunks and leaf clumps.
  function buildTrees(group, index, segment, length, first) {
    const count = Math.floor(length * TREE_CHANCE_PER_UNIT);
    const trunks = new THREE.InstancedMesh(shapes.treeTrunk, materials.trunk, count);
    const leaves = new THREE.InstancedMesh(shapes.treeLeaves, materials.leaves, count);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    let placed = 0;
    for (let tree = 0; tree < count; tree += 1) {
      const along = first + Math.random() * length;
      const side = Math.random() < 0.5 ? -1 : 1;
      const across = side * (HALF + 3 + Math.random() * 38);
      const x = segment.startX + Math.sin(segment.heading) * along + Math.cos(segment.heading) * across;
      const z = segment.startZ - Math.cos(segment.heading) * along + Math.sin(segment.heading) * across;
      if (nearRoad(segmentList[index - 1], x, z) || nearRoad(segmentList[index + 1], x, z)) {
        continue;
      }
      const height = 7 + Math.random() * 14;
      const radius = 3 + Math.random() * 3.5;
      matrix.makeScale(1, height, 1).setPosition(x, CANOPY_Y - 2 + height / 2, z);
      trunks.setMatrixAt(placed, matrix);
      matrix.makeScale(radius, radius * 0.7, radius).setPosition(x, CANOPY_Y - 2 + height, z);
      leaves.setMatrixAt(placed, matrix);
      leaves.setColorAt(placed, color.setHSL(0.27 + Math.random() * 0.08, 0.5, 0.2 + Math.random() * 0.16));
      placed += 1;
    }
    trunks.count = placed;
    leaves.count = placed;
    group.add(trunks, leaves);
    return [trunks, leaves];
  }

  // One straight stretch: the stone wall with the walkway on top, curbs and posts along its edges, and, at its end,
  // the pulsing gold arrows that point the way to turn. The corner is a full square of stone belonging to the
  // stretch that ends there; the next stretch starts after it, with the turn side left open as the way through.
  function buildSegment(index) {
    const segment = segmentList[index];
    const group = new THREE.Group();
    const length = Math.hypot(segment.endX - segment.startX, segment.endZ - segment.startZ);
    const forwardX = Math.sin(segment.heading);
    const forwardZ = -Math.cos(segment.heading);
    const hasCorner = index < segmentList.length - 1;
    const first = index > 0 ? HALF : 0;
    const last = length + (hasCorner ? HALF : 0);
    const place = (object, along, across, y) => {
      object.position.set(
        segment.startX + forwardX * along + Math.cos(segment.heading) * across, y,
        segment.startZ + forwardZ * along + Math.sin(segment.heading) * across,
      );
      object.rotation.y = -segment.heading;
      return object;
    };
    const geometries = [];
    const bodyGeometry = tiledBox(HALF * 2, DEPTH, last - first, 4);
    geometries.push(bodyGeometry);
    const body = new THREE.Mesh(bodyGeometry, [materials.side, materials.side, materials.top, materials.side, materials.side, materials.side]);
    group.add(place(body, (first + last) / 2, 0, -DEPTH / 2));
    // The turn side's curb stops where the corner square starts, leaving the way into the next stretch.
    const curbEnd = (side) => (hasCorner && (segment.turn === 'right' ? side === 1 : side === -1) ? length - HALF : last);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Matrix4().makeRotationY(-segment.heading);
    const posts = new THREE.InstancedMesh(shapes.post, materials.stone, Math.ceil((last - first) / 9) * 2);
    let postCount = 0;
    for (const side of [-1, 1]) {
      const end = curbEnd(side);
      const curbGeometry = shapes.curb.clone().scale(1, 1, end - first);
      geometries.push(curbGeometry);
      group.add(place(new THREE.Mesh(curbGeometry, materials.stone), (first + end) / 2, side * (HALF - 0.25), 0.16));
      for (let along = first + 4; along < end - 1; along += 9) {
        const across = side * (HALF - 0.31);
        matrix.copy(rotation).setPosition(
          segment.startX + forwardX * along + Math.cos(segment.heading) * across, 0.35,
          segment.startZ + forwardZ * along + Math.sin(segment.heading) * across,
        );
        posts.setMatrixAt(postCount, matrix);
        postCount += 1;
      }
    }
    posts.count = postCount;
    group.add(posts);
    if (hasCorner) {
      const capGeometry = shapes.curb.clone().scale(1, 1, HALF * 2).rotateY(Math.PI / 2);
      geometries.push(capGeometry);
      group.add(place(new THREE.Mesh(capGeometry, materials.stone), last - 0.25, 0, 0.16));
    }
    const instanced = buildTrees(group, index, segment, last - first, first);
    const arrows = [];
    if (hasCorner) {
      [22, 17, 12].forEach((back) => {
        const arrowMaterial = new THREE.MeshBasicMaterial({ map: textures.arrow, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
        const arrow = place(new THREE.Mesh(shapes.arrow, arrowMaterial), length - back, 0, 0.04);
        arrow.scale.x = segment.turn === 'left' ? -1 : 1;
        arrows.push(arrowMaterial);
        group.add(arrow);
      });
    }
    group.userData = { geometries, instanced, arrows };
    return group;
  }

  function dropSegment(group) {
    scene.remove(group);
    group.userData.geometries.forEach((geometry) => geometry.dispose());
    group.userData.instanced.forEach((mesh) => mesh.dispose());
    group.userData.arrows.forEach((material) => material.dispose());
  }

  function makeProp(seed, item) {
    const holder = new THREE.Group();
    const point = pathPoint(seed, item.z, (item.lane - 1) * LANE_WIDTH);
    holder.position.set(point.x, 0, point.z);
    holder.rotation.y = -point.heading;
    const add = (geometry, material, x, y, z) => {
      const part = new THREE.Mesh(geometry, material);
      part.position.set(x, y, z);
      holder.add(part);
      return part;
    };
    if (item.type === OBSTACLE.LOW) {
      add(shapes.log, materials.wood, 0, 0.3, 0).rotation.z = Math.PI / 2;
    } else if (item.type === OBSTACLE.HIGH) {
      add(shapes.gatePost, materials.stone, -LANE_WIDTH * 0.47, 1.1, 0);
      add(shapes.gatePost, materials.stone, LANE_WIDTH * 0.47, 1.1, 0);
      add(shapes.beam, materials.wood, 0, 1.55, 0).rotation.z = Math.PI / 2;
      for (const x of [-0.7, -0.2, 0.3, 0.8]) {
        add(shapes.vine, materials.vine, x, 1.0, 0);
      }
    } else if (item.type === OBSTACLE.WALL) {
      add(shapes.wall, materials.stone, 0, 1.3, 0);
      add(shapes.cap, materials.wood, 0, 2.62, 0);
    } else if (item.type === OBSTACLE.FIRE) {
      add(shapes.brazier, materials.stone, 0, 0.15, 0);
      const flames = new THREE.Group();
      flames.position.y = 0.3;
      flames.add(new THREE.Mesh(shapes.fireFlame, materials.fire), new THREE.Mesh(shapes.fireCore, materials.fireCore));
      holder.add(flames);
      const glow = new THREE.Sprite(materials.glow);
      glow.position.y = 1;
      holder.add(glow);
      holder.userData = { fire: { flames, glow, z: item.z } };
    } else if (item.type === OBSTACLE.GAP) {
      add(shapes.hole, materials.hole, 0, 0.02, 0);
      add(shapes.lip, materials.stone, 0, 0.05, -1.55);
      add(shapes.lip, materials.stone, 0, 0.05, 1.55);
    } else if (item.type === OBSTACLE.TILE) {
      add(shapes.hole, materials.hole, 0, 0.02, 0);
      holder.userData = { tile: add(shapes.tile, materials.tile, 0, 0.09, 0), id: obstacleId(item) };
    } else {
      const bob = new THREE.Group();
      holder.add(bob);
      const piece = new THREE.Mesh(shapes[item.kind], materials[item.kind]);
      bob.add(piece);
      if (item.kind !== PICKUP.COIN) {
        bob.add(new THREE.Mesh(shapes.halo, haloMaterials[item.kind]));
      }
      bob.position.y = item.kind === PICKUP.COIN ? 0.95 : 1.05;
      holder.userData = { bob, spins: item.kind === PICKUP.COIN ? piece : null, pickup: true };
    }
    return holder;
  }

  function clearAll() {
    built.forEach(dropSegment);
    built.clear();
    props.forEach((holder) => scene.remove(holder));
    props.clear();
    segmentList = [];
    coveredTo = -1;
  }

  // Builds what lies between `near` and `far` (the distances along the corridor the cameras need) and drops what
  // fell behind. `state` is { collected: the taken pickup ids, fallen: tile id -> when it began to fall, hazards:
  // whether fire, gaps and tiles are on }.
  function update(seed, near, far, state, time) {
    const worldKey = `${seed}:${state.hazards}`;
    if (worldKey !== currentKey) {
      clearAll();
      currentKey = worldKey;
    }
    if (far + AHEAD + 100 > coveredTo) {
      coveredTo = far + AHEAD + 500;
      segmentList = straightSegments(seed, coveredTo);
    }
    segmentList.forEach((segment, index) => {
      const wanted = segment.z1 >= near - BEHIND && segment.z0 <= far + AHEAD;
      if (wanted && !built.has(index)) {
        const group = buildSegment(index);
        built.set(index, group);
        scene.add(group);
      } else if (!wanted && built.has(index)) {
        dropSegment(built.get(index));
        built.delete(index);
      }
    });
    const centre = pathPoint(seed, (near + far) / 2);
    canopy.position.x = floor.position.x = centre.x;
    canopy.position.z = floor.position.z = centre.z;
    built.forEach((group) => group.userData.arrows.forEach((material, number) => (material.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(time * 7 - number * 1.3)))));
    syncProps(seed, near - BEHIND / 2, far + AHEAD - 20, state, time);
  }

  // Fire jets flare and die down on their cycle (a red flicker warns just before); a falling tile shakes and drops.
  function animateHazard(userData, state, time) {
    if (userData.fire) {
      const { flames, glow, z } = userData.fire;
      const burning = fireIsOn(time, z);
      const warning = !burning && fireIsOn(time + 0.45, z);
      const size = burning ? 1 + 0.12 * Math.sin(time * 30 + z) : warning ? 0.18 : 0.001;
      flames.scale.set(burning ? 1 : 0.5, size, burning ? 1 : 0.5);
      glow.visible = burning;
      glow.scale.setScalar(3.2 + Math.sin(time * 25));
    } else if (userData.tile) {
      const { tile, id } = userData;
      const since = state.fallen.has(id) ? time - state.fallen.get(id) : -1;
      tile.visible = since < TILE_FALL_DELAY + 0.8;
      tile.rotation.set(0, 0, 0);
      tile.position.y = 0.09;
      if (since >= 0 && since < TILE_FALL_DELAY) {
        tile.position.y += Math.abs(Math.sin(since * 50)) * 0.06;
        tile.rotation.z = Math.sin(since * 60) * 0.04;
      } else if (since >= TILE_FALL_DELAY) {
        const fall = since - TILE_FALL_DELAY;
        tile.position.y -= fall * fall * 18;
        tile.rotation.x = fall * 3;
      }
    }
  }

  function syncProps(seed, from, to, state, time) {
    const wanted = new Map();
    for (const obstacle of obstaclesBetween(seed, from, to, state.hazards)) {
      wanted.set(obstacleId(obstacle), obstacle);
    }
    for (const pickup of pickupsBetween(seed, from, to)) {
      if (!state.collected.has(pickup.id)) {
        wanted.set(pickup.id, { ...pickup, type: 'pickup' });
      }
    }
    for (const [key, holder] of props) {
      if (!wanted.has(key)) {
        scene.remove(holder);
        props.delete(key);
      }
    }
    for (const [key, item] of wanted) {
      if (!props.has(key)) {
        const holder = makeProp(seed, item);
        props.set(key, holder);
        scene.add(holder);
      }
    }
    props.forEach((holder) => {
      animateHazard(holder.userData, state, time);
      if (holder.userData.pickup) {
        const { bob, spins } = holder.userData;
        bob.position.y += (0.95 + Math.sin(time * 3 + holder.position.x) * 0.08 - bob.position.y) * 0.5;
        (spins ?? bob).rotation.y = time * 4;
      }
    });
  }

  function dispose() {
    clearAll();
    scene.remove(canopy, floor);
    canopy.geometry.dispose();
    floor.geometry.dispose();
    Object.values(shapes).forEach((shape) => shape.dispose());
    Object.values(materials).forEach((item) => item.dispose());
    Object.values(haloMaterials).forEach((item) => item.dispose());
    Object.values(textures).forEach((texture) => texture.dispose());
  }

  return { update, dispose };
}
