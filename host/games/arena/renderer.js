// Draws a Spirefall match inside the game's container: a Phaser canvas with the arena, a sprite per tower and unit,
// projectiles, lava, the aiming ghosts and the effects. It only reads the match; the rules never see Phaser. Used by
// host/games/arena/index.js, which calls draw() from render().

import { startHandDrivenPhaser } from '/host/hand-driven-phaser.js';
import { ARENA, ownHalf } from '/shared/arena-map.js';
import { COLORS, TEAM_COLORS } from './palette.js';
import { TILE, ORIGIN_X, toScreen } from './arena-view.js';
import { spawnOffsets } from './placement.js';
import { drawArena } from './arena-draw.js';
import { createUnitSprite } from './unit-sprite.js';
import { createTowerSprite } from './tower-sprite.js';
import { createEffects } from './effects.js';
import { buildAtlas } from './atlas.js';

// Returns { draw({ match, alpha, ghosts, events }), destroy() }. `match` may be null (the setup screen shows the
// empty arena behind its panel).
export function createRenderer(container) {
  let scene = null;
  let dynamic = null;
  let effects = null;
  const unitSprites = new Map();
  const towerSprites = new Map();

  const phaser = startHandDrivenPhaser({
    parent: container,
    backgroundColor: '#10131c',
    create(newScene) {
      scene = newScene;
      buildAtlas(scene);
      drawArena(scene);
      dynamic = scene.add.graphics().setDepth(3000);
      effects = createEffects(scene);
    },
  });

  function syncTowers(world) {
    for (const tower of world?.towers ?? []) {
      if (!towerSprites.has(tower.id)) {
        towerSprites.set(tower.id, createTowerSprite(scene, tower));
      }
      towerSprites.get(tower.id).update(tower);
    }
    if (!world) {
      towerSprites.forEach((sprite) => sprite.destroy());
      towerSprites.clear();
    }
  }

  function syncUnits(world, alpha) {
    const alive = new Set((world?.units ?? []).map((unit) => unit.id));
    for (const [id, sprite] of unitSprites) {
      if (!alive.has(id)) {
        sprite.fadeOut();
        unitSprites.delete(id);
      }
    }
    for (const unit of world?.units ?? []) {
      if (!unitSprites.has(unit.id)) {
        unitSprites.set(unit.id, createUnitSprite(scene, unit));
      }
      unitSprites.get(unit.id).update(unit, alpha);
    }
  }

  function drawShots(world, alpha) {
    for (const shot of world.projectiles) {
      const point = toScreen(shot.previousX + (shot.x - shot.previousX) * alpha, shot.previousY + (shot.y - shot.previousY) * alpha);
      dynamic.fillStyle(TEAM_COLORS[shot.team], 1);
      dynamic.fillCircle(point.x, point.y, 6);
      dynamic.lineStyle(2, COLORS.ink, 1);
      dynamic.strokeCircle(point.x, point.y, 6);
    }
    for (const zone of world.zones) {
      const point = toScreen(zone.x, zone.y);
      dynamic.fillStyle(0xe8552f, 0.4);
      dynamic.fillCircle(point.x, point.y, zone.radius * TILE);
    }
  }

  // While a finger is down: the half the card may be played in, and the ghost where it would land.
  function drawGhosts(ghosts) {
    for (const { team, ghost, card } of ghosts) {
      if (card.type !== 'spell') {
        const half = ownHalf(team);
        dynamic.fillStyle(TEAM_COLORS[team], 0.1);
        dynamic.fillRect(ORIGIN_X, toScreen(0, half.y0).y, ARENA.width * TILE, (half.y1 - half.y0) * TILE);
      }
      if (ghost.x === null) {
        continue;
      }
      const color = ghost.legal ? TEAM_COLORS[team] : COLORS.danger;
      const centre = toScreen(ghost.x, ghost.y);
      if (card.type === 'spell') {
        dynamic.fillStyle(color, 0.2);
        dynamic.fillCircle(centre.x, centre.y, card.radius * TILE);
        dynamic.lineStyle(3, color, 0.9);
        dynamic.strokeCircle(centre.x, centre.y, card.radius * TILE);
        continue;
      }
      for (const [dx, dy] of spawnOffsets(card.count)) {
        const point = toScreen(ghost.x + dx, ghost.y + dy);
        dynamic.fillStyle(color, 0.45);
        dynamic.fillCircle(point.x, point.y, Math.max(card.radius * TILE, 9));
        dynamic.lineStyle(2, color, 1);
        dynamic.strokeCircle(point.x, point.y, Math.max(card.radius * TILE, 9));
      }
    }
  }

  function draw({ match, alpha, ghosts, events }) {
    if (scene) {
      const world = match?.world ?? null;
      syncTowers(world);
      syncUnits(world, alpha);
      dynamic.clear();
      if (world) {
        drawShots(world, alpha);
        drawGhosts(ghosts);
      }
      effects.handle(events);
    }
    phaser.drawFrame();
  }

  function destroy() {
    unitSprites.forEach((sprite) => sprite.destroy());
    towerSprites.forEach((sprite) => sprite.destroy());
    phaser.destroy();
  }

  return { draw, destroy };
}
