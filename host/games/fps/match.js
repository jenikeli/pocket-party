// A Saltline match: players (people and bots) in a world, the mode (Team Deathmatch or Free For All), the intro, the
// clock, scores, respawns and the result. One step runs the bots, every player's movement and weapon, the grenades
// and the end check. No DOM, unit tested. Used by session.js and tools/fps-sim.js.

import { TUNING } from './tuning.js';
import { MAPS } from './maps/index.js';
import { createWorld, emit } from './world.js';
import { createPlayer, movePlayer, spawn } from './player.js';
import { stepWeapon } from './weapons.js';
import { stepGrenades } from './grenades.js';
import { createBot, thinkBot } from './bots.js';
import { buildNav } from './nav.js';

const NAV = new Map();
const BOT_NAMES = ['Gull', 'Hound', 'Tern', 'Skua', 'Pike', 'Brine', 'Kelp', 'Rudder', 'Anchor', 'Fathom'];
const RELAY_ENEMIES = [
  { type: 'gull', name: 'Gull', primary: 'carbine' },
  { type: 'hound', name: 'Hound', primary: 'knife' },
  { type: 'hound', name: 'Hound', primary: 'knife' },
  { type: 'gull', name: 'Gull', primary: 'rifle' },
  { type: 'hound', name: 'Hound', primary: 'knife' },
];

function navFor(map) {
  if (!NAV.has(map.id)) {
    NAV.set(map.id, buildNav(map));
  }
  return NAV.get(map.id);
}

// `people` is [{ id, name, team, primary, colorIndex }] (team 0 or 1; ignored in Free For All). Bots fill each
// team to `perTeam` (Team Deathmatch) or the room to `total` (Free For All).
export function createMatch({ mapId = 'harbor', modeId = 'tdm', people = [], botLevel = 2, seed = 1, perTeam = 4, total = 8 }) {
  const map = MAPS[mapId];
  const mode = TUNING.modes[modeId];
  const world = createWorld(map, seed);
  world.teams = mode.teams;
  const match = { world, mode, map, nav: navFor(map), phase: 'intro', clock: TUNING.introSeconds, timeLeft: mode.seconds, scores: [0, 0], result: null,
    uplink: mode.uplink ? { planted: false, site: null, plantProgress: 0, defuseProgress: 0, remaining: 40 } : null,
    relays: mode.cooperative ? map.relays.map((relay) => ({ ...relay, cut: false, progress: 0 })) : [] };
  world.onKill = (killer, victim) => onKill(match, killer, victim);
  for (const person of people) {
    world.players.push(createPlayer({ ...person, human: true, team: mode.teams ? person.team : 2 }));
  }
  if (mode.cooperative) {
    RELAY_ENEMIES.forEach((enemy, index) => {
      const player = createPlayer({
        id: `enemy${index}`, name: enemy.name, team: 1, human: false, primary: enemy.primary,
        enemyType: enemy.type, colorIndex: index,
      });
      player.bot = createBot(botLevel);
      world.players.push(player);
    });
  } else {
    const wanted = mode.teams ? perTeam * 2 : total;
    let botNumber = 0;
    while (world.players.length < wanted) {
      const team = mode.teams ? [0, 1].find((side) => world.players.filter((p) => p.team === side).length < perTeam) : 2;
      const player = createPlayer({ id: `bot${botNumber}`, name: BOT_NAMES[botNumber % BOT_NAMES.length], team, human: false, primary: ['rifle', 'carbine', 'shotgun', 'rifle', 'sniper'][botNumber % 5], colorIndex: 0 });
      player.bot = createBot(botLevel);
      world.players.push(player);
      botNumber += 1;
    }
  }
  world.players.forEach((player) => spawn(world, player, pickSpawn(match, player)));
  return match;
}

// The spawn point farthest from the nearest living enemy.
function pickSpawn(match, player) {
  const { world, map } = match;
  const spots = world.teams ? map.spawns[player.team] : map.spawns.ffa;
  const enemies = world.players.filter((other) => other.alive && other !== player && (!world.teams || other.team !== player.team));
  let best = spots[0];
  let bestScore = -1;
  for (const spot of spots) {
    const score = enemies.length === 0 ? world.random() : Math.min(...enemies.map((enemy) => Math.hypot(enemy.x - spot.x, enemy.z - spot.z)));
    if (score > bestScore) {
      best = spot;
      bestScore = score;
    }
  }
  return best;
}

function onKill(match, killer, victim) {
  if (match.mode.cooperative) {
    const crew = match.world.players.filter((player) => player.human);
    if (crew.length > 0 && crew.every((player) => !player.alive)) {
      finish(match, 'team-wiped');
    }
    return;
  }
  if (match.mode.teams) {
    // A kill scores for the killer's team; a fall or a self-kill scores for the other team.
    const team = killer && killer !== victim ? killer.team : 1 - victim.team;
    match.scores[team] += 1;
  } else if (killer && killer !== victim) {
    killer.score += 1;
  }
}

