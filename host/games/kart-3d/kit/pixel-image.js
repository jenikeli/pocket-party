// A picture for one of the kit's textures, worked out pixel by pixel in plain memory and written to a canvas
// once at the end: drawing many small shapes on a canvas and reading it back took seconds in a software-drawn
// browser (M7c). Pixels wrap round the edges, so a tile drawn with it repeats without a seam. Colours are
// [r, g, b] in 0..255. Used by the kit's pieces that draw textures.

import { createCanvas, canvasTexture, repeatingTexture, dataTexture } from '../canvas-texture.js';

// Returns { width, height, fill, mix, dot, rect, valueAt, toCanvas, toTexture, toDataTexture, toReliefTexture,
// toShadeTexture }.
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

  // The pixel's [r, g, b] at (x, y), wrapping round the edges like everything here.
  function valueAt(x, y) {
    const offset = offsetOf(x, y);
    return [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
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

  // The same, read as numbers rather than colours (M7d4b2): a roughness map (Three.js reads its green), for one.
  function toDataTexture({ repeat = true } = {}) {
    return dataTexture(toCanvas(), repeat);
  }

  // Read as a height field (its red channel: 0 low, 255 high), the normal map that makes a surface catch the
  // light as if it had that relief (M7d4): seams and gaps dark on the side away from the sun, raised edges and
  // bolt heads lit on the side toward it, which painted colour alone cannot do. `depth` is how many pixels
  // high a full step from 0 to 255 stands: the bigger, the steeper every slope. The edges wrap, like the tile.
  function toReliefTexture({ depth, repeat = true }) {
    const heightAt = (x, y) => pixels[offsetOf(x, y)] / 255;
    const { canvas, context } = createCanvas(width, height);
    const image = context.createImageData(width, height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        // The canvas's rows run down, its texture coordinate v up, so a slope down the picture tilts the
        // normal the other way in v.
        const slopeX = ((heightAt(x + 1, y) - heightAt(x - 1, y)) / 2) * depth;
        const slopeY = ((heightAt(x, y + 1) - heightAt(x, y - 1)) / 2) * depth;
        const length = Math.hypot(slopeX, slopeY, 1);
        const offset = (y * width + x) * 4;
        image.data[offset] = (-slopeX / length) * 127.5 + 127.5;
        image.data[offset + 1] = (slopeY / length) * 127.5 + 127.5;
        image.data[offset + 2] = (1 / length) * 127.5 + 127.5;
        image.data[offset + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    return dataTexture(canvas, repeat);
  }

  // Read as a height field like toReliefTexture, the shade map (ambient occlusion, M7d4b2) that darkens what lies
  // lower than the surface round it, within `reach` pixels each way: seams, gaps and the creases round a raised
  // part's foot, which the sky and the light bounced off the course reach less. `strength` is how dark a pixel
  // gets for each step of 255 it lies below the average round it (1 would make a full step black). Three.js
  // uses a shade map only for the light that is not the sun's, as such shade is.
  function toShadeTexture({ reach, strength, repeat = true }) {
    const heights = Float32Array.from({ length: width * height }, (unused, index) => pixels[index * 3]);
    const average = boxAverage(boxAverage(heights, width, height, reach, true), width, height, reach, false);
    const shade = createPixelImage(width, height);
    shade.fill((x, y) => {
      const below = Math.max(0, average[y * width + x] - heights[y * width + x]) / 255;
      const value = 255 * Math.max(0, 1 - strength * below);
      return [value, value, value];
    });
    return shade.toDataTexture({ repeat });
  }

  return { width, height, fill, mix, dot, rect, valueAt, toCanvas, toTexture, toDataTexture, toReliefTexture, toShadeTexture };
}

// `values` (one per pixel of a `width` by `height` picture, row by row) averaged over `reach` pixels either way
// along the rows (`alongRows` true) or the columns, wrapping round the edges. A running sum, so the time does not
// grow with `reach` (the shade maps' reach is up to 12 pixels, on tiles of 512 x 512: M10 Q).
export function boxAverage(values, width, height, reach, alongRows) {
  const averaged = new Float32Array(values.length);
  const [lines, length] = alongRows ? [height, width] : [width, height];
  const [lineStride, itemStride] = alongRows ? [width, 1] : [1, width];
  const count = 2 * reach + 1;
  const wrap = (index) => ((index % length) + length) % length;
  for (let line = 0; line < lines; line += 1) {
    const at = (index) => line * lineStride + wrap(index) * itemStride;
    let sum = 0;
    for (let index = -reach; index <= reach; index += 1) {
      sum += values[at(index)];
    }
    for (let index = 0; index < length; index += 1) {
      averaged[at(index)] = sum / count;
      sum += values[at(index + reach + 1)] - values[at(index - reach)];
    }
  }
  return averaged;
}
