// One tower on the host's canvas: a painted stone Warden or Keep with a lantern, a team-coloured roof, a banner with
// the team's crest (sun for Dawn, crescent for Dusk) and a health bar. The Keep sleeps behind closed shutters that
// swing open when it wakes; a fallen tower is a heap of rubble. createTowerSprite(scene, tower) returns
// { update(tower), destroy() }. Used by renderer.js.

import { COLORS, TEAM_COLORS } from './palette.js';
import { ATLAS_KEY, ART_SCALE, frameName, rigOf } from './atlas.js';
import { TILE, toScreen } from './arena-view.js';

const TEAM_NAMES = ['dawn', 'dusk'];
const SCALE = 1 / ART_SCALE;
const FLASH_MS = 90;
const SHUTTER_OPEN = 0.12;
// The Keep sits against the arena's edge, so its painting is drawn smaller to stay on the canvas.
const KEEP_SCALE = 0.72;

export function createTowerSprite(scene, tower) {
  const folder = tower.kind === 'keep' ? 'tower-keep' : 'tower-warden';
  const rig = rigOf(folder);
  const teamName = TEAM_NAMES[tower.team];
  const centre = toScreen(tower.x, tower.y);
  const drawScale = tower.kind === 'keep' ? KEEP_SCALE : 1;
  const baseY = centre.y + tower.h * TILE * 0.45;
  const width = tower.w * TILE;
  const shadow = scene.add.ellipse(centre.x, baseY + 2, width * 1.05, width * 0.4, 0x000000, 0.3).setDepth(1);
  const ring = scene.add.image(centre.x, baseY, ATLAS_KEY, frameName('team', `ring-${teamName}`)).setOrigin(0.5, 14 / 32).setScale((width * 0.95) / (60 * ART_SCALE)).setDepth(1);
  const root = scene.add.container(centre.x, baseY).setScale(drawScale).setDepth(baseY);
  const halo = scene.add.circle(0, 0, 26, COLORS.lamp, 0.25).setVisible(false);
  const bar = scene.add.graphics().setDepth(5000);
  const images = {};
  const wanted = ['body', 'lantern', 'shutterL', 'shutterR', `roof-${teamName}`, `banner-${teamName}`, 'rubble'];
  for (const name of wanted.filter((part) => rig.parts[part])) {
    const info = rig.parts[name];
    images[name] = scene.add.image(info.at[0], info.at[1], ATLAS_KEY, frameName(folder, name)).setOrigin(info.pivot[0] / info.w, info.pivot[1] / info.h).setScale(SCALE);
    root.add(images[name]);
  }
  const lantern = rig.parts.lantern;
  halo.setPosition(lantern.at[0], lantern.at[1]);
  root.addAt(halo, root.getIndex(images.lantern));
  const standing = Object.keys(images).filter((name) => name !== 'rubble');
  const state = { alive: null, awake: null, hp: -1, flashUntil: 0 };

  function openShutters(animate) {
    for (const [name, direction] of [['shutterL', 1], ['shutterR', -1]]) {
      if (!images[name]) {
        continue;
      }
      if (animate) {
        scene.tweens.add({ targets: images[name], scaleX: SCALE * SHUTTER_OPEN * direction, duration: 400, ease: 'Back.easeOut' });
      } else {
        images[name].setScale(SCALE * SHUTTER_OPEN * direction, SCALE);
      }
    }
  }

  function showState(current) {
    const first = state.alive === null;
    standing.forEach((name) => images[name].setVisible(current.alive));
    images.rubble.setVisible(!current.alive);
    ring.setAlpha(current.alive ? 1 : 0.4);
    halo.setVisible(current.alive && current.awake);
    const tint = current.awake ? 0xffffff : 0xb4aec8;
    standing.forEach((name) => images[name].setTint(tint));
    images.lantern.setVisible(current.alive && current.awake);
    if (current.awake) {
      openShutters(!first && state.awake === false);
    }
    state.alive = current.alive;
    state.awake = current.awake;
  }

  function drawBar(current) {
    bar.clear();
    if (!current.alive) {
      return;
    }
    const top = baseY - rig.height * drawScale - 10;
    bar.fillStyle(COLORS.ink, 0.85);
    bar.fillRect(centre.x - width / 2, top, width, 8);
    bar.fillStyle(current.hp / current.maxHp > 0.3 ? TEAM_COLORS[current.team] : COLORS.danger, 1);
    bar.fillRect(centre.x - width / 2, top, width * Math.max(current.hp / current.maxHp, 0), 8);
  }

  function update(current) {
    if (state.alive !== current.alive || state.awake !== current.awake) {
      showState(current);
    }
    const now = performance.now();
    if (current.hp < state.hp) {
      state.flashUntil = now + FLASH_MS;
    }
    if (current.alive) {
      const flashing = now < state.flashUntil;
      standing.forEach((name) => (flashing ? images[name].setTintFill(0xffffff) : images[name].setTint(current.awake ? 0xffffff : 0xb4aec8)));
      halo.setAlpha(0.2 + 0.1 * Math.sin(now / 300 + tower.x));
    }
    if (state.hp !== current.hp) {
      state.hp = current.hp;
      drawBar(current);
    }
  }

  function destroy() {
    root.destroy();
    shadow.destroy();
    ring.destroy();
    bar.destroy();
  }

  return { update, destroy };
}
