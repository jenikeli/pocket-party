// How the sticky walls look (M8c): amber honey goo along every wall of the course (goo-strip-look.js) that oozes in
// over about 0.4 s when the item is used, glistens while it lasts and dries away dull and shrinking in the last
// second; and, on every kart held on a wall, goo blobs and strings (held-goo-look.js). Read from
// race.items.stickyLeft and each kart's item.stuckLeft (sticky-walls.js). Used by item-drawing.js.

import * as THREE from 'three';
import { tuning } from '../tuning.js';
import { createGooMaps, createGooMaterial, buildGooStrips, GLOSS } from './goo-strip-look.js';
import { createHeldGooDrawing } from './held-goo-look.js';

// The goo oozes in over this long, and dries away over the last DRY_SECONDS.
const OOZE_SECONDS = 0.4;
const DRY_SECONDS = 1;
// Wet goo is the map's own colours; dried goo is tinted toward dull straw. The wet shine pulses at this rate
// (radians a second).
const WET_COLOR = new THREE.Color(0xffffff);
const DRY_COLOR = new THREE.Color(0xb59f6a);
const GLISTEN_RATE = 4;

// Returns { update(race, track, poses, dt), dispose() } (item-drawing.js's shape). The strips are built the first
// time a track is seen and again if it changes.
export function createStickyWallsDrawing(scene) {
  const maps = createGooMaps();
  const { material, uniforms } = createGooMaterial(maps);
  const heldGoo = createHeldGooDrawing(scene, maps);
  let strips = null;
  let stripsTrack = null;
  let time = 0;

  function update(race, track, poses, dt) {
    time += dt;
    showStrips(track, race?.items?.stickyLeft ?? 0);
    heldGoo.update(race, track, poses, time);
  }

  // The goo along the walls for `left` seconds still to run (0: gone). Hidden while gone, except on the frame it
  // is first built, so the renderer builds its shader with the game rather than at the first use.
  function showStrips(track, left) {
    const justBuilt = stripsTrack !== track;
    if (justBuilt) {
      rebuildStrips(track);
    }
    if (!strips) {
      return;
    }
    const elapsed = tuning.itemEffectSeconds - left;
    uniforms.grow.value = left > 0 ? Math.min(elapsed / OOZE_SECONDS, left / DRY_SECONDS, 1) : 0;
    const dried = left > 0 ? 1 - Math.min(left / DRY_SECONDS, 1) : 0;
    material.color.copy(WET_COLOR).lerp(DRY_COLOR, dried);
    material.roughness = GLOSS + 0.6 * dried;
    material.emissiveIntensity = 0.2 + 0.1 * Math.sin(time * GLISTEN_RATE);
    strips.visible = left > 0 || justBuilt;
  }

  function rebuildStrips(track) {
    if (strips) {
      scene.remove(strips);
      strips.geometry.dispose();
      strips = null;
    }
    stripsTrack = track;
    if (track) {
      strips = new THREE.Mesh(buildGooStrips(track), material);
      strips.frustumCulled = false;
      scene.add(strips);
    }
  }

  function dispose() {
    rebuildStrips(null);
    heldGoo.dispose();
    material.dispose();
    maps.map.dispose();
    maps.normalMap.dispose();
  }

  return { update, dispose };
}
