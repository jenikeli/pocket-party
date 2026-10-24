// Draws the 2D race's stadium track once, from the same numbers the rules use (host/games/kart-2d/track.js),
// so what you see is exactly where the walls are. Used by host/games/kart-2d/renderer.js.

import { TRACK } from './track.js';

const GRASS_COLOR = 0x1f3d2b;
const ROAD_COLOR = 0x3b404d;
const WALL_COLOR = 0xd9dde8;
const WALL_WIDTH = 8;
const CHECKER_SIZE = 10;
const TEXTURE_KEY = 'kart-2d-track';

// Phaser redraws a Graphics object's shapes every frame (cutting each arc into triangles again), which ran
// headless Chromium at 3 fps. The track never changes, so it is drawn once into a texture and shown as an image.
export function drawTrack(scene) {
  const graphics = scene.make.graphics({}, false);
  graphics.fillStyle(GRASS_COLOR).fillRect(0, 0, 1920, 1080);
  // The walls are drawn just outside the road, so a kart touching a wall looks like it touches the line.
  fillStadium(graphics, TRACK.outerRadius + WALL_WIDTH, WALL_COLOR);
  fillStadium(graphics, TRACK.outerRadius, ROAD_COLOR);
  fillStadium(graphics, TRACK.innerRadius, WALL_COLOR);
  fillStadium(graphics, TRACK.innerRadius - WALL_WIDTH, GRASS_COLOR);
  drawStartLine(graphics);
  graphics.generateTexture(TEXTURE_KEY, 1920, 1080);
  graphics.destroy();
  scene.add.image(0, 0, TEXTURE_KEY).setOrigin(0);
}

// A stadium shape: every point within `radius` of the centre segment. The arcs go clockwise on screen
// (y points down): the right end from top to bottom, then the left end from bottom to top.
function fillStadium(graphics, radius, color) {
  const leftX = TRACK.centerX - TRACK.halfLength;
  const rightX = TRACK.centerX + TRACK.halfLength;
  graphics.fillStyle(color);
  graphics.beginPath();
  graphics.arc(rightX, TRACK.centerY, radius, -Math.PI / 2, Math.PI / 2, false);
  graphics.lineTo(leftX, TRACK.centerY + radius);
  graphics.arc(leftX, TRACK.centerY, radius, Math.PI / 2, (3 * Math.PI) / 2, false);
  graphics.closePath();
  graphics.fillPath();
}

// A two-square-wide chequered line across the bottom straight, where lap distance is 0.
function drawStartLine(graphics) {
  const top = TRACK.centerY + TRACK.innerRadius;
  const rows = Math.ceil((TRACK.outerRadius - TRACK.innerRadius) / CHECKER_SIZE);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      graphics.fillStyle((row + column) % 2 === 0 ? 0xffffff : 0x111111);
      const height = Math.min(CHECKER_SIZE, TRACK.outerRadius - TRACK.innerRadius - row * CHECKER_SIZE);
      graphics.fillRect(TRACK.centerX - CHECKER_SIZE + column * CHECKER_SIZE, top + row * CHECKER_SIZE, CHECKER_SIZE, height);
    }
  }
}
