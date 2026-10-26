// Where Seaside Skyway's surroundings stand (M7d3), in the course's own coordinates (x right, z down the plan in
// seaside-skyway.js; the road runs from x -40 to 224 and z 0 to 291, at heights 0 to 10, over a sea at -14).
// Round the seaside half: beach islands with palms and huts on stilts, a stone lighthouse ahead of the start
// straight, a giant Koopa shell half sunk off the first corner, sailboats. Round the sky half: islands floating
// at the road's height and above, clouds beside and under the high road, hot-air balloons, an airship circling.
// Far out: cliffs on the horizon. Plain data and maths, unit tested in Node (nothing reaches the road). Drawn by
// host/games/kart-3d/seaside-surroundings.js.

// Each beach island: its middle (x, z), its radius at the waterline, its height above the sea, how many palms
// grow on it and how many huts on stilts stand in its shallows.
export const BEACH_ISLANDS = Object.freeze([
  { x: 60, z: -58, radius: 20, height: 5, palms: 7, huts: 2 },
  { x: 100, z: 52, radius: 18, height: 5, palms: 7, huts: 2 },
  { x: 15, z: 85, radius: 20, height: 6, palms: 7, huts: 1 },
  { x: -100, z: 72, radius: 22, height: 5, palms: 8, huts: 2 },
  { x: -95, z: 215, radius: 18, height: 4, palms: 5, huts: 1 },
  { x: -70, z: -62, radius: 13, height: 3, palms: 3, huts: 0 },
  { x: 175, z: 395, radius: 20, height: 5, palms: 6, huts: 1 },
  { x: 330, z: 40, radius: 16, height: 4, palms: 4, huts: 1 },
]);

// The lighthouse's rocky island, straight ahead of the start straight, and how tall the tower is, so its dome
// shows above the road from the grid.
export const LIGHTHOUSE = Object.freeze({ x: 290, z: -35, radius: 20, height: 4, tower: 24 });

// The giant Koopa shell, half sunk in open water outside the first corner: its middle, radius and how far it
// is tipped over (radians).
export const KOOPA_SHELL = Object.freeze({ x: 262, z: 92, radius: 10, tilt: 0.35, heading: 0.8 });

// Sailboats rocking in open water.
export const BOATS = Object.freeze([
  { x: 165, z: -45, heading: 0.4 },
  { x: -10, z: -40, heading: 2.1 },
  { x: 250, z: 20, heading: -0.3 },
  { x: -60, z: 140, heading: 1.2 },
  { x: -150, z: 20, heading: 2.8 },
  { x: 40, z: 140, heading: -1.9 },
  { x: 300, z: 140, heading: 0.9 },
]);

// Islands floating in the sky round the high road: middle (x, z), the height of their grassy top (y), radius
// and how many round trees grow on it. The last four are big and farther out, high over the sea.
export const FLOATING_ISLANDS = Object.freeze([
  { x: 270, z: 200, y: 6, radius: 14, trees: 4 },
  { x: 280, z: 268, y: 22, radius: 15, trees: 4 },
  { x: 180, z: 350, y: 14, radius: 18, trees: 6 },
  // In the hairpin's U, between the paddock and the landing.
  { x: 113, z: 156, y: -3, radius: 7, trees: 3 },
  // Inside the sweeper, a little below the road, so it shows past the inside guardrail.
  { x: 179, z: 238, y: 2, radius: 17, trees: 6 },
  { x: 45, z: 300, y: 18, radius: 15, trees: 4 },
  { x: -25, z: 250, y: 7, radius: 11, trees: 3 },
  { x: 370, z: 130, y: 42, radius: 30, trees: 8 },
  { x: -190, z: 320, y: 48, radius: 32, trees: 8 },
  { x: 120, z: -190, y: 36, radius: 30, trees: 8 },
  { x: -230, z: -40, y: 30, radius: 26, trees: 6 },
]);

// Cliffs on the horizon rising from the sea, with grass on top: middle, radius and height above the sea.
export const BACKDROP_CLIFFS = Object.freeze([
  { x: -330, z: 150, radius: 80, height: 48 },
  { x: 480, z: 270, radius: 90, height: 58 },
  { x: 170, z: -360, radius: 95, height: 42 },
  { x: 60, z: 540, radius: 100, height: 52 },
]);

// Clouds round the sky half's high road, at its height and below it, as on MK8DX's Cloudtop Cruise: middle
// (its flat bottom's height y) and size (a cloud of size 1 is about 30 across and 7.5 tall).
export const NEAR_CLOUDS = Object.freeze([
  { x: 262, z: 178, y: -1, size: 0.75 },
  { x: 258, z: 240, y: 3, size: 0.6 },
  { x: 232, z: 335, y: 2, size: 0.8 },
  { x: 150, z: 338, y: 0, size: 0.6 },
  { x: 100, z: 292, y: 4, size: 0.5 },
  { x: 105, z: 205, y: -12, size: 0.5 },
  { x: 20, z: 285, y: -2, size: 0.6 },
  { x: -10, z: 205, y: -11, size: 0.45 },
]);

// Hot-air balloons drifting up and down over the sky half: where (y their basket's height) and the colours of
// their gores.
export const BALLOONS = Object.freeze([
  { x: 300, z: 230, y: 30, colors: [0xe8402f, 0xffd21e] },
  { x: 150, z: 380, y: 38, colors: [0x2f7fe8, 0xf6f6f2] },
  { x: 60, z: 330, y: 26, colors: [0x3fbf4f, 0xffd21e] },
  { x: 200, z: 140, y: 44, colors: [0xff8fc8, 0x8a4fd8] },
]);

// The airship flies round this circle, about the course's middle, once every `seconds`.
export const AIRSHIP_PATH = Object.freeze({ x: 90, z: 140, radius: 240, height: 58, seconds: 150 });

// How far out an island's shore is at `angle` (radians round its middle): the radius wobbled by two waves, so
// no two islands have the same outline, and the same on every host.
export function shoreRadius(island, angle) {
  const phase = island.x * 0.37 + island.z * 0.11;
  return island.radius * (1 + 0.12 * Math.sin(3 * angle + phase) + 0.07 * Math.sin(5 * angle + phase * 2.3));
}

// Every beach rises this high over the outer fifth of its island.
const BEACH_HEIGHT = 1;

// A beach island's height above the sea `share` of the way out to its shore (0 in the middle, 1 at the shore):
// a hill rounded at the top, then the beach. Below the sea past the shore, sloping down under the shallows.
export function islandHeightAt(island, share) {
  if (share > 1) {
    return -Math.min(2.4, (share - 1) * 6);
  }
  const beach = BEACH_HEIGHT * Math.min(1, (1 - share) / 0.2);
  const hill = share < 0.8 ? (island.height - BEACH_HEIGHT) * Math.cos(((share / 0.8) * Math.PI) / 2) : 0;
  return beach + hill;
}
