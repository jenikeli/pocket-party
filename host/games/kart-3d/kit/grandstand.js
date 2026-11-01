// The kit's grandstand (M7d2, rebuilt to the M7d4 study in M7d4c3 after Toad Circuit's in MK8DX): two decks of
// stepped seating on silver lattice columns (kit/grandstand-structure.js) under a cantilevered roof with a MARIO
// KART fascia (kit/grandstand-roof.js), sponsor boards (kit/sponsors.js) along its front wall, and a crowd of
// small Toad-like spectators who hop now and then (kit/grandstand-crowd.js). Built straight, facing +z (toward
// the road), standing on y = 0 with its front at z = 0. Used by the courses' dressings.

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { sponsorUv } from './sponsors.js';
import { withShadows } from './frames.js';
import { createCanvas, repeatingTexture } from '../canvas-texture.js';
import { standLayout, seatSpots, seatColor, buildSeat, buildDecksAndStairs } from './grandstand-structure.js';
import { buildRoof } from './grandstand-roof.js';
import { buildCrowd } from './grandstand-crowd.js';

// The concrete's tile (kit/concrete.js) is stretched over this many units, so its stains do not repeat every unit.
const CONCRETE_TILE = 4;
const FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';

// `length` along the road. `kit` is the course's (kit/kit.js): its keep, sponsors and textures are used.
// Returns { object, update(dt) }: the stand as a group to place, and moving the crowd on.
export function buildGrandstand(length, { keep, sponsors, textures }) {
  const group = new THREE.Group();
  const layout = standLayout(length);
  const below = buildDecksAndStairs(length);
  const roof = buildRoof(length, layout.columnXs);
  const concrete = keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.concrete, normalMap: textures.concreteRelief, roughness: 0.85 }));
  const painted = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
  const steel = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.5 }));
  const sign = keep(new THREE.MeshStandardMaterial({ map: keep(drawSignTexture()), roughness: 0.4 }));
  group.add(
    withShadows(new THREE.Mesh(keep(stretchUv(mergeShapes(below.concrete), 1 / CONCRETE_TILE)), concrete)),
    withShadows(new THREE.Mesh(keep(mergeShapes(roof.painted)), painted)),
    receivingShadows(new THREE.Mesh(keep(mergeShapes([...below.steel, ...roof.steel])), steel)),
    receivingShadows(new THREE.Mesh(keep(roof.sign), sign)),
    withShadows(new THREE.Mesh(keep(buildBoards(layout)), sponsors)),
    buildSeats(length, keep),
  );
  const crowd = buildCrowd(seatSpots(length), keep);
  group.add(...crowd.meshes);
  return { object: group, update: crowd.update };
}

// For what casts no shadow of its own but takes others': the steelwork, all under the roof, whose shadow covers
// its own (and its thin beams would be drawn again in the shadow map for nothing), and the sign on the fascia's
// face.
function receivingShadows(mesh) {
  mesh.receiveShadow = true;
  return mesh;
}

// A seat shell on every seat, in its deck's colour: one instanced mesh. Too small for their shadows to show, so
// they cast none.
function buildSeats(length, keep) {
  const spots = seatSpots(length);
  const material = keep(new THREE.MeshStandardMaterial({ roughness: 0.35 }));
  const mesh = new THREE.InstancedMesh(keep(mergeShapes(buildSeat())), material, spots.length);
  const matrix = new THREE.Matrix4();
  spots.forEach((spot, index) => {
    mesh.setMatrixAt(index, matrix.makeTranslation(spot.x, spot.y, spot.z));
    mesh.setColorAt(index, new THREE.Color(seatColor(spot.deck)));
  });
  mesh.receiveShadow = true;
  return mesh;
}

// Boards along the front wall (kit/grandstand-structure.js lays them out), each a different brand.
function buildBoards({ halfSeating, frontWall }) {
  const width = (2 * halfSeating) / frontWall.boards;
  const height = frontWall.top - frontWall.bottom;
  const middle = (frontWall.top + frontWall.bottom) / 2;
  return mergeShapes(
    Array.from({ length: frontWall.boards }, (_, index) => {
      const board = new THREE.PlaneGeometry(width - 0.08, height);
      const uv = board.attributes.uv;
      for (let corner = 0; corner < uv.count; corner += 1) {
        uv.setXY(corner, ...sponsorUv(index * 7 + 2, uv.getX(corner), uv.getY(corner)));
      }
      return board.translate(-halfSeating + (index + 0.5) * width, middle, frontWall.front + 0.01);
    }),
  );
}

// `geometry`'s texture coordinates multiplied by `scale`; returns it.
function stretchUv(geometry, scale) {
  const uv = geometry.attributes.uv;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) * scale, uv.getY(index) * scale);
  }
  return geometry;
}

// One tile of the fascia's sign: MARIO KART in white with a dark outline on red, a white star at each end. It
// repeats along the fascia.
function drawSignTexture() {
  const { canvas, context } = createCanvas(1024, 80);
  context.fillStyle = '#d8302a';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = `64px ${FONT}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = 10;
  context.strokeStyle = '#5a0c08';
  context.strokeText('MARIO KART', 512, 44);
  context.fillStyle = '#ffffff';
  context.fillText('MARIO KART', 512, 44);
  for (const x of [128, 896]) {
    drawStar(context, x, 40, 26);
  }
  return repeatingTexture(canvas);
}

// A five-pointed white star with a dark outline, centred at (x, y), `radius` pixels to its points.
function drawStar(context, x, y, radius) {
  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const reach = point % 2 === 0 ? radius : radius * 0.45;
    context.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
  }
  context.closePath();
  context.lineWidth = 6;
  context.stroke();
  context.fill();
}
