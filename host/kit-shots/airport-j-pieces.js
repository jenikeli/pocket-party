// The kit-shots pieces for the airport's ground vehicles (M9 task J): each prop by its name (baggage-train,
// uld-dolly, stair-truck, belt-loader, fuel-truck, follow-me-car), turned side-on to the road so the camera sees
// its whole length. Used by pieces.js.

import { buildProps } from '../games/kart-3d/kit/props.js';
import { kitPart } from '../games/kart-3d/kit/kit.js';
import { KIT_PARTS, PROP_REACH } from '../games/kart-3d/kit/layout-rules.js';
import { PIECE_S } from './landmark-pieces.js';

const VEHICLES = ['baggage-train', 'uld-dolly', 'stair-truck', 'belt-loader', 'fuel-truck', 'follow-me-car'];
// Vehicles stand clear of the road's edge by their reach, plus this; turned 90 degrees so they lie along the road.
const CLEARANCE = 0.5;
const SIDE_ON = 90;

function vehicleSpot(name, s) {
  return { piece: name, s, side: 'right', out: PROP_REACH[name] + CLEARANCE, turn: SIDE_ON };
}

function vehiclePiece(name, height) {
  const spot = vehicleSpot(name, PIECE_S);
  return {
    road: 'decked',
    build: (kit) => buildProps(kitPart(kit, KIT_PARTS.PROPS), [spot]),
    focus: { s: PIECE_S, side: 1, out: spot.out, height, size: PROP_REACH[name] * 2 },
  };
}

export const AIRPORT_J_PIECES = {
  'baggage-train': vehiclePiece('baggage-train', 1),
  'uld-dolly': vehiclePiece('uld-dolly', 1.2),
  'stair-truck': vehiclePiece('stair-truck', 1.6),
  'belt-loader': vehiclePiece('belt-loader', 1.5),
  'fuel-truck': vehiclePiece('fuel-truck', 1.5),
  'follow-me-car': vehiclePiece('follow-me-car', 0.7),
};
