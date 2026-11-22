// Short-lived effects on the host's canvas, one per world event: spell rings, blasts, damage numbers, landing
// rings, death puffs, the Keep waking and "Tower down". Phaser tweens that remove themselves. Used by renderer.js,
// which hands over the events each frame.

import { cardById } from '../../../shared/arena-cards.js';
import { COLORS, TEAM_COLORS, FACTION_COLORS } from './palette.js';
import { TILE, toScreen } from './arena-view.js';

// Hits show a number only above this size, so a swarm does not fill the screen.
const NUMBER_THRESHOLD = 60;

export function createEffects(scene) {
  function ring(x, y, radius, color, seconds, fill = 0) {
    const point = toScreen(x, y);
    const graphics = scene.add.graphics().setDepth(4000).setPosition(point.x, point.y);
    graphics.lineStyle(4, color, 1);
    if (fill > 0) {
      graphics.fillStyle(color, fill);
      graphics.fillCircle(0, 0, radius * TILE);
    }
    graphics.strokeCircle(0, 0, radius * TILE);
    graphics.setScale(0.4);
    scene.tweens.add({ targets: graphics, scale: 1, alpha: 0, duration: seconds * 1000, onComplete: () => graphics.destroy() });
  }

  function floatText(x, y, text, color, size) {
    const point = toScreen(x, y);
    const label = scene.add.text(point.x, point.y - 20, text, { fontFamily: 'sans-serif', fontSize: `${size}px`, color, fontStyle: 'bold', stroke: '#1d1b2e', strokeThickness: 4 }).setOrigin(0.5).setDepth(6000);
    scene.tweens.add({ targets: label, y: label.y - 40, alpha: 0, duration: 900, onComplete: () => label.destroy() });
  }

  const handlers = {
    spellCast: (event) => ring(event.x, event.y, event.radius, TEAM_COLORS[event.team], 0.4),
    spell: (event) => ring(event.x, event.y, event.radius, FACTION_COLORS[cardById(event.cardId).faction], 0.5, 0.35),
    blast: (event) => ring(event.x, event.y, event.radius, COLORS.lamp, 0.35, 0.3),
    landed: (event) => ring(event.x, event.y, 0.9, TEAM_COLORS[event.team], 0.4),
    death: (event) => ring(event.x, event.y, 0.7, COLORS.foam, 0.4, 0.25),
    keepWake: (event) => ring(event.x, event.y, 5, COLORS.dawn, 0.9),
    hit: (event) => {
      if (event.amount >= NUMBER_THRESHOLD || event.towerId) {
        floatText(event.x, event.y, String(Math.round(event.amount)), '#ffffff', event.amount >= 150 ? 26 : 20);
      }
    },
    towerDown: (event) => {
      ring(event.x, event.y, 3, COLORS.danger, 0.8, 0.3);
      floatText(event.x, event.y, event.kind === 'keep' ? 'Keep down' : 'Tower down', '#ffe066', 34);
    },
  };

  return {
    handle(events) {
      events.forEach((event) => handlers[event.type]?.(event));
    },
  };
}
