// The kit pieces the kit-shots page can show, by name: every barrier style, every prop and the start gate. Each
// entry says how to build the piece into a kit, which road to stand it on, and where the camera looks (its
// `focus`). Later parts of M7d4c add the pieces they rebuild here, so they get before-and-after picture sheets.
// M7d4c2's spike adds the palm made in Blender, alone and beside ours. Used by viewer.js.

import { buildBarriers } from '../games/kart-3d/kit/barriers.js';
import { buildProps } from '../games/kart-3d/kit/props.js';
import { buildStartGate } from '../games/kart-3d/kit/start-gate.js';
import { buildGrandstand } from '../games/kart-3d/kit/grandstand.js';
import { buildBunting } from '../games/kart-3d/kit/bunting.js';
import { spotFrame } from '../games/kart-3d/kit/props.js';
import { kitPart } from '../games/kart-3d/kit/kit.js';
import { GATE_THEME } from '../games/kart-3d/seaside-scenery.js';
import { BARRIER_STYLES, KIT_PARTS, PROP_REACH } from '../games/kart-3d/kit/layout-rules.js';
import { addBlenderPalms, loadBlenderPalm } from './blender-palm.js';

// Where the piece stands along the straight (its s); the start line is at 30 (viewer.js's track).
const PIECE_S = 40;
// Props stand this far past their own reach from the edge of the ground, so none touches the road's edge.
const PROP_CLEARANCE = 0.5;

// Every entry is { road, build(kit), focus }:
//   road   'walled' (a wall on both sides, no ground beside the road) or 'shouldered' (ground beside the right side)
//   build  adds the piece to the kit (kit/kit.js's createKit); may return a promise (a piece loaded from a file)
//   focus  what the camera looks at: { s, side, out, height, size }: where along the road, on which side (1 right,
//          0 the road's middle), how far out from the edge of the ground, how high, and how big the piece is
//          (its biggest side in units), which sets how far the camera stands back.

// A barrier style along the whole straight on both sides; the camera looks at the right-hand one.
function barrierPiece(style) {
  return {
    road: 'walled',
    build: (kit) => buildBarriers(kitPart(kit, KIT_PARTS.BARRIERS), [{ fromS: 0, toS: 1000, side: 'both', style }]),
    focus: { s: PIECE_S, side: 1, out: 0.6, height: 0.5, size: 1.2 },
  };
}

// One prop on the right-hand ground beside the straight, facing the road. The seaside's layout puts props on
// decks over the sea; here the road has a wide shoulder instead (viewer.js), ground at the road's height, the
// same as a deck's top.
function propPiece(name, size) {
  const out = PROP_REACH[name] + PROP_CLEARANCE;
  return {
    road: 'shouldered',
    build: (kit) => buildProps(kitPart(kit, KIT_PARTS.PROPS), [{ piece: name, s: PIECE_S, side: 'right', out }]),
    focus: { s: PIECE_S, side: 1, out, height: size / 2, size },
  };
}

// Each prop's height, about, which frames it.
const PROP_SIZES = {
  cone: 0.8, 'tyre-stack': 1.2, 'warp-pipe': 2, 'giant-mushroom': 6, 'mktv-van': 3, 'sponsor-stand': 3,
  'lantern-lamp': 5, 'triple-lamp': 6, floodlight: 12, palm: 8, parasol: 2.5, lounger: 1.2, surfboards: 2.5,
  'lifebuoy-post': 2, barrels: 1.2, 'round-tree': 6, hedge: 1.5, planter: 1.5,
};

// The gate over the start line in the seaside's colours, seen from behind the grid, as the karts see it.
const START_GATE = {
  road: 'walled',
  build: (kit) => buildStartGate(kitPart(kit, KIT_PARTS.GATE), GATE_THEME),
  focus: { s: 30, side: 0, out: 0, height: 4.5, size: 10 },
};

// A grandstand as long as Seaside's (seaside-layout.js) on the right-hand ground, placed as the dressings place
// theirs. The crowd stands still: nothing moves it on.
const GRANDSTAND_LENGTH = 44;
const GRANDSTAND = {
  road: 'shouldered',
  build(kit) {
    const props = kitPart(kit, KIT_PARTS.PROPS);
    const grandstand = buildGrandstand(GRANDSTAND_LENGTH, props);
    grandstand.object.matrixAutoUpdate = false;
    grandstand.object.matrix.copy(spotFrame(kit.track, { s: PIECE_S, side: 'right', out: PROP_CLEARANCE }));
    props.world.add(grandstand.object);
  },
  focus: { s: PIECE_S, side: 1, out: 4, height: 3.5, size: 12 },
};

// A string of bunting across the walled straight, seen from the road's middle as the karts drive under it.
const BUNTING = {
  road: 'walled',
  build: (kit) => buildBunting(kitPart(kit, KIT_PARTS.PROPS), [PIECE_S]),
  focus: { s: PIECE_S, side: 0, out: 0, height: 5, size: 8 },
};

// The palm made in Blender (blender-palm.js), where propPiece would stand ours.
const BLENDER_PALM = {
  road: 'shouldered',
  build: async (kit) => addBlenderPalms(kitPart(kit, KIT_PARTS.PROPS), await loadBlenderPalm(), [palmSpot(PIECE_S)]),
  focus: propPiece('palm', PROP_SIZES.palm).focus,
};

// Ours and Blender's side by side, the same way round: ours nearer the camera, Blender's farther along the road.
const PALM_GAP = 10;
const PALMS_SIDE_BY_SIDE = {
  road: 'shouldered',
  async build(kit) {
    buildProps(kitPart(kit, KIT_PARTS.PROPS), [palmSpot(PIECE_S - PALM_GAP / 2)]);
    addBlenderPalms(kitPart(kit, KIT_PARTS.PROPS), await loadBlenderPalm(), [palmSpot(PIECE_S + PALM_GAP / 2)]);
  },
  focus: { ...propPiece('palm', PROP_SIZES.palm).focus, size: PROP_SIZES.palm + PALM_GAP / 2 },
};

// Close up, the camera on the trunk's middle, to judge the detail a passing kart sees at a few metres.
const PALM_CLOSE_FOCUS = { ...propPiece('palm', PROP_SIZES.palm).focus, height: 3, size: 3 };

function palmSpot(s) {
  return { piece: 'palm', s, side: 'right', out: PROP_REACH.palm + PROP_CLEARANCE };
}

export const PIECES = {
  ...Object.fromEntries(Object.values(BARRIER_STYLES).map((style) => [style, barrierPiece(style)])),
  ...Object.fromEntries(Object.entries(PROP_SIZES).map(([name, size]) => [name, propPiece(name, size)])),
  'start-gate': START_GATE,
  grandstand: GRANDSTAND,
  bunting: BUNTING,
  'palm-blender': BLENDER_PALM,
  'palms-side-by-side': PALMS_SIDE_BY_SIDE,
  'palm-close': { ...propPiece('palm', PROP_SIZES.palm), focus: PALM_CLOSE_FOCUS },
  'palm-blender-close': { ...BLENDER_PALM, focus: PALM_CLOSE_FOCUS },
};
