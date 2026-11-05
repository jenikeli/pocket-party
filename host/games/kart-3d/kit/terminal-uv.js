// Texture coordinates for the airport's big buildings (M9), laid on from the side each face looks toward, so a
// tile keeps its size in units however long the wall or roof is (a box's own coordinates would stretch one tile
// over the whole face). Used by the terminal's shapes (kit/terminal-*.js) and its kit-shots apron
// (host/kit-shots/airport-g-pieces.js).

// Gives `geometry` coordinates in tiles `across` units wide and `up` units tall (a roof's tiles are `across` both
// ways), each vertex projected along the axis its normal is most nearly on: a wall facing x shows (z, y), one
// facing z shows (x, y), a roof (x, z). Returns it.
export function projectUv(geometry, across, up = across) {
  const { position, normal, uv } = geometry.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
    const [nx, ny, nz] = [Math.abs(normal.getX(index)), Math.abs(normal.getY(index)), Math.abs(normal.getZ(index))];
    if (ny >= nx && ny >= nz) {
      uv.setXY(index, x / across, z / across);
    } else if (nx >= nz) {
      // Read from outside, on either face.
      uv.setXY(index, (Math.sign(normal.getX(index)) * -z) / across, y / up);
    } else {
      uv.setXY(index, (Math.sign(normal.getZ(index)) * x) / across, y / up);
    }
  }
  return geometry;
}
