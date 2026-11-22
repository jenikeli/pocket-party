// The rig player: builds one character from its atlas frames (body, head, arms, prop, feet) and moves them each
// frame from puppet-motion.js. Dawn troops walk up the screen and show their back, Dusk troops walk down and show
// their front; sideways movement flips the whole puppet. Used by unit-sprite.js.

import { forward } from '../../../shared/arena-map.js';
import { ATLAS_KEY, ART_SCALE, frameName, rigOf } from './atlas.js';
import { createMotion, advance, poseOf } from './puppet-motion.js';

const FEET = ['footA', 'footB'];
const MIRRORED = ['armBack', 'armFront', 'prop', 'footA', 'footB'];
const TURN_SECONDS = 0.12;
const SCALE = 1 / ART_SCALE;

// What colour wash the parts wear: a white flash on a hit, then blue when slowed, purple when cursed.
function tintMode(unit, pose) {
  if (pose.flash) {
    return 'flash';
  }
  if (unit.slow.left > 0 && unit.slow.factor < 1) {
    return 'slow';
  }
  return unit.curse.stacks > 0 ? 'curse' : 'none';
}

export function createPuppet(scene, unit) {
  const folder = unit.cardId;
  const rig = rigOf(folder);
  const state = createMotion(Number(unit.id.slice(1)));
  const root = scene.add.container(0, 0);
  const flipper = scene.add.container(0, 0);
  const lower = scene.add.container(0, 0);
  const upper = scene.add.container(0, 0);
  flipper.add([lower, upper]);
  root.add(flipper);
  const images = {};
  for (const [name, info] of Object.entries(rig.parts)) {
    images[name] = scene.add.image(0, 0, ATLAS_KEY, frameName(folder, name)).setOrigin(info.pivot[0] / info.w, info.pivot[1] / info.h).setScale(SCALE);
    (FEET.includes(name) ? lower : upper).add(images[name]);
  }
  const view = { set: null, flip: 1, turn: 0, pending: null, tint: 'none' };
  const bodyHeight = rig.parts.body.h;

  function showSet(set) {
    view.set = set;
    const names = rig.order[set];
    Object.entries(images).forEach(([name, image]) => image.setVisible(names.includes(name)));
    names.filter((name) => !FEET.includes(name)).forEach((name) => upper.bringToTop(images[name]));
  }

  // Which side the unit shows: its team's walking direction unless it is moving clearly up or down the screen.
  function chooseSet(dt) {
    const defaultSet = forward(unit.team) < 0 ? 'back' : 'front';
    const vertical = Math.sin(unit.facing);
    const wanted = Math.abs(vertical) < 0.35 ? defaultSet : (vertical < 0 ? 'back' : 'front');
    if (view.set === null) {
      showSet(wanted);
    } else if (wanted !== view.set && view.turn <= 0) {
      view.turn = TURN_SECONDS;
      view.pending = wanted;
    }
    if (view.turn > 0) {
      view.turn -= dt;
      if (view.turn <= TURN_SECONDS / 2 && view.pending !== view.set) {
        showSet(view.pending);
      }
    }
    if (Math.abs(Math.cos(unit.facing)) > 0.5) {
      view.flip = Math.cos(unit.facing) < 0 ? -1 : 1;
    }
  }

  function place(image, name, x, y, rotation = 0, scaleX = 1, scaleY = 1) {
    const mirrored = view.set === 'back' && MIRRORED.includes(name);
    image.setPosition(mirrored ? -x : x, y);
    image.setRotation(mirrored ? -rotation : rotation);
    image.setScale((mirrored ? -SCALE : SCALE) * scaleX, SCALE * scaleY);
  }

  // The prop rides in the front hand: the hand's offset from the arm's pivot, turned by the arm's angle.
  function placeProp(pose) {
    const arm = rig.parts.armFront;
    const prop = rig.parts.prop;
    const mirrored = view.set === 'back';
    if (!rig.hand || !arm) {
      place(images.prop, 'prop', prop.at[0], prop.at[1], pose.propSway, pose.propScale, pose.propScale);
      return;
    }
    const angle = pose.armFront * (mirrored ? -1 : 1);
    const offsetX = (rig.hand[0] - arm.pivot[0]) * (mirrored ? -1 : 1);
    const offsetY = rig.hand[1] - arm.pivot[1];
    const x = (mirrored ? -arm.at[0] : arm.at[0]) + offsetX * Math.cos(angle) - offsetY * Math.sin(angle);
    const y = arm.at[1] + offsetX * Math.sin(angle) + offsetY * Math.cos(angle);
    // `place` mirrors x itself, so hand it the unmirrored value.
    place(images.prop, 'prop', mirrored ? -x : x, y, pose.armFront + pose.propSway, pose.propScale, pose.propScale);
  }

  function setTint(mode) {
    if (mode === view.tint) {
      return;
    }
    view.tint = mode;
    const tints = { slow: 0x9bd3ff, curse: 0xc9a8ff };
    Object.values(images).forEach((image) => {
      if (mode === 'flash') {
        image.setTintFill(0xffffff);
      } else if (mode === 'none') {
        image.clearTint();
      } else {
        image.setTint(tints[mode]);
      }
    });
  }

  // `point` is where the unit's feet are on the canvas; `moved` the tiles travelled since the last frame.
  function update(point, dt, moved) {
    advance(state, unit, rig.gait, dt, moved);
    chooseSet(dt);
    const pose = poseOf(state, unit, rig.gait);
    const squeeze = view.turn > 0 ? 0.85 : 1;
    const direction = { x: Math.cos(unit.facing), y: Math.sin(unit.facing) };
    const push = pose.lunge - pose.knock;
    root.setPosition(point.x + direction.x * push, point.y - rig.lift + pose.dropY + direction.y * push);
    root.setAlpha(pose.alpha);
    flipper.setScale(view.flip, 1);
    upper.setPosition(0, -pose.bob);
    upper.setRotation(pose.lean);
    for (const [name, info] of Object.entries(rig.parts)) {
      if (!rig.order[view.set].includes(name) || name === 'prop') {
        continue;
      }
      const [x, y] = info.at;
      if (name === 'body' || name === 'bodyBack') {
        place(images[name], name, x, y, pose.bodyRot, pose.scaleX * squeeze, pose.scaleY);
      } else if (name === 'head' || name === 'headBack') {
        place(images[name], name, x, y - bodyHeight * (pose.headScale - 1), 0, squeeze, 1);
      } else if (FEET.includes(name)) {
        place(images[name], name, x, y + pose.feet[FEET.indexOf(name)].dy, rig.gait === 'roll' ? pose.wheel : 0);
      } else {
        place(images[name], name, x, y, name === 'armBack' ? pose.armBack : pose.armFront);
      }
    }
    if (images.prop) {
      placeProp(pose);
    }
    setTint(tintMode(unit, pose));
    return pose;
  }

  return { root, rig, state, update, destroy: () => root.destroy() };
}
