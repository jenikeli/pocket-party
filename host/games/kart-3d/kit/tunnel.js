// The tunnel under the runway (M9, Palm Bay Airport): a concrete ceiling over the cutting where the runway crosses
// it (it casts the shadow that keeps the tunnel dark), lit strip lights along it (the only lamps lit by day:
// they glow on the High quality setting), and at each end a concrete headwall over the portal, with a band of
// yellow and black chevrons pointing in to the middle. Its walls are the cutting's (kit/retaining-wall.js); its
// roof's top is the runway and the ground beside it. Used by airport-scenery.js.

import * as THREE from 'three';
import { createStripBuilder } from '../strip-builder.js';
import { createPixelImage } from './pixel-image.js';
import { withShadows } from './frames.js';
import { tunnelSpan, RETAINING_WALL, TUNNEL } from '../airport-ground.js';

// The headwall reaches this far out past the walls' faces each side (down to TUNNEL.lintel), stands this high above
// the ground and is this thick; its chevron band is this tall, this far above its foot.
const HEADWALL = Object.freeze({ reach: 1.2, rise: 0.7, depth: 0.8, bandHeight: 1, bandLift: 0.25 });
// Strip lights: two rows this far either side of the middle, each light this long and wide, one every this many
// stations, hanging this far below the ceiling.
const LIGHT = Object.freeze({ lateral: 3.2, length: 2.2, width: 0.32, spacing: 4, hang: 0.04, brightness: 2.4, color: 0xfff0d2 });
const CONCRETE = 0xd6d2ca;
const CHEVRON_SIZE = 64;

// Adds the tunnel to `kit.world` (kit/kit.js).
export function buildTunnel({ world, track, keep, textures }) {
  const { fromS, toS } = tunnelSpan(track);
  const concrete = createStripBuilder();
  const chevrons = createStripBuilder();
  const lights = createStripBuilder(LIGHT.brightness);
  const { stations } = track;
  const down = { x: 0, y: -1, z: 0 };
  const reach = (at) => at.halfWidth + RETAINING_WALL.out;
  // The tunnel lies mid-lap (tunnelSpan), so its stations and the next one never wrap round the lap's start.
  const entry = stations.findIndex((station) => station.s >= fromS);
  let index = entry;
  for (; stations[index].s < toS; index += 1) {
    const [station, next] = [stations[index], stations[index + 1]];
    concrete.quad([corner(station, reach(station), TUNNEL.ceiling, down), corner(station, -reach(station), TUNNEL.ceiling, down), corner(next, reach(next), TUNNEL.ceiling, down), corner(next, -reach(next), TUNNEL.ceiling, down)], CONCRETE);
    if ((index - entry) % LIGHT.spacing === 1) {
      let end = index;
      while (stations[end].s < station.s + LIGHT.length) {
        end += 1;
      }
      addLights(lights, station, stations[end]);
    }
  }
  const exit = stations[index];
  addHeadwall(concrete, chevrons, stations[entry], -1);
  addHeadwall(concrete, chevrons, exit, 1);
  const chevronMap = keep(createChevronTexture());
  const meshes = [
    withShadows(new THREE.Mesh(keep(concrete.build()), keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.concrete, normalMap: textures.concreteRelief, roughness: 0.85, side: THREE.DoubleSide })))),
    withShadows(new THREE.Mesh(keep(chevrons.build()), keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: chevronMap, roughness: 0.55, side: THREE.DoubleSide })))),
    new THREE.Mesh(keep(lights.build()), keep(new THREE.MeshBasicMaterial({ vertexColors: true }))),
  ];
  world.add(...meshes);
}

// A corner `lateral` right of the station's middle at height `y` (the road there is level across), facing
// `normal`, its texture laid over the world.
function corner(station, lateral, y, normal, uv = [lateral / 8, station.s / 8]) {
  return { point: { x: station.point.x + station.right.x * lateral, y, z: station.point.z + station.right.z * lateral }, normal, uv };
}

// Both rows' lights between `station` and `end`, facing down.
function addLights(builder, station, end) {
  const down = { x: 0, y: -1, z: 0 };
  const y = TUNNEL.ceiling - LIGHT.hang;
  for (const middle of [-LIGHT.lateral, LIGHT.lateral]) {
    const [right, left] = [middle + LIGHT.width / 2, middle - LIGHT.width / 2];
    builder.quad([corner(station, right, y, down), corner(station, left, y, down), corner(end, right, y, down), corner(end, left, y, down)], LIGHT.color);
  }
}

