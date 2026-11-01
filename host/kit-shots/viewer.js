// The kit-shots page's script: builds one kit piece (pieces.js, named by ?piece=) on a short straight of road, lit
// as in the race, and draws one frame from ?view=near (kart height) or ?view=above (higher up, farther back).
// Sets window.kitShotReady when the frame is drawn, or window.kitShotError with a message. Used by
// tools/kit-shots.js, which waits for either.

import * as THREE from 'three';
import { buildTrack } from '../games/kart-3d/track-builder.js';
import { addSkyLight, createSkyEnvironment, SEA } from '../games/kart-3d/scenery.js';
import { addSun } from '../games/kart-3d/sun.js';
import { bakeShade } from '../games/kart-3d/baked-shade.js';
import { createCourseLight } from '../games/kart-3d/course-light.js';
import { loadPhotoAsphalt } from '../games/kart-3d/photo-asphalt.js';
import { buildSeasideRoad } from '../games/kart-3d/seaside-scenery.js';
import { createKit } from '../games/kart-3d/kit/kit.js';
import { stationIndexAt } from '../games/kart-3d/track.js';
import { edgeLateral } from '../games/kart-3d/kit/frames.js';
import { tuning } from '../games/kart-3d/tuning.js';
import { dressSea } from '../games/kart-3d/kit/sea.js';
import { PIECES } from './pieces.js';
import { SEA_DROP } from './landmark-pieces.js';

const WIDTH = 1280;
const HEIGHT = 720;
const SKY_BLUE = 0xa9d4ff;
// A kart driver's eye is about this far above the road.
const KART_EYE_HEIGHT = 1.2;
// The ground beside the right side of a 'shouldered' road, wide enough for the biggest prop.
const SHOULDER_WIDTH = 14;

// A short loop (a 60-unit straight, then three plain corners and a second straight), so the course's bake and
// light work as in a race. Only the first straight is shown. `road` is the piece's kind of road (pieces.js).
function buildShowTrack(road) {
  const shouldered = road === 'shouldered';
  const walls = shouldered ? 'none' : 'both';
  return buildTrack({
    halfWidth: 8, startLine: 30, scenery: 'seaside', dashPanels: [],
    pieces: [
      { straight: 60, walls, shoulderRight: shouldered ? SHOULDER_WIDTH : 0 },
      { turn: 90, radius: 30, walls: 'none' }, { straight: 20, walls: 'none' },
      { turn: 90, radius: 30, walls: 'none' }, { straight: 60, walls: 'none' },
      { turn: 90, radius: 30, walls: 'none' }, { straight: 20, walls: 'none' },
      { turn: 90, radius: 30, walls: 'none' },
    ],
  });
}

function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(WIDTH, HEIGHT);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = tuning.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.append(renderer.domElement);
  return renderer;
}

// The same order as the race's buildWorld (renderer.js): world built and added to the scene, shade baked into it,
// then the light taken from the course and set as the scene's environment.
async function buildLitScene(renderer, track, piece) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_BLUE);
  // Nothing is disposed: the page is closed after its picture, so keep() has nothing to register.
  const keep = (thing) => thing;
  const world = new THREE.Group();
  addSkyLight(world);
  const sun = addSun(world, track, keep);
  world.add(...buildSeasideRoad(track, await loadPhotoAsphalt()).meshes);
  const seaLevel = track.stations[0].point.y - SEA_DROP;
  if (piece.sea) {
    addSea(world, keep, seaLevel);
  }
  await piece.build(createKit({ world, track, keep }), seaLevel);
  scene.add(world);
  scene.environment = createSkyEnvironment(renderer).texture;
  scene.environmentIntensity = 1;
  bakeShade(renderer, world, track);
  scene.environment = createCourseLight(renderer, scene, track, sun).texture;
  scene.environmentIntensity = tuning.courseLightStrength;
  return { scene, sun };
}

// The race's sea (scenery.js's plane, kit/sea.js's ripples) at `y`, for the pieces that stand in it.
function addSea(world, keep, y) {
  const sea = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(3000, 3000)),
    keep(new THREE.MeshStandardMaterial({ color: SEA, roughness: 0.35 })),
  );
  sea.name = 'sea';
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = y;
  world.add(sea);
  dressSea(sea, keep);
}

const toVector = ({ x, y, z }) => new THREE.Vector3(x, y, z);

// The camera for a piece's focus (pieces.js): on the road's side of the piece and behind it along the road, so it
// looks down the road at the piece. "near" stands at kart height close by, "above" higher up and farther back.
function buildCamera(track, focus, view) {
  const station = track.stations[stationIndexAt(track, focus.s)];
  const right = toVector(station.right);
  const tangent = toVector(station.tangent);
  // The gate (side 0) stands over the road's middle; the camera stands to the right of it.
  const sideOfPiece = focus.side === 0 ? 1 : focus.side;
  const lateral = focus.side === 0 ? 0 : edgeLateral(station, sideOfPiece) + sideOfPiece * focus.out;
  const target = toVector(station.point).addScaledVector(right, lateral).add(new THREE.Vector3(0, focus.height, 0));
  const near = view === 'near';
  const distance = near ? focus.size * 2.2 + 3 : focus.size * 3 + 8;
  const position = target.clone()
    .addScaledVector(tangent, -0.7 * distance)
    .addScaledVector(right, -sideOfPiece * (near ? 0.8 : 0.6) * distance);
  position.y = station.point.y + (near ? focus.eye ?? KART_EYE_HEIGHT : focus.size * 0.8 + 3.5);
  const camera = new THREE.PerspectiveCamera(near ? 40 : 35, WIDTH / HEIGHT, 0.1, 500);
  camera.position.copy(position);
  camera.lookAt(target);
  return camera;
}

async function showPiece() {
  const params = new URLSearchParams(location.search);
  const pieceName = params.get('piece');
  const piece = PIECES[pieceName];
  if (!piece) {
    throw new Error(`Unknown piece "${pieceName}". Known pieces: ${Object.keys(PIECES).join(', ')}`);
  }
  const track = buildShowTrack(piece.road);
  const renderer = createRenderer();
  const { scene, sun } = await buildLitScene(renderer, track, piece);
  const camera = buildCamera(track, piece.focus, params.get('view') || 'near');
  // The race fits the sun's shadow map round each view in turn; so does the picture.
  sun.usePerView(true);
  sun.fitView(camera);
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
}

try {
  await showPiece();
  window.kitShotReady = true;
} catch (error) {
  console.error('kit-shots viewer failed:', error);
  window.kitShotError = error.message;
}
