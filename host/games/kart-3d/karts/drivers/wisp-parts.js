// Wisp's own parts (M7d5), the ones only a ghost has: a soft round shape swept along a curve, for the body (from
// inside the head down to a round bottom in the seat) and the wavy tail tapering out of it; their radii; and the
// shading that runs the whole ghost from white at the top to pale lavender at the tail, so head, body, tail and
// arms read as one soft shape. Used by drivers/wisp.js. Every place is [x, y, z] in the kart's axes
// (kart-layout.js).

import * as THREE from 'three';

// A round shape swept along the curve through `points` ([x, y, z] each), which all lie in one flat plane square
// to `across` ([x, y, z], a unit vector): at each share of the way along it a ring `radiusAt(share)` round,
// stretched `width` times along `across` and `depth` times square to it. A radius of 0 at the end closes it in a
// point. Not coloured: shadeGhost colours it.
export function sweep(points, radiusAt, { across: acrossAxis = [1, 0, 0], width = 1, depth = 1, steps = 40, ring = 24 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const across = new THREE.Vector3(...acrossAxis);
  const [positions, uvs] = [[], []];
  for (let step = 0; step <= steps; step += 1) {
    const share = step / steps;
    const point = curve.getPointAt(share);
    // Square to the curve within its plane: the ring's other axis.
    const outward = new THREE.Vector3().crossVectors(curve.getTangentAt(share), across);
    const radius = radiusAt(share);
    for (let corner = 0; corner < ring; corner += 1) {
      const angle = (corner / ring) * Math.PI * 2;
      const ringPoint = point.clone()
        .addScaledVector(across, Math.cos(angle) * radius * width)
        .addScaledVector(outward, Math.sin(angle) * radius * depth);
      positions.push(...ringPoint.toArray());
      uvs.push(share, corner / ring);
    }
  }
  const indices = [];
  for (let step = 0; step < steps; step += 1) {
    for (let corner = 0; corner < ring; corner += 1) {
      const [a, b] = [step * ring + corner, step * ring + ((corner + 1) % ring)];
      indices.push(a, b, a + ring, b, b + ring, a + ring);
    }
  }
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shape.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  shape.setIndex(indices);
  shape.computeVertexNormals();
  return shape;
}

// The radius of the ghost's body `share` of the way down from inside its head to its round bottom in the seat:
// `neck` round under the head, where the scarf sits, swelling to `belly` round, then rounding off like a ball's
// bottom over the last 0.4 of the way.
export function bodyRadius(share, { neck, belly }) {
  if (share < 0.6) {
    return neck + (belly - neck) * THREE.MathUtils.smoothstep(share, 0.2, 0.6);
  }
  return belly * Math.sqrt(Math.max(0, 1 - ((share - 0.6) / 0.4) ** 2));
}

// The radius of the tail `share` of the way from inside the belly to its tip: `root` round where it leaves the
// body, tapering to a point, with soft ripples along it that make it wave.
export function tailRadius(share, root) {
  const taper = Math.cos(share * Math.PI * 0.5) ** 0.7;
  const ripple = 1 + 0.14 * Math.sin(share * Math.PI * 5);
  return root * taper * ripple;
}

// Colours `geometry` (in place in the kart's axes) per vertex from `bottomHex` at height `low` to `topHex` at
// `high`, blending smoothly between. Every part of the ghost takes the same blend, so where they meet they match.
export function shadeGhost(geometry, { topHex, bottomHex, low, high }) {
  const [top, bottom] = [new THREE.Color(topHex), new THREE.Color(bottomHex)];
  const { position } = geometry.attributes;
  const colours = [];
  const blended = new THREE.Color();
  for (let index = 0; index < position.count; index += 1) {
    blended.copy(bottom).lerp(top, THREE.MathUtils.smoothstep(position.getY(index), low, high));
    colours.push(blended.r, blended.g, blended.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  return geometry;
}
