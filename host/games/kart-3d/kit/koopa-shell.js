// The kit's giant Koopa shell (M7d3, rebuilt in M7d4d to the study of Koopa Cape's, docs/mk8dx-reference.md): a
// green dome of grooved scutes (a middle one, a ring of six, a ring of twelve; the grooves are cut into the dome
// as well as drawn in its maps), a rim of twelve fat rounded white lobes, one under each outer scute, and a dark
// underside. Stands round y = 0 at its rim, radius 1 (scaled per course), as before. Takes the kit and returns the
// parts, [{ geometry, material }]: one part, as the caller places one mesh. Used by the seaside surroundings.

import * as THREE from 'three';
import { at, coloured, mergeShapes, shaded } from '../shape-utils.js';
import { scuteAt, drawScuteMaps } from './koopa-shell-scutes.js';
import { drawnOnce } from '../canvas-texture.js';

const DOME_RADIUS = 0.96;
const DOME_HEIGHT = 0.72;
const LOBES = 12;
const LOBE_RADIUS = 0.95;
const LOBE_SIZE = { along: 0.29, across: 0.14, up: 0.17 };
const WHITE = 0xfffbee;
const UNDERSIDE = 0x3a2a1c;

export function buildKoopaShell({ keep }) {
  const maps = drawnOnce('koopa-scutes', drawScuteMaps);
  Object.values(maps).forEach(keep);
  const { map, normalMap, aoMap, roughnessMap } = maps;
  const geometry = mergeShapes([buildDome(), ...buildLobes(), buildUnderside()]);
  const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map, normalMap, aoMap, roughnessMap, roughness: 1 }));
  return [{ geometry: keep(geometry), material }];
}

// The hemisphere, its texture laid over it from above and its surface sunk where a groove lies.
export function buildDome() {
  const dome = new THREE.SphereGeometry(DOME_RADIUS, 64, 24, 0, 2 * Math.PI, 0, Math.PI * 0.5);
  const { position, uv } = dome.attributes;
  for (let index = 0; index < uv.count; index += 1) {
    const [x, z] = [position.getX(index), position.getZ(index)];
    // The picture's x and z run across -1..1 and the dome's radius is nearly 1, so x and z serve as they are.
    uv.setXY(index, x * 0.5 + 0.5, z * 0.5 + 0.5);
    const { face, centre } = scuteAt(x, z);
    const lift = 1 + 0.05 * (face - 1) + 0.02 * centre * face;
    position.setXYZ(index, x * lift, position.getY(index) * lift, z * lift);
  }
  dome.scale(1, DOME_HEIGHT / DOME_RADIUS, 1);
  return coloured(dome, 0xffffff);
}

// Twelve puffy pads round the rim, flattened and a little overlapping, each a pale lobe darker where it meets the
// next and underneath. Their texture coordinates sit in the picture's white corner (kept spread, so the normal
// map has a direction to work from).
export function buildLobes() {
  return Array.from({ length: LOBES }, (unused, index) => {
    const angle = ((index + 0.5) / LOBES) * Math.PI * 2;
    const lobe = new THREE.SphereGeometry(1, 16, 10).scale(LOBE_SIZE.across, LOBE_SIZE.up, LOBE_SIZE.along);
    const { position, uv } = lobe.attributes;
    for (let vertex = 0; vertex < uv.count; vertex += 1) {
      uv.setXY(vertex, 0.01 + uv.getX(vertex) * 0.02, 0.01 + uv.getY(vertex) * 0.02);
    }
    // Long side along the rim, which at this angle runs along (-sin, cos) in x and z.
    lobe.rotateY(-angle);
    at(lobe, Math.cos(angle) * LOBE_RADIUS, 0, Math.sin(angle) * LOBE_RADIUS);
    return shaded(coloured(lobe, WHITE), (x, y, z) => (y < 0 ? 0.55 + 0.45 * (1 + y / LOBE_SIZE.up) : 1) * (0.9 + 0.1 * Math.min(Math.hypot(x, z) / LOBE_RADIUS, 1)));
  });
}

// A dark bowl under the lobes, seen only where the shell is tipped out of the water.
export function buildUnderside() {
  const bowl = new THREE.CylinderGeometry(LOBE_RADIUS, LOBE_RADIUS * 0.6, 0.3, 24, 1, false);
  const { uv } = bowl.attributes;
  for (let vertex = 0; vertex < uv.count; vertex += 1) {
    uv.setXY(vertex, 0.01 + uv.getX(vertex) * 0.02, 0.01 + uv.getY(vertex) * 0.02);
  }
  return coloured(at(bowl, 0, -0.14, 0), UNDERSIDE);
}