function standings(match) {
  const { world, mode } = match;
  if (mode.teams) {
    const [a, b] = match.scores;
    return a === b ? { winner: null, top: a } : { winner: a > b ? 0 : 1, top: Math.max(a, b) };
  }
  const best = [...world.players].sort((p, q) => q.score - p.score);
  return best[1] && best[0].score === best[1].score ? { winner: null, top: best[0].score } : { winner: best[0].id, top: best[0].score };
}

function finish(match, reason) {
  let winner = standings(match).winner;
  if (reason === 'uplink') winner = 0;
  if (reason === 'defused') winner = 1;
  if (reason === 'mission-complete') winner = 0;
  if (reason === 'team-wiped' || (match.mode.cooperative && reason === 'time')) winner = 1;
  match.phase = 'over';
  match.result = { winner, reason, scores: [...match.scores] };
  emit(match.world, 'matchEnd', { winner, reason });
}

function checkEnd(match) {
  if (match.mode.cooperative) {
    if (match.timeLeft <= 0) finish(match, 'time');
    return;
  }
  const { top } = standings(match);
  if (top >= match.mode.targetScore) {
    finish(match, 'score');
  } else if (match.timeLeft <= 0) {
    finish(match, 'time');
  }
}

function stepRelays(match, dt) {
  for (const relay of match.relays) {
    if (relay.cut) continue;
    const users = match.world.players.filter((player) => player.alive && player.team === 0 && player.held.use
      && Math.hypot(player.x - relay.x, player.z - relay.z) <= relay.radius);
    relay.progress = users.length
      ? Math.min(4, relay.progress + dt * (1 + (users.length - 1) * 0.25))
      : Math.max(0, relay.progress - dt * 0.5);
    if (relay.progress >= 4) {
      relay.cut = true;
      emit(match.world, 'relayCut', { id: relay.id, x: relay.x, y: 1.2, z: relay.z });
    }
  }
  if (match.relays.length > 0 && match.relays.every((relay) => relay.cut)) {
    finish(match, 'mission-complete');
  }
}

export function isPlaying(match) {
  return match.phase === 'play';
}

function nearestSite(match, player) {
  const sites = match.map.uplinkSites;
  if (!sites) return null;
  let nearest = null;
  for (const [id, site] of Object.entries(sites)) {
    const distance = Math.hypot(player.x - site.x, player.z - site.z);
    if (distance <= site.radius && (!nearest || distance < nearest.distance)) nearest = { id, ...site, distance };
  }
  return nearest;
}

function stepUplink(match, dt) {
  const uplink = match.uplink;
  if (!uplink) return;
  if (uplink.planted) {
    uplink.remaining -= dt;
    if (uplink.remaining <= 0) {
      finish(match, 'uplink');
      return;
    }
    const site = match.map.uplinkSites[uplink.site];
    let defusing = false;
    for (const player of match.world.players) {
      if (player.alive && player.team === 1 && player.held.use && Math.hypot(player.x - site.x, player.z - site.z) <= site.radius) {
        defusing = true;
        uplink.defuseProgress += dt;
        if (uplink.defuseProgress >= 3) {
          finish(match, 'defused');
          return;
        }
        break;
      }
    }
    if (!defusing) uplink.defuseProgress = Math.max(0, uplink.defuseProgress - dt);
    return;
  }
  for (const player of match.world.players) {
    if (!player.alive || player.team !== 0 || !player.held.use) continue;
    const site = nearestSite(match, player);
    if (!site) continue;
    uplink.site = site.id;
    uplink.plantProgress += dt;
    if (uplink.plantProgress >= 3) {
      uplink.planted = true;
      uplink.remaining = 40;
      emit(match.world, 'plant', { pid: player.id, site: uplink.site, x: site.x, y: 0, z: site.z });
    }
    return;
  }
  uplink.plantProgress = Math.max(0, uplink.plantProgress - dt);
}

export function stepMatch(match, dt) {
  const { world } = match;
  if (match.phase === 'over') {
    return;
  }
  world.time += dt;
  for (const player of world.players) {
    player.px = player.x;
    player.py = player.y;
    player.pz = player.z;
    player.pyaw = player.yaw;
    player.ppitch = player.pitch;
    if (player.alive && match.phase === 'play') {
      if (player.bot) {
        thinkBot(world, match.nav, player, dt);
      }
      movePlayer(world, player, dt);
      stepWeapon(world, player, dt);
    } else if (!player.alive && !player.enemyType && match.phase === 'play' && world.time >= player.respawnAt) {
      spawn(world, player, pickSpawn(match, player));
    }
  }
  stepGrenades(world, dt);
  if (match.phase === 'play') {
    stepUplink(match, dt);
    stepRelays(match, dt);
  }
  if (match.phase === 'intro') {
    match.clock -= dt;
    if (match.clock <= 0) {
      match.phase = 'play';
    }
    return;
  }
  match.timeLeft -= dt;
  checkEnd(match);
}
