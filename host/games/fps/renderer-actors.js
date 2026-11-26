// Keeps the project-built third-person player models synchronized with the host's match state.

import { PLAYER_COLORS } from '/host/roster.js';
import { createAvatar } from './avatar.js';

function interpolate(previous, current, alpha) {
  return previous + (current - previous) * alpha;
}

function interpolateAngle(previous, current, alpha) {
  const delta = Math.atan2(Math.sin(current - previous), Math.cos(current - previous));
  return previous + delta * alpha;
}

export function createRenderActors(scene) {
  const actors = new Map();

  function removeActor(id, actor) {
    scene.remove(actor.avatar.root);
    actors.delete(id);
  }

  function synchronize(players, alpha, dt) {
    const activeIds = new Set(players.map((player) => player.id));
    for (const [id, actor] of actors) {
      if (!activeIds.has(id)) removeActor(id, actor);
    }

    players.forEach((player, index) => {
      const layer = index + 1;
      let actor = actors.get(player.id);
      if (actor && (actor.colorIndex !== player.colorIndex || actor.layer !== layer)) {
        removeActor(player.id, actor);
        actor = null;
      }
      if (!actor) {
        const avatar = createAvatar(PLAYER_COLORS[player.colorIndex] ?? PLAYER_COLORS[0]);
        avatar.setLayer(layer);
        scene.add(avatar.root);
        actor = { avatar, colorIndex: player.colorIndex, layer };
        actors.set(player.id, actor);
      }

      actor.avatar.root.position.set(
        interpolate(player.px, player.x, alpha),
        interpolate(player.py, player.y, alpha),
        interpolate(player.pz, player.z, alpha),
      );
      actor.avatar.root.rotation.y = interpolateAngle(player.pyaw, player.yaw, alpha);
      actor.avatar.update(player, dt);
    });
  }

  function configureCamera(camera, viewerId) {
    camera.layers.set(0);
    for (const [id, actor] of actors) {
      if (id !== viewerId) camera.layers.enable(actor.layer);
    }
  }

  function destroy() {
    actors.clear();
  }

  return { synchronize, configureCamera, destroy };
}
