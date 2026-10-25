// Smooth random noise that repeats, for the kit's textures (tiles that repeat without a seam) and the road's large
// patches (which repeat once a lap, so there is no seam where the lap starts again). Value noise: random values
// on a grid, eased between. Plain maths, unit tested in Node. Used by the kit's textures and kit/road.js.

// Returns noise(x, y) in 0..1 that repeats every 1 in x and in y, with `cellsX` by `cellsY` random values across
// one repeat: the more cells, the smaller its blotches.
export function createTileNoise(random, cellsX, cellsY = cellsX) {
  const values = Array.from({ length: cellsX * cellsY }, () => random());
  const valueAt = (cellX, cellY) => values[wrap(cellY, cellsY) * cellsX + wrap(cellX, cellsX)];
  return function noise(x, y) {
    const gridX = x * cellsX;
    const gridY = y * cellsY;
    const cellX = Math.floor(gridX);
    const cellY = Math.floor(gridY);
    const easeX = smooth(gridX - cellX);
    const easeY = smooth(gridY - cellY);
    const top = mix(valueAt(cellX, cellY), valueAt(cellX + 1, cellY), easeX);
    const bottom = mix(valueAt(cellX, cellY + 1), valueAt(cellX + 1, cellY + 1), easeX);
    return mix(top, bottom, easeY);
  };
}

// Several layers of tile noise, each with twice the cells and half the weight of the last: big blotches with
// smaller ones on top, as on worn ground. Still 0..1 and repeating every 1.
export function createLayeredNoise(random, cells, layers) {
  const noises = Array.from({ length: layers }, (_, layer) => createTileNoise(random, cells * 2 ** layer));
  const totalWeight = noises.reduce((sum, _, layer) => sum + 0.5 ** layer, 0);
  return (x, y) => noises.reduce((sum, noise, layer) => sum + noise(x, y) * 0.5 ** layer, 0) / totalWeight;
}

function wrap(value, count) {
  return ((value % count) + count) % count;
}

function smooth(share) {
  return share * share * (3 - 2 * share);
}

function mix(a, b, share) {
  return a + (b - a) * share;
}
