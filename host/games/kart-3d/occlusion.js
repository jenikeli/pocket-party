// The maths of baking shade (ambient occlusion, the bake) into the course's vertex colours: the directions
// the sky is looked for in, reading back a depth map drawn by Three.js's depth material, and how much of the sky a
// point sees. Plain functions, unit tested in Node. Used by host/games/kart-3d/baked-shade.js.

// `count` directions spread evenly over the whole sphere ({ x, y, z }, each of length 1): a Fibonacci spiral,
// which covers it without the bunching at the poles that equal steps in latitude and longitude give.
export function sphereDirections(count) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (unused, index) => {
    const y = 1 - (2 * (index + 0.5)) / count;
    const across = Math.sqrt(1 - y * y);
    return { x: Math.cos(golden * index) * across, y, z: Math.sin(golden * index) * across };
  });
}

// A depth from 0 (the camera's near plane) to 1 (its far plane), from the four bytes Three.js's depth material
// writes with RGBADepthPacking (its shader chunk `packing`, unpackRGBAToDepth): the red byte is the coarsest part,
// each next byte 256 times finer.
export function unpackDepth(red, green, blue, alpha) {
  return (red + (green + (blue + alpha / 255) / 256) / 256) / 256;
}

// The colour a vertex is multiplied by, from what it saw of the sky: `open` and `total` add up, over the
// directions it faces, how squarely it faces each (the cosine, as squarer directions bring more light), `open`
// only those where nothing stood in the way. 1 in the open (and for a vertex that faced no direction), falling to
// `darkest` where it saw no sky at all.
export function shadeFor(open, total, darkest) {
  const seen = total > 0 ? open / total : 1;
  return darkest + (1 - darkest) * seen;
}
