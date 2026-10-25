// One of the 3D race's courses (courses.js), "Seaside Skyway" (M7b): our own layout, designed from the patterns of MK8DX's courses
// ("Course patterns" in docs/mk8dx-reference.md) for the tuned speeds and turns (tuning.js), not traced from any
// real course. About 1210 units a lap, about 40 s at 150cc, as MK8DX's laps are. The road floats over the sea,
// so leaving it where it has no wall means falling. Pieces are described in track-builder.js; distances along
// the lap (s) below are approximate.
//
// Seen from above (x right, z down the page), the loop runs clockwise. The corners are sized for a 150cc kart
// (32 units/s): a full drift into the turn holds a radius of about 25 to 30, a full normal turn about 27, and a
// purple mini-turbo needs about 2.8 s of hard drifting.
//
// Its parts, in the order they come, quiet and busy in turn as MK8DX paces a lap:
//   s 0-150     start straight, wide (18), the grid behind the line at 45
//   s 150-235   first corner: a 90 degree right sweeper, radius 55, long enough for orange sparks
//   s 235-340   a short straight, then a quick left-right chicane (the drift's side flips; blue sparks at most)
//   s 340-430   climb to height 10
//   s 430-570   the big sweeper: 180 degrees right, radius 45, wide (20) and banked 12 degrees, the corner
//               where a held drift reaches purple
//   s 570-630   a narrow bridge (13 wide) without walls, falling to height 4, with a dash panel
//   s 630-690   the jump: a ramp up to 8 and a 14-long gap that lands 5 lower (press Drift at the lip for a trick)
//   s 690-775   a left hairpin, radius 26, with grass on its inside to clip with a boost
//   s 775-855   a quiet, wide straight (20): where item boxes will go
//   s 855-960   the anti-gravity wall: the road rolls up to vertical round a right half circle (spin boosts)
//   s 960-1075  an S-bend, left then right, radius 54
//   s 1075-1150 a straight with grass on both sides and a dash panel
//   s 1150-1210 the last corner, 90 degrees right with wide grass on its inside: a mini-turbo cuts across it

export const SEASIDE_SKYWAY = Object.freeze({
  id: 'seaside-skyway',
  name: 'Seaside Skyway',
  halfWidth: 9,
  startLine: 45,
  // Islands, boats and clouds round it, and its trackside dressing (seaside-scenery.js, trackside.js).
  scenery: 'seaside',
  dashPanels: [
    // On the bridge before the jump: a boosted kart flies far.
    { s: 610, lateral: 0 },
    // On the grass straight, off the middle, so it is a line to choose.
    { s: 1100, lateral: -3 },
  ],
  pieces: [
    { straight: 150 },
    { turn: 90, radius: 55, halfWidth: 8 },
    { straight: 50 },
    { turn: -40, radius: 40 },
    { turn: 40, radius: 40 },
    { straight: 90, height: 10 },
    { turn: 90, radius: 45, roll: 12, halfWidth: 10 },
    { turn: 90, radius: 45, roll: 0 },
    { straight: 60, height: 4, halfWidth: 6.5, walls: 'none' },
    { straight: 16, height: 8, linear: true },
    { straight: 14, height: 3, linear: true, gap: true },
    { straight: 30, height: 0, halfWidth: 8 },
    { turn: -180, radius: 26, shoulderLeft: 6 },
    { straight: 80, halfWidth: 10 },
    { turn: 45, radius: 34, roll: 90, antiGravity: true, halfWidth: 8 },
    { turn: 90, radius: 34, antiGravity: true },
    { turn: 45, radius: 34, roll: 0, antiGravity: true },
    // The S-bend's radius and the next straight's length are what close the loop.
    { turn: -60, radius: 53.72 },
    { turn: 60, radius: 53.72 },
    { straight: 73.38, halfWidth: 7, shoulderLeft: 6, shoulderRight: 6 },
    { turn: 90, radius: 40, halfWidth: 9, shoulderRight: 10 },
  ],
});
