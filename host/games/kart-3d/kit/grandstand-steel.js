// The grandstand's silver steelwork (M7d4c3), as on Toad Circuit's stands in MK8DX: lattice truss columns (four
// legs tied by rings and zigzag braces, on a foot plate), flat lattice girders between two lines of points, and
// railings of round posts and rails. Each returns a list of thin shapes coloured per vertex, for the stand to
// merge into one steel mesh. Used by kit/grandstand-structure.js and kit/grandstand-roof.js.

import * as THREE from 'three';
import { roundedBox, at, between, coloured } from '../shape-utils.js';

export const STEEL = 0xd4d9df;
const LEG = 0.08;
const BRACE = 0.045;
const CHORD = 0.11;
// A column's rings are about this far apart up its height.
const PANEL = 0.8;
const RAIL = 0.03;
const POST = 0.035;

// A thin square beam from `from` to `to` ([x, y, z] each), `size` thick.
export function beam(from, to, size) {
  return coloured(between(new THREE.BoxGeometry(size, 1, size), from, to), STEEL);
}

// A round bar from `from` to `to`, few faces round: a railing's posts and rails, of which there are many.
function bar(from, to, radius) {
  return coloured(between(new THREE.CylinderGeometry(radius, radius, 1, 6), from, to), STEEL);
}

// A square lattice column `width` wide standing at (x, z) from `bottom` to `top`: four legs, a ring of braces at
// both ends and about every PANEL between, and a brace across each face of every panel, zigzagging up, on a
// bolted foot plate.
export function latticeColumn(x, z, bottom, top, width = 0.4) {
  const half = width / 2;
  const corners = [[-half, -half], [half, -half], [half, half], [-half, half]].map(([dx, dz]) => [x + dx, z + dz]);
  const panels = Math.max(1, Math.round((top - bottom) / PANEL));
  // The lowest ring stands on the foot plate; the highest just under the top, so neither pokes out past the legs.
  const [low, high] = [bottom + 0.1, top - BRACE / 2];
  const heightAt = (panel) => low + ((high - low) * panel) / panels;
  const parts = corners.map(([cornerX, cornerZ]) => beam([cornerX, bottom, cornerZ], [cornerX, top, cornerZ], LEG));
  for (let panel = 0; panel <= panels; panel += 1) {
    corners.forEach(([cornerX, cornerZ], index) => {
      const [nextX, nextZ] = corners[(index + 1) % 4];
      parts.push(beam([cornerX, heightAt(panel), cornerZ], [nextX, heightAt(panel), nextZ], BRACE));
      if (panel < panels) {
        // Each panel's brace leans the other way from the one below, so the braces zigzag up every face.
        const [from, to] = panel % 2 === 0 ? [heightAt(panel), heightAt(panel + 1)] : [heightAt(panel + 1), heightAt(panel)];
        parts.push(beam([cornerX, from, cornerZ], [nextX, to, nextZ], BRACE));
      }
    });
  }
  parts.push(coloured(at(roundedBox(width + 0.16, 0.08, width + 0.16, 0.025, { chamfered: true }), x, bottom + 0.04, z), STEEL));
  return parts;
}

// A flat lattice girder between two lines of points, `upper` and `lower` ([x, y, z] each, as many in both): a
// chord along each line, a post between each pair of points and a diagonal across every bay, zigzagging.
export function latticeGirder(upper, lower) {
  const parts = [];
  upper.forEach((point, index) => {
    parts.push(beam(point, lower[index], BRACE));
    if (index > 0) {
      parts.push(beam(upper[index - 1], point, CHORD), beam(lower[index - 1], lower[index], CHORD));
      parts.push(index % 2 === 0 ? beam(upper[index - 1], lower[index], BRACE) : beam(lower[index - 1], point, BRACE));
    }
  });
  return parts;
}

// `count` points evenly from `from` to `to` ([x, y, z] each), both ends included.
export function pointsAlong(from, to, count) {
  return Array.from({ length: count }, (_, index) => from.map((value, axis) => value + ((to[axis] - value) * index) / (count - 1)));
}

// A railing from `from` to `to` (the line its posts stand on): round posts about every `spacing`, `height` tall,
// a top rail over them and a middle rail.
export function railing(from, to, height, spacing) {
  const length = new THREE.Vector3(...from).distanceTo(new THREE.Vector3(...to));
  const feet = pointsAlong(from, to, Math.max(2, Math.round(length / spacing) + 1));
  const raised = (point, lift) => [point[0], point[1] + lift, point[2]];
  return [
    ...feet.map((foot) => bar(foot, raised(foot, height), POST)),
    bar(raised(from, height), raised(to, height), RAIL * 1.4),
    bar(raised(from, height / 2), raised(to, height / 2), RAIL),
  ];
}
