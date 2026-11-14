// One of the 3D race's courses (courses.js), "Palm Bay Airport" (M9): our own layout of a sunny seaside airport,
// with the reference airport course as the style reference, not traced from it. About 1551 units a lap, about 50 s at
// 150cc. Unlike Seaside Skyway it runs on the ground: the airfield is at height 0, the sea at -8, and only the
// cutting and tunnel under the runway, the jump's ramp, the hangar's raised banked ring, the glide ramp and the
// glide leave it. Pieces are described in track-builder.js; distances along the lap (s) below are approximate.
//
// Seen from above (x right, z down the page) it is a figure-8: the start lobe runs clockwise, the hangar lobe
// counterclockwise, and they cross where the tunnel passes under the runway (at s 492-562 below, s 944 above;
// the runway is 8 higher there).
//
// Its parts, in the order they come:
//   s 0-150     start straight on the apron, the terminal on the left, the grid behind the line at 45, a row of
//               item boxes past it
//   s 150-229   the first corner, right round the control tower (radius 50)
//   s 259-321   left onto the taxiway (radius 40)
//   s 321-381   the taxiway, past its hangars and baggage carts
//   s 381-452   right toward the runway (radius 45)
//   s 452-596   down into the cutting (to -8), under the runway, and up out of it
//   s 596-628   the jump: a ramp up to 2.5 and a 16-long gap over the baggage conveyor (press Drift at the lip),
//               then a dash panel into the hangar
//   s 652-765   the hangar's anti-gravity ring: a left half circle (radius 36) banked to 60 degrees and raised to
//               10, with four spin posts on it
//   s 765-850   a straight out of the hangar
//   s 850-913   left onto the runway (radius 40)
//   s 913-1095  the runway, heading west, with a row of item boxes and a dash panel before its end
//   s 1095-1109 the glide ramp at the runway's end, over the seawall
//   s 1109-1199 the glide over the bay: the glider opens and floats down to the beach road
//   s 1199-1374 the beach road at -6, wide where the glide lands, then a right turn with sand on its inside
//   s 1374-1461 the S-bend, climbing back up to the apron
//   s 1481-1551 the last corner, 90 degrees right with grass on its inside to cut

export const PALM_BAY_AIRPORT = Object.freeze({
  id: 'palm-bay-airport',
  name: 'Palm Bay Airport',
  halfWidth: 9,
  startLine: 45,
  // Its look: the airfield's ground and road and the airport's dressing (airport-scenery.js).
  scenery: 'airport',
  // In the middle, where the racing line is pinned anyway: one on the jump's landing, into the hangar's ring (one
  // before the jump's ramp threw karts past the 24-long landing onto the ring's climbing bank), and one before the
  // glide ramp.
  dashPanels: [
    { s: 645, lateral: 0 },
    { s: 1080, lateral: 0 },
  ],
  // Rows of item boxes, on the start straight past the grid and on the runway.
  itemBoxRows: [125, 990],
  // The spin-boost posts in the hangar's anti-gravity ring, alternating sides.
  spinPosts: [
    { s: 685, lateral: -4 },
    { s: 705, lateral: 4 },
    { s: 725, lateral: -4 },
    { s: 745, lateral: 4 },
  ],
  pieces: [
    { straight: 150 },
    { turn: 90, radius: 50, halfWidth: 8 },
    { straight: 30 },
    { turn: -90, radius: 40 },
    { straight: 60 },
    { turn: 90, radius: 45 },
    { straight: 40, height: -8, halfWidth: 7 },
    { straight: 70 },
    { straight: 34, height: -1 },
    { straight: 16, height: 2.5, linear: true },
    { straight: 16, height: 0, linear: true, gap: true },
    { straight: 24, height: 0, halfWidth: 9 },
    { turn: -45, radius: 36, roll: -60, height: 10, antiGravity: true, halfWidth: 10 },
    { turn: -90, radius: 36, antiGravity: true },
    { turn: -45, radius: 36, roll: 0, height: 0, antiGravity: true },
    { straight: 85, halfWidth: 9 },
    { turn: -90, radius: 40, halfWidth: 10 },
    // The runway's length is what closes the loop.
    { straight: 182.28 },
    { straight: 14, height: 2.5, linear: true },
    { straight: 90, height: -6, linear: true, gap: true, glide: true, halfWidth: 12 },
    // Wide where the glide lands, narrowing round the turn (from 12 to 9 in 40 units with walls, a kart landing near
    // an edge rubbed the closing wall hard).
    { straight: 40, height: -6, halfWidth: 11 },
    { turn: 90, radius: 55, halfWidth: 9, shoulderRight: 8 },
    { straight: 48.39, halfWidth: 8 },
    { turn: -50, radius: 50, height: -3 },
    { turn: 50, radius: 50, height: 0 },
    { straight: 20 },
    { turn: 90, radius: 40, halfWidth: 9, shoulderRight: 10 },
  ],
});
