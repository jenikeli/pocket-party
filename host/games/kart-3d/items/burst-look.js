// Short bursts the items' looks set off (M8): shards of a broken item box, bright sparkles that glow on the High
// quality setting (bloom.js), and puffs of smoke. Each kind is a fixed pool, one draw call for the whole field,
// reused round and round (the oldest piece is taken when the pool is full), so a frame allocates nothing, and
// hidden while none of its pieces lives (the pools and clouds are burst-particles-look.js's). Only drawing: nothing
// here is game state. item-drawing.js makes one and hands it to each item drawing (item-box-look.js,
// kart-effect-looks.js).

import * as THREE from 'three';
import { createPool, createCloud } from './burst-particles-look.js';
import { createDotTexture } from '../effects.js';

const SHARD_COUNT = 48;
const SPARKLE_COUNT = 240;
const SMOKE_COUNT = 120;
// Shards fall, sparkles drift down slowly, smoke rises and slows (units/s², and a share of speed lost a second).
const SHARD_GRAVITY = 16;
const SPARKLE_GRAVITY = 2;
const SMOKE_LIFT = 1.5;
const SMOKE_DRAG = 3;
// Sparkles are brighter than white so bloom spreads them; their colours run through the item box's rainbow.
const SPARKLE_GLOW = 2.4;
const SPARKLE_HEXES = [0xff7ad9, 0xb47bff, 0x6fd2ff, 0x7dffc4, 0xfff27a, 0xffffff];
// Shards are the box's glass in its rainbow's colours (item-box-shapes-look.js), lit faintly from within so they
// stay bright on their shaded side.
const SHARD_HEXES = [0xff8ade, 0xb88cff, 0x86d8ff, 0x8affd0, 0xffffff];
const SHARD_GLOW_HEX = 0x50505a;
const SMOKE_HEX = 0xeef0f4;

// Returns { shards(position, count, size), sparkles(position, count, speed), smoke(position, count, reach),
// update(dt), dispose() }; positions are { x, y, z } in the world.
export function createBursts(scene) {
  const shardShape = new THREE.TetrahedronGeometry(1).scale(1, 0.25, 1);
  const shardMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.15, emissive: SHARD_GLOW_HEX, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
  });
  const shardMesh = new THREE.InstancedMesh(shardShape, shardMaterial, SHARD_COUNT);
  shardMesh.frustumCulled = false;
  const shardPool = createPool(SHARD_COUNT);
  const shardSpin = new Float32Array(SHARD_COUNT * 2);
  const shardSize = new Float32Array(SHARD_COUNT);
  const dotTexture = createDotTexture();
  const sparkleCloud = createCloud(SPARKLE_COUNT, 3, dotTexture, { size: 0.45, blending: THREE.AdditiveBlending });
  const sparklePool = createPool(SPARKLE_COUNT);
  const sparkleColors = new Float32Array(SPARKLE_COUNT * 3);
  const smokeCloud = createCloud(SMOKE_COUNT, 4, dotTexture, { size: 0.9, blending: THREE.NormalBlending });
  const smokePool = createPool(SMOKE_COUNT);
  // Visible until the first update (which shows each kind only while it has pieces alive), with nothing to show:
  // the renderer builds their shaders while the game starts (renderer.js compiles every visible thing) instead of
  // stalling on the first burst.
  // Shards start shrunk to nothing, each in its colour (given now: colouring later would change the shader).
  for (let index = 0; index < SHARD_COUNT; index += 1) {
    shardMesh.setMatrixAt(index, new THREE.Matrix4().makeScale(0, 0, 0));
    shardMesh.setColorAt(index, new THREE.Color(SHARD_HEXES[index % SHARD_HEXES.length]));
  }
  scene.add(shardMesh, sparkleCloud.points, smokeCloud.points);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Euler();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();

  // `count` shards about `size` units across fly out of `at` ({ x, y, z }) every way, mostly up.
  function shards(at, count, size) {
    for (let made = 0; made < count; made += 1) {
      const index = shardPool.emit(at, outward(3 + 3 * Math.random(), 3 + 3 * Math.random()), 0.9 + 0.4 * Math.random());
      shardSpin[index * 2] = (Math.random() - 0.5) * 18;
      shardSpin[index * 2 + 1] = (Math.random() - 0.5) * 18;
      shardSize[index] = size * (0.6 + 0.6 * Math.random());
    }
  }

  // `count` sparkles out of `at`, `speed` units/s outward at most.
  function sparkles(at, count, speed) {
    for (let made = 0; made < count; made += 1) {
      const index = sparklePool.emit(at, outward(speed * Math.random(), speed * (0.2 + 0.6 * Math.random())), 0.4 + 0.5 * Math.random());
      color.setHex(SPARKLE_HEXES[Math.floor(Math.random() * SPARKLE_HEXES.length)]).multiplyScalar(SPARKLE_GLOW);
      color.toArray(sparkleColors, index * 3);
    }
  }

  // `count` puffs of smoke round `at`, spreading `reach` units out in their first moment.
  function smoke(at, count, reach) {
    for (let made = 0; made < count; made += 1) {
      smokePool.emit(at, outward(reach * SMOKE_DRAG * (0.5 + 0.5 * Math.random()), reach * 2 * Math.random()), 0.5 + 0.4 * Math.random());
    }
  }

  function update(dt) {
    shardMesh.visible = shardPool.step(dt, -SHARD_GRAVITY, 0) > 0;
    sparkleCloud.points.visible = sparklePool.step(dt, -SPARKLE_GRAVITY, 0) > 0;
    smokeCloud.points.visible = smokePool.step(dt, SMOKE_LIFT, SMOKE_DRAG) > 0;
    for (let index = 0; index < SHARD_COUNT; index += 1) {
      const life = shardPool.share(index);
      const spin = 1 - life;
      rotation.set(shardSpin[index * 2] * spin, 0, shardSpin[index * 2 + 1] * spin);
      // Shards shrink away in their last third rather than vanish.
      scale.setScalar(shardSize[index] * Math.min(life * 3, 1));
      matrix.compose(shardPool.positionOf(index, position), quaternion.setFromEuler(rotation), scale);
      shardMesh.setMatrixAt(index, matrix);
    }
    shardMesh.instanceMatrix.needsUpdate = true;
    // Added light fades by darkening; the smoke fades by its alpha.
    sparkleCloud.write(sparklePool, (index, fade, colors) => {
      for (let channel = 0; channel < 3; channel += 1) {
        colors[index * 3 + channel] = sparkleColors[index * 3 + channel] * fade;
      }
    });
    color.setHex(SMOKE_HEX);
    smokeCloud.write(smokePool, (index, fade, colors) => {
      color.toArray(colors, index * 4);
      colors[index * 4 + 3] = 0.8 * fade;
    });
  }

  function dispose() {
    scene.remove(shardMesh, sparkleCloud.points, smokeCloud.points);
    shardMesh.dispose();
    shardShape.dispose();
    shardMaterial.dispose();
    sparkleCloud.dispose();
    smokeCloud.dispose();
    dotTexture.dispose();
  }

  return { shards, sparkles, smoke, update, dispose };
}

// A velocity spread out every way across the ground (`across` units/s) and up (`up`). One object, filled again
// for each particle, which the pool copies at once.
const velocity = { x: 0, y: 0, z: 0 };
function outward(across, up) {
  const angle = Math.random() * Math.PI * 2;
  velocity.x = Math.cos(angle) * across;
  velocity.y = up;
  velocity.z = Math.sin(angle) * across;
  return velocity;
}