// The headwall over the portal at `station`, reaching out of the tunnel along the road (`outward` 1) or back
// along it (-1): its face with the chevron band, its underside, its top, its back above the ground and its ends.
function addHeadwall(concrete, chevrons, station, outward) {
  const width = station.halfWidth + RETAINING_WALL.out + RETAINING_WALL.thickness + HEADWALL.reach;
  const out = { x: station.tangent.x * outward, y: 0, z: station.tangent.z * outward };
  const along = Math.hypot(out.x, out.z);
  const shift = { x: (out.x / along) * HEADWALL.depth, z: (out.z / along) * HEADWALL.depth };
  const bottom = TUNNEL.lintel;
  const top = HEADWALL.rise;
  const [bandFrom, bandTo] = [bottom + HEADWALL.bandLift, bottom + HEADWALL.bandLift + HEADWALL.bandHeight];
  // A point `lateral` across at height `y`, `depth` (0 or 1) of the way through the wall.
  const at = (lateral, y, depth, normal, uv) => {
    const base = corner(station, lateral, y, normal, uv);
    base.point = { x: base.point.x + shift.x * depth, y, z: base.point.z + shift.z * depth };
    return base;
  };
  const face = (builder, fromY, toY, hex, uvOf) => {
    // Seen from outside, the wall's left is the road's right when it faces back along the road.
    for (const [first, second] of [[outward * width, 0], [0, -outward * width]]) {
      builder.quad([at(first, toY, 1, out, uvOf(first, toY)), at(second, toY, 1, out, uvOf(second, toY)), at(first, fromY, 1, out, uvOf(first, fromY)), at(second, fromY, 1, out, uvOf(second, fromY))], hex);
    }
  };
  const plain = (lateral, y) => [lateral / 8, y / 8];
  face(concrete, bottom, bandFrom, CONCRETE, plain);
  face(chevrons, bandFrom, bandTo, 0xffffff, (lateral, y) => [Math.abs(lateral) / 2, (y - bandFrom) / HEADWALL.bandHeight]);
  face(concrete, bandTo, top, CONCRETE, plain);
  const up = { x: 0, y: 1, z: 0 };
  const down = { x: 0, y: -1, z: 0 };
  const back = { x: -out.x, y: 0, z: -out.z };
  concrete.quad([at(-outward * width, top, 0, up), at(-outward * width, top, 1, up), at(outward * width, top, 0, up), at(outward * width, top, 1, up)], CONCRETE);
  concrete.quad([at(outward * width, bottom, 0, down), at(outward * width, bottom, 1, down), at(-outward * width, bottom, 0, down), at(-outward * width, bottom, 1, down)], CONCRETE);
  for (const [fromY, toY] of [[0, top], [bottom, TUNNEL.ceiling]]) {
    concrete.quad([at(-outward * width, toY, 0, back), at(outward * width, toY, 0, back), at(-outward * width, fromY, 0, back), at(outward * width, fromY, 0, back)], CONCRETE);
  }
  for (const side of [-1, 1]) {
    const normal = { x: station.right.x * side, y: 0, z: station.right.z * side };
    const [first, second] = side * outward > 0 ? [0, 1] : [1, 0];
    concrete.quad([at(side * width, top, first, normal), at(side * width, top, second, normal), at(side * width, 0, first, normal), at(side * width, 0, second, normal)], CONCRETE);
  }
}

// Yellow and black stripes slanting at 45 degrees, a tile 2 units wide and 1 tall; laid mirrored either side of
// the portal's middle, they meet there in chevrons.
function createChevronTexture() {
  const image = createPixelImage(CHEVRON_SIZE * 2, CHEVRON_SIZE);
  const period = CHEVRON_SIZE / 2;
  image.fill((x, y) => {
    const along = (((x + y) % period) + period) % period;
    const edge = Math.min(along, period / 2 - along, Math.abs(along - period / 2), period - along);
    const yellow = along < period / 2;
    const soften = Math.min(edge / 1.5, 1);
    return yellow ? [246, 196 - 30 * (1 - soften), 32] : [34 + 40 * (1 - soften), 32, 30];
  });
  return image.toTexture();
}
