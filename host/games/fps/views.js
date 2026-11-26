// What each phone is told in Saltline (the `view` of CONTROLLER_STATE): the setup screen, and during a match the
// player's own health, ammo, grenades, scores, clock and the feedback counters (hit confirm, damage direction,
// flash) the phone turns into vibration. No DOM, unit tested. Used by session.js and index.js.

import { WEAPONS } from './tuning.js';
import { MAX_VIEWS } from '../temple-run/layout.js';

// The setup screen of a seated person.
export function setupView({ mode, botLevel, team, ready, peopleCount, readyCount }) {
  return { phase: 'setup', mode, botLevel, team, ready, peopleCount, readyCount };
}

export function fullView() {
  return { phase: 'full' };
}

// People get their own screens; a bot-only match uses one CPU viewpoint to avoid duplicate full-scene renders.
export function viewersFor(match) {
  const humans = match.world.players.filter((player) => player.human);
  const viewers = humans.length > 0 ? humans : match.world.players.slice(0, 1);
  return viewers.slice(0, MAX_VIEWS).map((player) => player.id);
}

export function canUseUplink(match, player) {
  if (!match.uplink || !player.alive) return false;
  const sites = match.map.uplinkSites;
  if (!sites) return false;
  if (match.uplink.planted) {
    if (player.team !== 1) return false;
    const site = sites[match.uplink.site];
    return site ? Math.hypot(player.x - site.x, player.z - site.z) <= site.radius : false;
  }
  if (player.team !== 0) return false;
  return Object.values(sites).some((site) => Math.hypot(player.x - site.x, player.z - site.z) <= site.radius);
}

function relayFor(match, player) {
  const relay = match.relays.find((item) => !item.cut
    && Math.hypot(player.x - item.x, player.z - item.z) <= item.radius);
  return relay ? {
    id: relay.id,
    progress: Math.round(relay.progress * 10) / 10,
    canUse: Boolean(player.alive && match.phase === 'play'),
  } : null;
}

function outcomeOf(match, player) {
  if (!match.result) {
    return null;
  }
  const { winner } = match.result;
  const mine = match.mode.teams ? player.team : player.id;
  return { outcome: winner === null ? 'draw' : winner === mine ? 'win' : 'lose', reason: match.result.reason, scores: match.result.scores };
}

// One player's view during a match. Numbers are rounded so the view only changes when something worth sending did.
export function matchView(match, player) {
  const gun = WEAPONS[player.guns[player.slot].id];
  const state = player.guns[player.slot];
  const { world } = match;
  const attacker = Math.atan2(Math.sin(player.hurt.yaw - player.yaw), Math.cos(player.hurt.yaw - player.yaw));
  return {
    phase: 'match',
    stage: match.phase,
    mode: match.mode.id,
    team: player.team,
    hp: Math.ceil(player.hp),
    armor: Math.ceil(player.armor),
    crouching: player.wantCrouch,
    alive: player.alive,
    weapon: { id: gun.id, name: gun.name, auto: gun.auto },
    mag: state.mag,
    reserve: state.reserve,
    reloading: player.reloadLeft > 0,
    zoom: player.zoom,
    grenades: { ...player.grenades },
    grenadeKind: player.grenadeKind,
    respawnIn: player.alive ? 0 : Math.max(0, Math.ceil(player.respawnAt - world.time)),
    killedBy: player.killedBy ? (world.players.find((other) => other.id === player.killedBy)?.name ?? null) : null,
    kills: player.kills,
    deaths: player.deaths,
    scores: match.mode.teams ? match.scores : [player.score, Math.max(...world.players.map((other) => other.score))],
    target: match.mode.targetScore,
    t: match.phase === 'intro' ? Math.ceil(match.clock) : Math.max(0, Math.ceil(match.timeLeft)),
    hit: player.hit,
    hurt: { n: player.hurt.n, dir: Math.round(attacker * 10) / 10 },
    flash: Math.round((player.flashLeft > 0 ? Math.min(1, player.flashLeft / Math.max(1, player.flashPeak)) : 0) * 10) / 10,
    result: outcomeOf(match, player),
    uplink: match.uplink ? { ...match.uplink, canUse: canUseUplink(match, player) } : null,
    relays: match.relays.map(({ id, cut, progress }) => ({ id, cut, progress: Math.round(progress * 10) / 10 })),
    relay: match.mode.cooperative ? relayFor(match, player) : null,
  };
}
