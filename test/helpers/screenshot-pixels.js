// Reads pixels out of host screenshots, because the host draws everything on a canvas (no DOM to query).
// Used by the browser tests. Decoding runs in a blank browser page: browsers decode PNG natively, Node does not.

// Opens a blank page that the other functions use to decode screenshots.
export async function openPixelReader(browser) {
  const page = await browser.newPage();
  await page.evaluate(() => {
    window.decodePng = async (base64) => {
      const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d');
      context.drawImage(bitmap, 0, 0);
      return context.getImageData(0, 0, bitmap.width, bitmap.height);
    };
  });
  return page;
}

// Finds every pixel within a small tolerance of `color` (0xRRGGBB) inside `area` ({ left, top, right, bottom }).
// Returns { count, centerX, centerY }, the center being the middle of their bounding box.
export function findColor(readerPage, png, color, area) {
  return readerPage.evaluate(
    async ({ base64, color, area }) => {
      const { data, width } = await window.decodePng(base64);
      const target = [(color >> 16) & 255, (color >> 8) & 255, color & 255];
      // Rendering can shift a channel by a step or two (WebGL vs canvas); 8 is still far from any other color.
      const isMatch = (offset) => target.every((value, channel) => Math.abs(data[offset + channel] - value) <= 8);
      let count = 0;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let y = area.top; y < area.bottom; y += 1) {
        for (let x = area.left; x < area.right; x += 1) {
          if (isMatch((y * width + x) * 4)) {
            count += 1;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }
      return { count, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
    },
    { base64: png.toString('base64'), color, area },
  );
}

// Reports whether each point [x, y] is dark (true) or light (false), for reading QR modules.
export function readDarkPoints(readerPage, png, points) {
  return readerPage.evaluate(
    async ({ base64, points }) => {
      const { data, width } = await window.decodePng(base64);
      return points.map(([x, y]) => {
        const offset = (Math.round(y) * width + Math.round(x)) * 4;
        return data[offset] + data[offset + 1] + data[offset + 2] < 3 * 128;
      });
    },
    { base64: png.toString('base64'), points },
  );
}
