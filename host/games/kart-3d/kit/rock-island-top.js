// What grows on and lies round a rocky island (M9, from "M9: rock study" in docs/3d-findings.md): each mass's
// grass cap, a thick mat whose lip overhangs the rock and hangs down the cliff in tongues; bushes along its rim and
// on it; and the beach of sand in the lee (the water round it is kit/rock-island-water.js). Vegetation only on the
// tops, as on the study's islands; soft and rounded, against the rock's planes. Used by kit/rock-island.js.

import * as THREE from 'three';
import { createRandom, between } from '../random.js';
import { indexed, mergeShapes } from '../shape-utils.js';
import { capPoint, capLip, beachPoint, middleOf, BEACH_ROWS } from './rock-island-plan.js';
import { ringGrid } from './rock-island-grid.js';

const GRASS = new THREE.Color(0x63b244);
const GRASS_DARK = new THREE.Color(0x3d7e2e);
const BUSHES = [0x4a9a3a, 0x3a8a34, 0x5aa840].map((hex) => new THREE.Color(hex));
const SAND = new THREE.Color(0xf2e0b0);
const WET_SAND = new THREE.Color(0xd2bc88);
// The cap's rings from its middle to its rim (shares), then its lip: out past the rock's edge by LIP_OUT of the
// lip's thickness and down to its foot.
const CAP_SHARES = [0, 0.25, 0.5, 0.7, 0.85, 0.95];
const LIP_OUT = 0.45;
// The grass hangs down the cliff at most this far (share of the top stratum), in tongues, held this far (units)
// off the rock.
const DRAPE = 0.55;
// This share of the rim's corners hangs a tongue.
const TONGUES = 0.3;
const DRAPE_OFF = 0.12;
const BUSH_SPACING = 3;
const MOST_BUSHES = 40;

// `island` from kit/rock-island-plan.js. Returns { grass, sand }: indexed geometries with positions, normals,
// colours and texture coordinates (sand null without a beach).
export function buildIslandTop(island, seed) {
  const random = createRandom(seed * 13 + 3);
  const grass = mergeShapes([...island.masses.map((mass) => buildCap(mass, random)), ...buildBushes(island, random)]);
  return { grass, sand: island.beach ? buildBeach(island) : null };
}

// The cap as rings round the top's corners (capRows), its grass mottled, lighter and darker in patches, as mown
// grass is not.
function buildCap(mass, random) {
  const rows = capRows(mass, random);
  const count = mass.tiers.at(-1).top.points.length;
  const mottles = Array.from({ length: rows.length * count }, () => between(random, 0.82, 1.12));
  return ringGrid(rows.length, count, (row, corner) => ({
    point: rows[row].at(corner % count),
    color: rows[row].color.clone().multiplyScalar(mottles[row * count + (corner % count)]),
  }));
}

// The cap's rows, { at(corner) -> [x, y, z], color }, from its middle out over the lip and down the cliff: the
// hanging rows follow the top stratum's face, each corner hanging its own length, so the green hangs in tongues.
function capRows(mass, random) {
  const top = mass.tiers.at(-1);
  const lip = capLip(mass);
  const [middleX, middleZ] = middleOf(top.top.points);
  const drapes = top.top.points.map(() => DRAPE * (random() < TONGUES ? between(random, 0.35, 1) : 0.08));
  const rimAt = (corner, out, y) => {
    const [x, z] = top.top.points[corner];
    const [awayX, awayZ] = [x - middleX, z - middleZ];
    const length = Math.hypot(awayX, awayZ);
    return [x + (awayX / length) * out, y, z + (awayZ / length) * out];
  };
  // Down the top stratum's face, `share` of the way from its top to its bottom, held off the rock.
  const faceAt = (corner, share) => {
    const [[topX, topZ], [bottomX, bottomZ]] = [top.top.points[corner], top.bottom.points[corner]];
    const y = top.top.y + (top.bottom.y - top.top.y) * share;
    const [x, z] = [topX + (bottomX - topX) * share, topZ + (bottomZ - topZ) * share];
    return rimAt(corner, DRAPE_OFF, y).map((value, axis) => value + [x - topX, 0, z - topZ][axis]);
  };
  // The lip bulges out further at some corners than others, so its edge is not a clean line.
  const bulges = top.top.points.map(() => lip * LIP_OUT * between(random, 0.5, 1.5));
  return [
    ...CAP_SHARES.map((share) => ({ at: (corner) => capPoint(mass, corner, share), color: GRASS })),
    { at: (corner) => rimAt(corner, bulges[corner], top.top.y + lip * 0.75), color: GRASS },
    { at: (corner) => rimAt(corner, bulges[corner], top.top.y + lip * 0.15), color: GRASS_DARK },
    { at: (corner) => faceAt(corner, drapes[corner] * 0.5), color: GRASS_DARK },
    { at: (corner) => faceAt(corner, drapes[corner]), color: GRASS_DARK.clone().multiplyScalar(0.7) },
  ];
}

// Round bushes along each cap's rim, about one every BUSH_SPACING units, and a few on it, lighter on top: squashed
// spheres, smooth. A cap that domes high (karst) is a wooded hill, as the study's karst tops are: twice as many,
// half of them on it.
function buildBushes(island, random) {
  return island.masses.flatMap((mass) => {
    const wooded = mass.dome > 2 * capLip(mass);
    const rim = mass.tiers.at(-1).top.points;
    const perimeter = rim.reduce((sum, [x, z], corner) => sum + Math.hypot(x - rim[(corner + 1) % rim.length][0], z - rim[(corner + 1) % rim.length][1]), 0);
    const count = Math.min(Math.round(perimeter / (wooded ? BUSH_SPACING / 2 : BUSH_SPACING)), MOST_BUSHES);
    return Array.from({ length: count }, (_, index) => {
      const corner = Math.floor(random() * rim.length);
      const share = index % (wooded ? 2 : 3) === 0 ? between(random, 0.15, 0.8) : between(random, 0.86, 0.98);
      const [x, y, z] = capPoint(mass, corner, share);
      const size = between(random, 0.6, 1.3) * Math.min(Math.max(island.size / 20, 0.7), 1.4);
      const bush = new THREE.IcosahedronGeometry(1, 1).scale(size * between(random, 1, 1.4), size * 0.75, size).translate(x, y + size * 0.35, z);
      const color = BUSHES[index % BUSHES.length];
      return indexed(withColorsAndUv(bush, (pointY) => color.clone().multiplyScalar(0.75 + 0.35 * Math.min(Math.max((pointY - y) / (size * 1.1), 0), 1))));
    });
  });
}

// The beach's rows along its corners, dry sand above and wet near the water.
function buildBeach(island) {
  const { corners } = island.beach;
  return ringGrid(BEACH_ROWS.length, corners.length - 1, (row, index) => {
    const point = beachPoint(island, corners[index], BEACH_ROWS[row][0]);
    return { point, color: point[1] > 0.35 ? SAND : WET_SAND };
  });
}

// Colours from colorAt(y) and texture coordinates laid flat, on a shape that came without colours.
function withColorsAndUv(geometry, colorAt) {
  const { position } = geometry.attributes;
  const [colors, uvs] = [[], []];
  for (let index = 0; index < position.count; index += 1) {
    const color = colorAt(position.getY(index));
    colors.push(color.r, color.g, color.b);
    uvs.push(position.getX(index) / 6, position.getZ(index) / 6);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}
