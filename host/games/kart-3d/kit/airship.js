// The kit's airship (M7d3), drifting round a sky course as blimps and airships do round MK8DX's: a white envelope
// with red bands at its nose and tail, four red fins, a gondola with windows, two propellers that spin, and a
// sponsor banner (kit/sponsors.js) on each flank. It flies a circle, banking a little into it. Used by the
// seaside surroundings.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedBox } from '../shape-utils.js';
import { sponsorUv } from './sponsors.js';

const LENGTH = 26;
const RADIUS = 4.6;
const RED = 0xd8302a;
// The banner shows this brand (Super Marine World, for a seaside course).
const BANNER_BRAND = 7;
const PROPELLER_SPIN = 14;

// `kit` is the course's { keep, sponsors } (kit/kit.js); `path` is { x, z, radius, height, seconds }. Returns
// { object, update(dt) }: the airship to add to the world, and moving it on.
export function buildAirship({ keep, sponsors }, path) {
  const group = new THREE.Group();
  const painted = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
  group.add(new THREE.Mesh(keep(buildBody()), painted));
  group.add(new THREE.Mesh(keep(buildBanners()), sponsors));
  const propellers = [-1, 1].map((side) => {
    const propeller = new THREE.Mesh(keep(buildPropeller()), painted);
    propeller.position.set(side * 2.3, -RADIUS - 0.9, -3.2);
    group.add(propeller);
    return propeller;
  });
  let time = 0;
  function update(dt) {
    time += dt;
    const angle = (2 * Math.PI * time) / path.seconds;
    group.position.set(path.x + Math.cos(angle) * path.radius, path.height + Math.sin(time * 0.4) * 1.5, path.z + Math.sin(angle) * path.radius);
    // Nose along the circle (counterclockwise seen from above), banked a little toward its middle.
    group.rotation.set(0, -angle, 0.06, 'YXZ');
    propellers.forEach((propeller) => (propeller.rotation.z = time * PROPELLER_SPIN));
  }
  update(0);
  return { object: group, update };
}

// The envelope along +z, its red nose and tail bands, the fins and the gondola under it.
function buildBody() {
  const envelope = new THREE.SphereGeometry(RADIUS, 24, 16).scale(1, 1, LENGTH / (2 * RADIUS));
  const band = (z, width) => coloured(at(new THREE.CylinderGeometry(1, 1, width, 24, 1, true).rotateX(Math.PI / 2), 0, 0, z), RED);
  // Bands sit a hair outside the envelope where it is this wide.
  const bandAt = (z, width) => {
    const share = z / (LENGTH / 2);
    return band(z, width).scale(RADIUS * Math.sqrt(1 - share * share) * 1.01, RADIUS * Math.sqrt(1 - share * share) * 1.01, 1);
  };
  const fins = [0, 1, 2, 3].map((fin) => coloured(roundedBox(0.3, 4.2, 4.4, 0.12).translate(0, RADIUS * 0.75, -LENGTH / 2 + 2.8).rotateZ((fin * Math.PI) / 2 + Math.PI / 4), RED));
  return mergeShapes([
    coloured(envelope, 0xf4f4f0),
    bandAt(LENGTH * 0.36, 1.6),
    bandAt(-LENGTH * 0.33, 1.4),
    ...fins,
    coloured(at(roundedBox(2.6, 1.6, 6, 0.4), 0, -RADIUS - 0.6, 0), 0xf4f4f0),
    coloured(at(roundedBox(2.7, 0.6, 4.8, 0.2), 0, -RADIUS - 0.5, 0.2), 0x2a4050),
    coloured(at(roundedBox(2.8, 0.25, 6.2, 0.1), 0, -RADIUS - 1.35, 0), RED),
  ]);
}

// A banner on each flank, slightly outside the envelope, reading front to back.
function buildBanners() {
  const banners = [-1, 1].map((side) => {
    const banner = new THREE.PlaneGeometry(12, 3.2).rotateY((side * Math.PI) / 2);
    const uv = banner.attributes.uv;
    for (let index = 0; index < uv.count; index += 1) {
      uv.setXY(index, ...sponsorUv(BANNER_BRAND, uv.getX(index), uv.getY(index)));
    }
    return at(banner, side * (RADIUS + 0.05), 0, 0);
  });
  return mergeShapes(banners);
}

// Two blades and a hub, turning about z.
function buildPropeller() {
  return mergeShapes([
    coloured(new THREE.BoxGeometry(0.25, 2.6, 0.08), 0x3a3a40),
    coloured(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 8).rotateX(Math.PI / 2), RED),
  ]);
}
