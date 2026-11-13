// What the kart races' host setup screens show of each player, and the phase a phone's setup view carries.
// Plain functions, unit tested in Node. Shared by host/games/kart-2d/ and host/games/kart-3d/ (their race-views.js
// and setup panels, through host/kart/player-rows.js).

import { playerSetup } from './setup.js';
import { playersInSlotOrder } from '../roster.js';
import { KART_STEERING } from '../../shared/protocol.js';

// The phase a phone's view has on the setup screen, before every race (the shared kart controls know it by this
// name); each race's own phases are its RACE_PHASES.
export const SETUP_PHASE = 'setup';

// One row per player on the host's setup screen, in slot order: { player, steering, autoAccelerate, ready, away }.
// A player who joined while the screen was up is in `players`, so they get a row (and a kart) like the rest. A
// dropped player is `away`, and never counts as ready, even if they were.
export function setupRows(setup, players) {
  return playersInSlotOrder(players).map((player) => {
    const { steering, autoAccelerate, ready } = playerSetup(setup, player.playerId);
    return { player, steering, autoAccelerate, ready: player.connected && ready, away: !player.connected };
  });
}

// The two small icons that say how a row's player drives, each { icon, label } (an icon name from
// shared/icons.js, and its words for the tooltip and screen readers).
export function styleIcons({ steering, autoAccelerate }) {
  return [
    steering === KART_STEERING.TILT ? { icon: 'tilt', label: 'Tilt' } : { icon: 'stick', label: 'Stick' },
    autoAccelerate ? { icon: 'auto', label: 'Auto-accelerate' } : { icon: 'go-button', label: 'Go button' },
  ];
}
