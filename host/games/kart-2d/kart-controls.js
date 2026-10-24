// Turns the INPUT messages from each player's phone into their kart's controls, { steer, accelerate, brake }.
// The race reads the latest controls every step instead of acting on each message, because the stick sends
// about 30 times a second and the race steps at 60. Plain data and functions, unit tested in Node.
// Used by host/games/kart-2d/index.js.

import { INPUT_KINDS, KART_BUTTONS } from '../../../shared/protocol.js';
import { NEUTRAL_CONTROLS } from './race.js';

// Returns { handleInput(playerId, input), controlsFor(player, autoAccelerate) }.
export function createControlsTable() {
  // playerId -> controls, from the newest input of each kind.
  const controlsByPlayer = new Map();

  // `input` is an INPUT message's input. Anything this game does not understand is ignored, since the values
  // come straight from a phone.
  function handleInput(playerId, input) {
    const controls = controlsByPlayer.get(playerId) ?? NEUTRAL_CONTROLS;
    controlsByPlayer.set(playerId, applyInput(controls, input));
  }

  // The controls the race should use now for `player` (a roster entry). A player whose phone dropped gets
  // neutral controls, or their kart would keep doing whatever the last message said (accelerate held when the
  // screen locked). What they held is forgotten too: after a rejoin their phone's buttons all start released,
  // so the kart waits for fresh input instead of driving off on its own. With `autoAccelerate` (the player's
  // control style) the kart accelerates whenever brake is not held; the phone has no Go button then.
  function controlsFor(player, autoAccelerate) {
    if (!player?.connected) {
      controlsByPlayer.delete(player?.playerId);
      return NEUTRAL_CONTROLS;
    }
    const controls = controlsByPlayer.get(player.playerId) ?? NEUTRAL_CONTROLS;
    return autoAccelerate ? { ...controls, accelerate: !controls.brake } : controls;
  }

  return { handleInput, controlsFor };
}

function applyInput(controls, input) {
  // The stick (drag) and the phone turned like a wheel (tilt) both give x from -1 to 1. Whichever the phone
  // sends steers, so the host does not care which one the player chose.
  const steers = input?.kind === INPUT_KINDS.DRAG || input?.kind === INPUT_KINDS.TILT;
  if (steers && Number.isFinite(input.x)) {
    // Only left and right steer; up and down are ignored.
    return { ...controls, steer: Math.min(Math.max(input.x, -1), 1) };
  }
  if (input?.kind === INPUT_KINDS.BUTTON && input.button === KART_BUTTONS.ACCELERATE) {
    return { ...controls, accelerate: input.pressed === true };
  }
  if (input?.kind === INPUT_KINDS.BUTTON && input.button === KART_BUTTONS.BRAKE) {
    return { ...controls, brake: input.pressed === true };
  }
  return controls;
}
