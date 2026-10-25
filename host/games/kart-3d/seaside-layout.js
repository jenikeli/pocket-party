// Where Seaside Skyway's scenery stands (M7c), in the course's own coordinates (x right, z down the plan in
// seaside-skyway.js; the road runs from x -40 to 224 and z 0 to 291, at heights 0 to 10, over a sea at -30).
// Plain data, unit tested in Node (nothing tall reaches the road, no boat sits on an island). Drawn by
// host/games/kart-3d/seaside-scenery.js.

// Each island: its middle (x, z), its radius at the waterline and its height above the sea, and how many palms
// grow on it. Small islands sit under and around the road, low enough to pass beneath it; the four big ones far
// out are hills on the horizon, hazy in the fog.
export const ISLANDS = Object.freeze([
  { x: 170, z: 150, radius: 30, height: 7, palms: 12 },
  { x: 15, z: 85, radius: 24, height: 6, palms: 8 },
  { x: 108, z: 190, radius: 14, height: 4, palms: 4 },
  // The lighthouse's island, straight ahead of the start straight.
  { x: 290, z: -35, radius: 22, height: 6, palms: 3 },
  { x: -95, z: 210, radius: 20, height: 5, palms: 5 },
  { x: 320, z: 190, radius: 26, height: 8, palms: 6 },
  { x: 60, z: -80, radius: 16, height: 4, palms: 4 },
  { x: 170, z: 370, radius: 24, height: 6, palms: 6 },
  { x: -70, z: -60, radius: 12, height: 3, palms: 2 },
  { x: -330, z: 120, radius: 110, height: 70, palms: 0 },
  { x: 520, z: 220, radius: 130, height: 90, palms: 0 },
  { x: 140, z: -380, radius: 120, height: 65, palms: 0 },
  { x: 60, z: 540, radius: 130, height: 80, palms: 0 },
]);

// The lighthouse stands in the middle of this island (ISLANDS' index) and is this tall above it, so its lamp
// shows above the road from the start straight.
export const LIGHTHOUSE = Object.freeze({ island: 3, height: 34 });

// Sailboats bobbing in open water.
export const BOATS = Object.freeze([
  { x: 245, z: 95, heading: 0.4 },
  { x: -40, z: 165, heading: 2.1 },
  { x: 125, z: -45, heading: -0.3 },
  { x: 235, z: 300, heading: 1.2 },
  { x: -125, z: 60, heading: 2.8 },
  { x: 60, z: 330, heading: -1.9 },
]);

// Every island's beach rises this high over the outer fifth of its radius.
const BEACH_HEIGHT = 1;

// The island's height above the sea `distance` from its middle: a beach ring near the waterline, then a hill
// up to its top, rounded at the top. Zero beyond its radius.
export function islandHeightAt(island, distance) {
  const share = distance / island.radius;
  if (share >= 1) {
    return 0;
  }
  const beach = BEACH_HEIGHT * Math.min(1, (1 - share) / 0.2);
  const hill = share < 0.8 ? (island.height - BEACH_HEIGHT) * Math.cos(((share / 0.8) * Math.PI) / 2) : 0;
  return beach + hill;
}
