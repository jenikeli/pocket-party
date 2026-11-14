// A surface's small detail drawn as maps instead of built as shapes (M7d4b2's detail in textures, after
// "How games look detailed and still run smoothly" in docs/kart-reference.md): its colour, its height (from
// which its relief, a normal map, and its shade, an ambient occlusion map, are worked out, kit/pixel-image.js)
// and its roughness, drawn together, so a panel, a seam or a bolt drawn once is in every map at the same place.
// Features are placed in units of the surface, x across and y up from its bottom left corner. Used by the kit's
// pieces that use it (kit/gate-post-detail.js, kit/striped-rail-detail.js, kit/sponsor-wall-detail.js).

import { createPixelImage } from './pixel-image.js';

// `widthUnits` by `heightUnits` drawn at `pixelsPerUnit`, filled with `color` ([r, g, b]), `roughness` (0 to 1)
// and the height `base` (0 to 255). Returns { colors, roughnesses, pixelsAt, panel, groove, bolt, heightAt,
// setHeight, toMaps }: colors and roughnesses are pixel images (kit/pixel-image.js) for any detail drawn
// straight onto them; pixelsAt(x, y) turns units into pixels.
export function createSurface(widthUnits, heightUnits, pixelsPerUnit, { color, roughness, base }) {
  const width = Math.round(widthUnits * pixelsPerUnit);
  const height = Math.round(heightUnits * pixelsPerUnit);
  const colors = createPixelImage(width, height);
  const roughnesses = createPixelImage(width, height);
  const heights = new Float32Array(width * height).fill(base);
  colors.fill(() => color);
  roughnesses.fill(() => grey(roughness));
  // The canvas's rows run down from the top; y runs up from the bottom.
  const pixelsAt = (x, y) => [x * pixelsPerUnit, (heightUnits - y) * pixelsPerUnit];
  const wrap = (value, size) => ((Math.round(value) % size) + size) % size;
  const heightAt = (column, row) => heights[wrap(row, height) * width + wrap(column, width)];
  const setHeight = (column, row, value) => (heights[wrap(row, height) * width + wrap(column, width)] = value);

  // A plate `lift` above the base over the rectangle { left, bottom, width, height } (units), its edges
  // rounded over `bevel` units, in `paint` ({ color, roughness }); where plates meet, a seam is left between.
  function panel(rect, { lift, bevel, paint }) {
    const [left, top] = pixelsAt(rect.left, rect.bottom + rect.height);
    const [columns, rows] = [rect.width * pixelsPerUnit, rect.height * pixelsPerUnit];
    const bevelPixels = Math.max(bevel * pixelsPerUnit, 1);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const inside = Math.min(column + 0.5, columns - column - 0.5, row + 0.5, rows - row - 0.5);
        const rise = smoothstep(Math.min(inside / bevelPixels, 1));
        setHeight(left + column, top + row, base + lift * rise);
      }
    }
    colors.rect(left, top, columns, rows, paint.color);
    roughnesses.rect(left, top, columns, rows, grey(paint.roughness));
  }

  // A line sunk `depth` into whatever is there, `size` units wide, from (x1, y1) to (x2, y2) (units): a seam cut
  // into a panel, or stitching; darkened toward `color` by `amount`.
  function groove([x1, y1], [x2, y2], { size, depth, color: grooveColor, amount, roughness: grooveRoughness }) {
    const [from, to] = [pixelsAt(x1, y1), pixelsAt(x2, y2)];
    const steps = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]));
    const radius = (size * pixelsPerUnit) / 2;
    const touched = new Set();
    for (let step = 0; step <= steps; step += 1) {
      const [x, y] = [from[0] + ((to[0] - from[0]) * step) / steps, from[1] + ((to[1] - from[1]) * step) / steps];
      for (let row = Math.floor(y - radius); row <= Math.ceil(y + radius); row += 1) {
        for (let column = Math.floor(x - radius); column <= Math.ceil(x + radius); column += 1) {
          const key = `${wrap(column, width)},${wrap(row, height)}`;
          const distance = Math.hypot(column - x, row - y);
          if (distance <= radius + 0.5 && !touched.has(key)) {
            touched.add(key);
            const share = Math.min(radius + 0.5 - distance, 1);
            setHeight(column, row, heightAt(column, row) - depth * share);
            colors.mix(column, row, grooveColor, amount * share);
            roughnesses.mix(column, row, grey(grooveRoughness), share);
          }
        }
      }
    }
  }

  // A round domed head at (x, y), `radius` units, standing `lift` above what is under its middle.
  function bolt(x, y, { radius, lift, color: boltColor, roughness: boltRoughness }) {
    const [column, row] = pixelsAt(x, y);
    const pixels = radius * pixelsPerUnit;
    const under = heightAt(column, row);
    for (let dy = -Math.ceil(pixels); dy <= Math.ceil(pixels); dy += 1) {
      for (let dx = -Math.ceil(pixels); dx <= Math.ceil(pixels); dx += 1) {
        const share = Math.hypot(dx, dy) / pixels;
        if (share < 1) {
          setHeight(column + dx, row + dy, Math.max(heightAt(column + dx, row + dy), under + lift * Math.sqrt(1 - share * share)));
        }
      }
    }
    colors.dot(column, row, pixels, boltColor);
    roughnesses.dot(column, row, pixels, grey(boltRoughness));
  }

  // The four maps for a MeshStandardMaterial: `depth` is how steep the relief is (see toReliefTexture), `shade`
  // { reach (units), strength } how far round a crease its shade reaches and how dark it gets (toShadeTexture);
  // repeating or not, all alike.
  function toMaps({ depth, shade, repeat }) {
    const heightImage = createPixelImage(width, height);
    heightImage.fill((column, row) => grey(Math.min(Math.max(heights[row * width + column], 0), 255) / 255));
    return {
      map: colors.toTexture({ repeat }),
      normalMap: heightImage.toReliefTexture({ depth, repeat }),
      aoMap: heightImage.toShadeTexture({ reach: Math.max(1, Math.round(shade.reach * pixelsPerUnit)), strength: shade.strength, repeat }),
      roughnessMap: roughnesses.toDataTexture({ repeat }),
    };
  }

  return { width, height, colors, roughnesses, pixelsAt, panel, groove, bolt, heightAt, setHeight, toMaps };
}

// A colour given as a hex number (sRGB, as everywhere in the kit) as the [r, g, b] a canvas takes.
export function hexToRgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

// A share from 0 to 1 as a grey [r, g, b].
export function grey(share) {
  const value = share * 255;
  return [value, value, value];
}

function smoothstep(share) {
  return share * share * (3 - 2 * share);
}
