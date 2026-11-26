// The Saltline world: the map's boxes, the players, grenades in flight, smoke clouds, and the events the host turns
// into effects and sound. No DOM, unit tested. Made once per match by match.js and used by every rules file.

import { createRng } from '../arena/rng.js';

// `map` is a map from maps/index.js. Events are plain objects { type, time, ... } drained after each frame.
export function createWorld(map, seed) {
  return { map, boxes: map.boxes, time: 0, players: [], grenades: [], smokes: [], events: [], random: createRng(seed), nextId: 1, onKill: null };
}

export function emit(world, type, data = {}) {
  world.events.push({ type, time: world.time, ...data });
}

export function drainEvents(world) {
  return world.events.splice(0);
}

export function playerById(world, id) {
  return world.players.find((player) => player.id === id);
}

// The eye's world position, from the feet, the stance and the stance transition.
export function eyeOf(player, tuning) {
  return { x: player.x, y: player.y + tuning.eyeHeight + (tuning.crouchEye - tuning.eyeHeight) * player.crouch, z: player.z };
}

// The direction the player looks, a unit vector. yaw 0 faces -z; positive pitch looks up.
export function lookDirection(player) {
  const cosPitch = Math.cos(player.pitch);
  return { x: -Math.sin(player.yaw) * cosPitch, y: Math.sin(player.pitch), z: -Math.cos(player.yaw) * cosPitch };
}
