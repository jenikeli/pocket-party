// A pool of curved lines of light for the magnet's pull (M8c): each target gets a bundle of lines that bulge apart
// between its kart and the magnet and meet at both ends, like a magnet's field lines, with a pulse of brightness
// running along each toward the magnet. Lines are made the first time they are needed and reused after, so a frame
// allocates nothing once the pool has grown to the most shown at once. Plain blending and colours no brighter than
// the colour itself, so nothing reaches the bloom's threshold where lines meet. Used by magnet-look.js.

import * as THREE from 'three';

const LINE_POINTS = 16;
const LINES_PER_TARGET = 5;
// How far apart the bundle's lines bulge (a share of the distance), and how much they rise with it.
const BULGE = 0.1;
const RISE = 0.5;
// The pulses of light: cycles a second, their share of a line's length, each line a little out of step; between
// pulses the line keeps this share of its brightness.
const PULSE_RATE = 1.4;
const PULSE_LENGTH = 0.35;
const STAGGER = 0.2;
const LINE_FLOOR = 0.5;
const LINE_HEX = 0xff8a7a;

// Returns { begin(time), place(from, to, up), end(), dispose() }: begin with the drawing's running time, place a
// bundle for each target (`from` the target's end, `to` the magnet's, `up` the road's up there, each { x, y, z }),
// then end, which hides the rest.
export function createLinePool(scene) {
  const lines = [];
  let used = 0;
  let time = 0;
  const control = new THREE.Vector3();
  const side = new THREE.Vector3();
  // One line is made now, visible but degenerate (every point at the origin), so the renderer builds the shader
  // while the game starts (renderer.js compiles every visible thing) instead of stalling on the first magnet.
  lines.push(makeLine());

  function begin(runningTime) {
    used = 0;
    time = runningTime;
  }

  function place(from, to, up) {
    side.set(to.x - from.x, to.y - from.y, to.z - from.z).cross(up).normalize();
    const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
    for (let k = 0; k < LINES_PER_TARGET; k += 1) {
      if (used === lines.length) {
        lines.push(makeLine());
      }
      const offset = (k - (LINES_PER_TARGET - 1) / 2) * BULGE * distance;
      // The bulge goes sideways and up along the road's up, so on a banked or sloped road it still lifts off it.
      control.set((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2)
        .addScaledVector(side, offset)
        .addScaledVector(up, Math.abs(offset) * RISE);
      shape(lines[used], from, to, k);
      lines[used].visible = true;
      used += 1;
    }
  }

  // The curve from `from` to `to` through `control`, brightest at its pulse's front.
  function shape(line, from, to, k) {
    const positions = line.geometry.attributes.position;
    const colors = line.geometry.attributes.color;
    for (let point = 0; point < LINE_POINTS; point += 1) {
      const along = point / (LINE_POINTS - 1);
      const keep = 1 - along;
      positions.setXYZ(
        point,
        keep * keep * from.x + 2 * keep * along * control.x + along * along * to.x,
        keep * keep * from.y + 2 * keep * along * control.y + along * along * to.y,
        keep * keep * from.z + 2 * keep * along * control.z + along * along * to.z,
      );
      const behind = (((time * PULSE_RATE + k * STAGGER - along) % 1) + 1) % 1;
      const glow = LINE_FLOOR + (1 - LINE_FLOOR) * Math.max(1 - behind / PULSE_LENGTH, 0);
      colors.setXYZ(point, glow, glow, glow);
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }

  function end() {
    for (let index = used; index < lines.length; index += 1) {
      lines[index].visible = false;
    }
  }

  function makeLine() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINE_POINTS * 3), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(LINE_POINTS * 3), 3));
    const material = new THREE.LineBasicMaterial({ color: LINE_HEX, vertexColors: true, depthWrite: false });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.renderOrder = 2;
    scene.add(line);
    return line;
  }

  function dispose() {
    lines.forEach((line) => {
      scene.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    });
  }

  return { begin, place, end, dispose };
}
