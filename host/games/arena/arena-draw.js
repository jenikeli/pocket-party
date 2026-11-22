// Draws Spirefall's arena once: a painted ground (meadow, lane paths, river, bridges, rim, crowd, see
// arena-ground.js and arena-rim.js) as one texture, plus the parts that move: foam drifting on the river and the
// lantern posts' glow. Used by renderer.js.

import { ARENA } from '../../../shared/arena-map.js';
import { createRng } from './rng.js';
import { TILE, ORIGIN_X, ORIGIN_Y } from './arena-view.js';
import { paintMeadow, paintLanes, paintRiver, paintBridges } from './arena-ground.js';
import { paintBackdrop, paintRim, paintCrowd } from './arena-rim.js';

const GROUND_KEY = 'arena-ground';
const FOAM_KEY = 'arena-foam';
const GLOW_KEY = 'arena-glow';
const FOAM_STREAKS = 18;

function makeTexture(scene, key, width, height, paint) {
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  const texture = scene.textures.createCanvas(key, width, height);
  paint(texture.getContext(), texture.getSourceImage());
  texture.refresh();
}

function paintFoam(context) {
  context.fillStyle = '#d8f4ff';
  context.beginPath();
  context.ellipse(24, 4, 22, 2.6, 0, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(40, 4, 6, 1.6, 0, 0, Math.PI * 2);
  context.fill();
}

function paintGlow(context) {
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,242,184,0.9)');
  gradient.addColorStop(1, 'rgba(255,242,184,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
}

// Foam streaks slide back and forth across the water, fading in and out, each on its own beat.
function addFoam(scene, random) {
  const top = ORIGIN_Y + ARENA.riverTop * TILE;
  const height = (ARENA.riverBottom - ARENA.riverTop) * TILE;
  for (let streak = 0; streak < FOAM_STREAKS; streak += 1) {
    const x = ORIGIN_X + 20 + random() * (ARENA.width * TILE - 100);
    const image = scene.add.image(x, top + 8 + random() * (height - 16), FOAM_KEY).setDepth(0.5).setAlpha(0);
    scene.tweens.add({ targets: image, x: x + 30 + random() * 30, alpha: 0.8, duration: 1800 + random() * 1500, yoyo: true, repeat: -1, delay: random() * 2000, ease: 'Sine.easeInOut' });
  }
}

function addLampGlow(scene, lamps, random) {
  for (const lamp of lamps) {
    const image = scene.add.image(lamp.x, lamp.y, GLOW_KEY).setDepth(0.5).setBlendMode(1).setAlpha(0.6);
    scene.tweens.add({ targets: image, alpha: 0.95, scale: 1.12, duration: 900 + random() * 900, yoyo: true, repeat: -1, delay: random() * 1000 });
  }
}

export function drawArena(scene) {
  const random = createRng(2024);
  let lamps = [];
  makeTexture(scene, GROUND_KEY, 1920, 1080, (context, canvas) => {
    paintBackdrop(context, canvas);
    paintCrowd(context, random);
    lamps = paintRim(context);
    paintMeadow(context, random);
    paintLanes(context, random);
    paintRiver(context, random);
    paintBridges(context);
  });
  makeTexture(scene, FOAM_KEY, 48, 8, paintFoam);
  makeTexture(scene, GLOW_KEY, 64, 64, paintGlow);
  scene.add.image(0, 0, GROUND_KEY).setOrigin(0, 0).setDepth(0);
  addFoam(scene, random);
  addLampGlow(scene, lamps, random);
}
