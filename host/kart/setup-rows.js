// What the kart races' host setup screens show of each player, and the phase a phone's setup view carries.
// Plain functions, unit tested in Node. Shared by host/games/kart-2d/ and host/games/kart-3d/ (their race-views.js
// and setup panels).

import { playerSetup } from './setup.js';
import { playersInSlotOrder } from '../roster.js';
import { KART_STEERING } from '../../shared/protocol.js';

// The phase a phone's view has on the setup screen, before every race (the shared kart controls know it by this
// name); each race's own phases are its RACE_PHASES.
export const SETUP_PHASE = 'setup';

// One row per player on the host's setup screen, in slot order: { player, controlsText, stateText, ready }. A
// player who joined while the screen was up is in `players`, so they get a row (and a kart) like the rest.
export function setupRows(setup, players) {
  return playersInSlotOrder(players).map((player) => {
    const { steering, autoAccelerate, ready } = playerSetup(setup, player.playerId);
    const steeringText = steering === KART_STEERING.TILT ? 'Tilt' : 'Stick';
    const stateText = !player.connected ? '(away)' : ready ? 'Ready' : 'Choosing...';
    return {
      player,
      controlsText: `${steeringText}, ${autoAccelerate ? 'auto-accelerate' : 'Go button'}`,
      stateText,
      ready: player.connected && ready,
    };
  });
}
