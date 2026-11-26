// Shots: a ray against the map's boxes and the players' hit boxes (head, torso, legs), with wall penetration
// through thin wood and sheet metal, hit confirmation, damage numbers and kills. The host resolves a shot in its own
// step against its own state, so there is no lag compensation to do. No DOM, unit tested. Used by weapons.js and
// grenades.js.

import { TUNING } from './tuning.js';
import { rayBox } from './collision.js';
import { emit } from './world.js';

// How much of a shot's damage gets through a box of each material (0 stops it). A box thicker than MAX_THICKNESS
// stops it whatever it is made of.
const MAT_PEN = { container: 0, concrete: 0, steel: 0.35, metal: 0.45, wood: 0.6 };
const MAX_THICKNESS = 1.3;

function raySphere(origin, dir, center, radius) {
  const ox = origin.x - center.x;
  const oy = origin.y - center.y;
  const oz = origin.z - center.z;
  const b = ox * dir.x + oy * dir.y + oz * dir.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const disc = b * b - c;
  if (disc < 0) {
    return null;
  }
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : null;
}

// The part of a player a ray hits first: { t, part: 'head' | 'torso' | 'legs' } or null.
export function hitPlayer(player, origin, dir, maxT) {
  const height = TUNING.height + (TUNING.crouchHeight - TUNING.height) * player.crouch;
  const head = raySphere(origin, dir, { x: player.x, y: player.y + height - 0.2, z: player.z }, 0.22);
  if (head !== null && head <= maxT) {
    return { t: head, part: 'head' };
  }
  const half = 0.32;
  const torso = rayBox({ x0: player.x - half, x1: player.x + half, z0: player.z - half, z1: player.z + half, y0: player.y + 0.5, y1: player.y + height - 0.35 }, origin, dir, maxT);
  const legs = rayBox({ x0: player.x - half * 0.8, x1: player.x + half * 0.8, z0: player.z - half * 0.8, z1: player.z + half * 0.8, y0: player.y, y1: player.y + 0.5 }, origin, dir, maxT);
  if (torso && (!legs || torso.t <= legs.t)) {
    return { t: torso.t, part: 'torso' };
  }
  return legs ? { t: legs.t, part: 'legs' } : null;
}

// Whether `shooter` may hurt `victim`: alive, not protected, not itself, and not a teammate in a team mode.
export function canHurt(world, shooter, victim) {
  if (!victim.alive || victim === shooter || world.time < victim.protectedUntil) {
    return false;
  }
  return !(world.teams && shooter.team === victim.team);
}

// Takes `amount` off a player; `by` is the attacker (or null), `weapon` its weapon id. Emits hit and kill events.
export function damagePlayer(world, victim, amount, by, weapon, head, point) {
  if (!victim.alive || amount <= 0) {
    return;
  }
  const absorbed = Math.min(victim.armor, amount * 0.5);
  victim.armor -= absorbed;
  victim.hp -= amount - absorbed;
  victim.hurt = { n: victim.hurt.n + 1, yaw: by ? Math.atan2(by.x - victim.x, by.z - victim.z) : 0 };
  if (by && by !== victim) {
    by.hit = { n: by.hit.n + 1, head };
  }
  emit(world, 'hit', { pid: by?.id ?? null, victim: victim.id, amount, head, x: point.x, y: point.y, z: point.z });
  if (victim.hp <= 0) {
    victim.hp = 0;
    victim.alive = false;
    victim.deaths += 1;
    victim.killedBy = by ? by.id : null;
    victim.respawnAt = world.time + TUNING.respawnSeconds;
    if (by && by !== victim) {
      by.kills += 1;
    }
    emit(world, 'kill', { killer: by?.id ?? null, victim: victim.id, weapon, head, x: victim.x, y: victim.y + 1, z: victim.z });
    world.onKill?.(by, victim);
  }
}

// Casts one ray (a bullet or one pellet) from `origin` along `dir`. Walks the hits in order: passes through thin
// penetrable boxes at reduced damage, stops at the first player it hurts or the first solid box.
export function castShot(world, shooter, origin, dir, gun) {
  const hits = [];
  for (const box of world.boxes) {
    const hit = rayBox(box, origin, dir, gun.range);
    if (hit) {
      hits.push({ kind: 'box', t: hit.t, tExit: hit.tExit, box, normal: hit.normal });
    }
  }
  for (const victim of world.players) {
    if (canHurt(world, shooter, victim)) {
      const hit = hitPlayer(victim, origin, dir, gun.range);
      if (hit) {
        hits.push({ kind: 'player', t: hit.t, part: hit.part, victim });
      }
    }
  }
  hits.sort((a, b) => a.t - b.t);
  let damage = gun.damage * (gun.pellets > 1 ? 1 : 1);
  let end = gun.range;
  for (const hit of hits) {
    const point = { x: origin.x + dir.x * hit.t, y: origin.y + dir.y * hit.t, z: origin.z + dir.z * hit.t };
    if (hit.kind === 'player') {
      const multiplier = { head: TUNING.headMultiplier, torso: TUNING.torsoMultiplier, legs: TUNING.legMultiplier }[hit.part];
      damagePlayer(world, hit.victim, damage * multiplier, shooter, gun.id, hit.part === 'head', point);
      emit(world, 'impact', { x: point.x, y: point.y, z: point.z, nx: -dir.x, ny: -dir.y, nz: -dir.z, mat: 'flesh' });
      end = hit.t;
      break;
    }
    emit(world, 'impact', { x: point.x, y: point.y, z: point.z, nx: hit.normal.x, ny: hit.normal.y, nz: hit.normal.z, mat: hit.box.mat });
    const keep = Math.min(0.9, ((MAT_PEN[hit.box.mat] ?? 0) * gun.pen) / 0.5);
    if (keep <= 0 || hit.tExit - hit.t > MAX_THICKNESS) {
      end = hit.t;
      break;
    }
    damage *= keep;
  }
  emit(world, 'shot', { pid: shooter.id, weapon: gun.id, x: origin.x, y: origin.y, z: origin.z, ex: origin.x + dir.x * end, ey: origin.y + dir.y * end, ez: origin.z + dir.z * end });
}

// The knife: a short ray; a hit from behind (the victim facing the same way) does full back-stab damage.
export function meleeHit(world, shooter, origin, dir, gun) {
  let best = null;
  for (const victim of world.players) {
    if (!canHurt(world, shooter, victim)) {
      continue;
    }
    const hit = hitPlayer(victim, origin, dir, gun.range);
    if (hit && (!best || hit.t < best.hit.t)) {
      best = { victim, hit };
    }
  }
  if (!best) {
    return;
  }
  const behind = Math.cos(best.victim.yaw - shooter.yaw) > 0.5;
  const point = { x: best.victim.x, y: best.victim.y + 1.2, z: best.victim.z };
  damagePlayer(world, best.victim, behind ? 100 : gun.damage, shooter, 'knife', false, point);
}
