// The M6b test track, one of the 3D race's courses (courses.js): one of each thing the track model must handle,
// in a loop about 630 units long (a kart is 2): a start straight, a hill with no walls (the edge a kart can fall
// off), a flat turn, a jump ramp over a gap, a hairpin, a banked curve, a straight with off-road shoulders, and
// an anti-gravity curve that rolls the road up to a vertical wall and back. M6c added two dash panels: one
// before the jump and one on the off-road straight. The road floats over the sea, as on MK8DX's sky courses, so
// leaving it means falling. Pieces are described in track-builder.js; the unit tests check each feature at its
// known spot. Built before the M7a tuning, so at 32 units/s its hairpin needs braking.
//
// Seen from above (x right, z down the page), the loop runs clockwise: east along the start straight and over
// the hill, south through the turn, over the jump and round the hairpin, back north, west along the off-road
// straight, then round the wall back to the start.

export const TEST_TRACK = Object.freeze({
  id: 'test-track',
  name: 'Test track',
  // Dressed with the M7d kit's pieces, to look at them (test-track-scenery.js).
  scenery: 'test-track',
  // Road width 16, 8 kart lengths: a guess until it is measured from MK8DX footage.
  halfWidth: 8,
  // The grid sits on the start straight just behind this line.
  startLine: 34,
  // Distances along the centre line: the straight before the ramp runs from about 186 to 226, and the off-road
  // straight from about 434 to 524.
  dashPanels: [
    { s: 205, lateral: 0 },
    { s: 470, lateral: -3 },
  ],
  pieces: [
    { straight: 60 },
    // Hill: up 8 and down again, no walls on either side.
    { straight: 30, height: 8, walls: 'none' },
    { straight: 30, height: 0, walls: 'none' },
    { turn: 90, radius: 40 },
    // Jump: a 14 degree ramp up 4, then 12 units of nothing. At top speed a kart flies about 20 units; leaving
    // the lip under about 15 units per second, it falls short.
    { straight: 40 },
    { straight: 16, height: 4, linear: true },
    { straight: 12, height: 0, linear: true, gap: true },
    { straight: 30 },
    // Hairpin: tight enough that a kart must slow down (and, from M6c, drift) to get round.
    { turn: 180, radius: 20 },
    { straight: 40 },
    // Banked curve: a left turn leaning 20 degrees into it, at normal gravity.
    { turn: -45, radius: 30, roll: -20 },
    { turn: -45, radius: 30, roll: 0 },
    // Off-road: grass shoulders 6 wide beside the road, walls at their outer edge.
    { straight: 90, shoulderLeft: 6, shoulderRight: 6 },
    // Anti-gravity: the road rolls up to vertical round a half circle and back, karts driving on its inside.
    { turn: 45, radius: 34, roll: 90, antiGravity: true },
    { turn: 90, radius: 34, antiGravity: true },
    { turn: 45, radius: 34, roll: 0, antiGravity: true },
  ],
});
