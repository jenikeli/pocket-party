// A picture for one of the kit's textures, worked out pixel by pixel in plain memory and written to a canvas
// once at the end: drawing many small shapes on a canvas and reading it back took seconds in a software-drawn
// browser (M7c). Pixels wrap round the edges, so a tile drawn with it repeats without a seam. Colours are
// [r, g, b] in 0..255. Used by the kit's pieces that draw textures.

import { createCanvas, canvasTexture, repeatingTexture } from '../canvas-texture.js';

// Returns { width, height, fill, mix, dot, rect, toCanvas, toTexture }.
export function createPixelImage(width, height) {
  const pixels = new Float32Array(width * height * 3);
  const offsetOf = (x, y) => ((((Math.round(y) % height) + height) % height) * width + (((Math.round(x) % width) + width) % width)) * 3;

  // Every pixel from colorAt(x, y), x and y counted in pixels.
  function fill(colorAt) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        pixels.set(colorAt(x, y), offsetOf(x, y));
      }
    }
  }

  // Blends the pixel at (x, y) toward `rgb` by `amount` (0 keeps it, 1 replaces it).
  function mix(x, y, rgb, amount = 1) {
    const offset = offsetOf(x, y);
    for (let channel = 0; channel < 3; channel += 1) {
      pixels[offset + channel] += (rgb[channel] - pixels[offset + channel]) * amount;
    }
  }

  // A round dot of `radius` pixels, its edge pixel half blended so it looks round even when small.
  function dot(centreX, centreY, radius, rgb) {
    const reach = Math.ceil(radius + 0.5);
    for (let y = -reach; y <= reach; y += 1) {
      for (let x = -reach; x <= reach; x += 1) {
        const distance = Math.hypot(x + Math.round(centreX) - centreX, y + Math.round(centreY) - centreY);
        const amount = Math.min(Math.max(radius + 0.5 - distance, 0), 1);
        if (amount > 0) {
          mix(Math.round(centreX) + x, Math.round(centreY) + y, rgb, amount);
        }
      }
    }
  }

  function rect(left, top, rectWidth, rectHeight, rgb, amount = 1) {
    for (let y = Math.round(top); y < Math.round(top + rectHeight); y += 1) {
      for (let x = Math.round(left); x < Math.round(left + rectWidth); x += 1) {
        mix(x, y, rgb, amount);
      }
    }
  }

  function toCanvas() {
    const { canvas, context } = createCanvas(width, height);
    const image = context.createImageData(width, height);
    for (let index = 0; index < width * height; index += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        image.data[index * 4 + channel] = Math.max(0, Math.min(255, pixels[index * 3 + channel]));
      }
      image.data[index * 4 + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return canvas;
  }

  // A repeating tile, or (repeat false) a picture stretched once over its surface.
  function toTexture({ repeat = true } = {}) {
    return repeat ? repeatingTexture(toCanvas()) : canvasTexture(toCanvas());
  }

  return { width, height, fill, mix, dot, rect, toCanvas, toTexture };
}
