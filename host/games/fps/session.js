// A running Saltline match as the host handles it: the match, each phone's input (stick, look, buttons, loadout), a
// bot taking over a seat that a person left, and the private view each phone is shown. No DOM, unit tested. Used by
// index.js and tools/fps-sim.js.

import { INPUT_KINDS } from '../../../shared/protocol.js';
import { createMatch, stepMatch } from './match.js';
import { setStick, applyLook, press } from './player.js';
import { createBot } from './bots.js';
import { drainEvents } from './world.js';
import { matchView } from './views.js';

const BUTTONS = ['fire', 'ads', 'jump', 'crouch', 'reload', 'grenade', 'scores', 'cycleGrenade', 'use'];

// `people` is [{ id, name, team, primary, colorIndex }] with the phones' player ids as `id`.
export function createSession({ people, modeId, botLevel, seed, mapId }) {
  const match = createMatch({ modeId, people, botLevel, seed, mapId });
  const events = [];
  const playerOf = (id) => match.world.players.find((player) => player.id === id);

  // A phone's INPUT: stick, look, a button, or a loadout choice. Ignored for a player who is dead or not a person.
  function input(playerId, message) {
    const player = playerOf(playerId);
    if (!player || !player.human) {
      return;
    }
    if (message.kind === INPUT_KINDS.MOVE && Number.isFinite(message.x) && Number.isFinite(message.y)) {
      setStick(player, message.x, message.y);
    } else if (message.kind === INPUT_KINDS.LOOK && Number.isFinite(message.dx) && Number.isFinite(message.dy) && player.alive) {
      applyLook(player, Math.max(-1, Math.min(1, message.dx)), Math.max(-1, Math.min(1, message.dy)));
    } else if (message.kind === INPUT_KINDS.BUTTON && BUTTONS.includes(message.button)) {
      press(player, message.button, message.pressed === true, { lob: message.lob === true });
    }
  }

  function step(dt) {
    stepMatch(match, dt);
    events.push(...drainEvents(match.world));
  }

  // The person left for good: a bot takes over their body.
  function takeOver(playerId) {
    const player = playerOf(playerId);
    if (player?.human) {
      player.human = false;
      player.bot = createBot(2);
      player.stick = { x: 0, y: 0 };
    }
  }

  return {
    match, input, step, takeOver, playerOf,
    viewFor: (playerId) => (playerOf(playerId) ? matchView(match, playerOf(playerId)) : null),
    drainEvents: () => {
      events.push(...drainEvents(match.world));
      return events.splice(0);
    },
  };
}
