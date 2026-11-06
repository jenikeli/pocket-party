// The kit-shots pieces for the airfield's fittings and conveyor (M9, docs/queue.md's task K): the props runway-light,
// taxiway-sign, windsock and airport-floodlight by their names, and baggage-conveyor (a short one beside the road,
// lying along it). The barrier styles apron-rail and padded-barrier need no entry: pieces.js makes one for each
// style in BARRIER_STYLES. Used by pieces.js.

import { buildProps, spotFrame } from '../games/kart-3d/kit/props.js';
import { kitPart } from '../games/kart-3d/kit/kit.js';
import { KIT_PARTS, PROP_REACH } from '../games/kart-3d/kit/layout-rules.js';
import { buildBaggageConveyor } from '../games/kart-3d/kit/baggage-conveyor.js';
import { PIECE_S } from './landmark-pieces.js';

// Props stand clear of the road's edge by their reach, plus this.
const CLEARANCE = 0.8;

function fittingPiece(name, height, size) {
  const spot = { piece: name, s: PIECE_S, side: 'right', out: PROP_REACH[name] + CLEARANCE };
  return {
    road: 'decked',
    build: (kit) => buildProps(kitPart(kit, KIT_PARTS.PROPS), [spot]),
    focus: { s: PIECE_S, side: 1, out: spot.out, height, size },
  };
}

const CONVEYOR_LENGTH = 26;
const CONVEYOR_OUT = 4.5;

const CONVEYOR = {
  road: 'decked',
  build(kit) {
    const conveyor = buildBaggageConveyor(kitPart(kit, KIT_PARTS.PROPS), { length: CONVEYOR_LENGTH });
    conveyor.object.matrixAutoUpdate = false;
    conveyor.object.matrix.copy(spotFrame(kit.track, { s: PIECE_S, side: 'right', out: CONVEYOR_OUT, turn: 90 }));
    kitPart(kit, KIT_PARTS.PROPS).world.add(conveyor.object);
    conveyor.update(1.3);
  },
  focus: { s: PIECE_S, side: 1, out: CONVEYOR_OUT, height: 1.6, size: 9 },
};

export const AIRPORT_K_PIECES = {
  'runway-light': fittingPiece('runway-light', 0.4, 0.8),
  'taxiway-sign': fittingPiece('taxiway-sign', 1.2, 3),
  windsock: fittingPiece('windsock', 2.8, 5),
  'airport-floodlight': fittingPiece('airport-floodlight', 6, 9),
  'baggage-conveyor': CONVEYOR,
};
