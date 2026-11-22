// One unit on the host's canvas: a puppet (puppet.js) over a soft shadow and a team ring with its crest (Dawn sun,
// Dusk crescent), a health bar once hurt, and marks for stun, slow and curse. Moves smoothly between sim steps.
// createUnitSprite(scene, unit) returns { update(unit, alpha), fadeOut(), destroy() }. Used by renderer.js.

import { COLORS, TEAM_COLORS } from './palette.js';
import { ATLAS_KEY, ART_SCALE, frameName } from './atlas.js';
import { TILE, toScreen } from './arena-view.js';
import { createPuppet } from './puppet.js';

const TEAM_PARTS = ['ring-dawn', 'ring-dusk'];
const RING_SCALE = 0.8;
// Units standing on the ground draw under everything else on the arena; fliers draw over all of it.
const GROUND_DEPTH = 1;
const BAR_DEPTH = 4500;
const MAX_FRAME_SECONDS = 0.1;

export function createUnitSprite(scene, unit) {
  const puppet = createPuppet(scene, unit);
  const { rig } = puppet;
  const [shadowWidth, shadowHeight] = rig.shadow;
  const shadow = scene.add.ellipse(0, 0, shadowWidth, shadowHeight, 0x000000, 0.3).setDepth(GROUND_DEPTH);
  const ring = scene.add.image(0, 0, ATLAS_KEY, frameName('team', TEAM_PARTS[unit.team])).setOrigin(0.5, 14 / 32).setDepth(GROUND_DEPTH);
  const glow = scene.add.ellipse(0, 0, 60 * RING_SCALE * rig.ring * 1.5, 32 * RING_SCALE * rig.ring * 1.5, TEAM_COLORS[unit.team], 0.4).setDepth(GROUND_DEPTH).setVisible(false);
  const overlay = scene.add.graphics().setDepth(BAR_DEPTH);
  const barWidth = Math.max(unit.def.radius * TILE * 2, 26);
  const top = rig.height + rig.lift;
  let last = null;
  let lastTime = performance.now();

  function drawBar(current) {
    if (current.hp < current.maxHp - 0.5) {
      overlay.fillStyle(COLORS.ink, 0.8);
      overlay.fillRect(-barWidth / 2, -top - 12, barWidth, 5);
      overlay.fillStyle(TEAM_COLORS[current.team], 1);
      overlay.fillRect(-barWidth / 2, -top - 12, barWidth * Math.max(current.hp / current.maxHp, 0), 5);
    }
    if (current.shield > 0) {
      overlay.fillStyle(COLORS.foam, 1);
      overlay.fillRect(-barWidth / 2, -top - 17, barWidth * Math.min(current.shield / current.def.traits.shield.amount, 1), 3);
    }
  }

  // Stun: three sparks circling the head. Slow: a blue diamond. Curse: a purple ring.
  function drawMarks(current, seconds) {
    const y = -top - 24;
    if (current.stun > 0) {
      overlay.fillStyle(0xffe066, 1);
      for (let spark = 0; spark < 3; spark += 1) {
        const angle = seconds * 6 + spark * 2.09;
        overlay.fillCircle(Math.cos(angle) * 9, y + Math.sin(angle) * 3, 2.5);
      }
    }
    if (current.slow.left > 0) {
      overlay.fillStyle(COLORS.river, 1);
      overlay.fillTriangle(-16, y, -12, y - 4, -8, y);
      overlay.fillTriangle(-16, y, -12, y + 4, -8, y);
    }
    if (current.curse.stacks > 0) {
      overlay.lineStyle(2, COLORS.dusk, 1);
      overlay.strokeCircle(14, y, 4);
    }
  }

  function update(current, alpha) {
    const x = current.previousX + (current.x - current.previousX) * alpha;
    const y = current.previousY + (current.y - current.previousY) * alpha;
    const point = toScreen(x, y);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, MAX_FRAME_SECONDS);
    lastTime = now;
    const moved = last ? Math.min(Math.hypot(x - last.x, y - last.y), 0.5) : 0;
    last = { x, y };
    const pose = puppet.update(point, dt, moved);
    const flying = current.def.flying;
    puppet.root.setDepth(point.y + (flying ? 2000 : 0));
    shadow.setPosition(point.x, point.y + 1).setScale(1 - 0.08 * pose.bob, 1 - 0.1 * pose.bob);
    ring.setPosition(point.x, point.y);
    const summoning = current.deployLeft > 0;
    const pulse = 1 + 0.6 * Math.max(puppet.state.landPulse, 0) / 0.35;
    ring.setScale((RING_SCALE * rig.ring * (summoning ? 1.5 : pulse)) / ART_SCALE);
    glow.setPosition(point.x, point.y).setVisible(summoning).setAlpha(0.3 + 0.2 * Math.sin(performance.now() / 120));
    overlay.setPosition(point.x, point.y).clear();
    drawBar(current);
    drawMarks(current, now / 1000);
  }

  // A unit that left the world: it swells a little and fades out over 0.35 s, then is removed.
  function fadeOut() {
    overlay.setVisible(false);
    glow.setVisible(false);
    scene.tweens.add({ targets: [puppet.root, ring, shadow], alpha: 0, duration: 350 });
    scene.tweens.add({ targets: puppet.root, scaleX: puppet.root.scaleX * 1.15, scaleY: puppet.root.scaleY * 1.15, duration: 350 });
    // After the tweens are done, so they never touch a destroyed object.
    scene.time.delayedCall(400, destroy);
  }

  let destroyed = false;
  function destroy() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    puppet.destroy();
    shadow.destroy();
    ring.destroy();
    glow.destroy();
    overlay.destroy();
  }

  return { update, destroy, fadeOut };
}
