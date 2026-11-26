// The standalone Saltline page owns the map, first-person weapon, materials and HUD. Each split-screen
// viewport embeds that page and receives only the multiplayer player's camera and match state.

import { layoutViews, MAX_VIEWS } from '/host/games/temple-run/layout.js';
import { TUNING, WEAPONS } from './tuning.js';
import { eyeOf } from './world.js';

const ORIGINAL_GAME = '/saltline-fable-5.2/index.html?autostart=1&noaudio=1&q=low';
const READY_TIMEOUT_MS = 45000;

function setText(element, text) {
  if (element && element.textContent !== text) {
    element.textContent = text;
  }
}

function updateHud(game, player, match, feed, showScores) {
  const hud = game.hud.root;
  const gun = player.guns[player.slot];
  const weapon = WEAPONS[gun.id];
  const hp = Math.ceil(player.hp);
  const health = hud.querySelector('.h-health');
  health.classList.toggle('on', hp < TUNING.maxHp);
  health.classList.toggle('crit', hp <= 25);
  setText(hud.querySelector('.h-hp-n'), String(hp));
  hud.querySelectorAll('.h-hp-bar i').forEach((segment, index) => {
    segment.classList.toggle('off', index >= Math.ceil(hp / 10));
  });

  const ammo = hud.querySelector('.h-ammo');
  const remaining = gun.reserve;
  ammo.classList.toggle('low', gun.mag <= Math.max(3, Math.ceil(weapon.mag * 0.2)));
  setText(hud.querySelector('.h-ammo-n'), String(gun.mag));
  setText(hud.querySelector('.h-ammo-r'), String(remaining));
  setText(hud.querySelector('.h-wname'), game.weapon.name || weapon.name);
  const cue = hud.querySelector('.h-cue');
  cue.classList.toggle('on', player.reloadLeft > 0);
  setText(cue, player.reloadLeft > 0 ? 'RELOADING' : '');

  const objective = hud.querySelector('.h-obj');
  const relays = match.mode.cooperative ? match.relays : [];
  objective.classList.toggle('has', relays.length > 0);
  setText(hud.querySelector('.h-obj-t'), relays.length ? 'Cut the signal relays' : '');
  const relayTrack = hud.querySelector('.h-relays');
  const relaySegments = [...relayTrack.querySelectorAll('i')];
  const cut = relays.filter((relay) => relay.cut).length;
  relaySegments.forEach((segment, index) => {
    segment.classList.toggle('cut', Boolean(relays[index]?.cut));
    segment.hidden = index >= relays.length;
  });
  setText(relayTrack.querySelector('b'), `${cut}/${relays.length}`);

  const clockSeconds = match.phase === 'intro' ? Math.ceil(match.clock) : Math.max(0, Math.ceil(match.timeLeft));
  const clock = match.phase === 'intro'
    ? `STARTS IN ${clockSeconds}`
    : `${Math.floor(clockSeconds / 60)}:${String(clockSeconds % 60).padStart(2, '0')}`;
  const score = match.mode.cooperative
    ? `SALTLINE  ${clock}`
    : match.mode.teams
      ? `VANGUARD ${match.scores[0]}  ${clock}  ${match.scores[1]} SYNDICATE`
      : `${clock}  ${player.name} ${player.score}  FIRST TO ${match.mode.targetScore}`;
  const lines = [...(showScores ? [score] : []), ...feed.map((item) => item.text)];
  setText(hud.querySelector('.h-feed'), lines.join('\n'));
  hud.querySelector('.h-feed').style.whiteSpace = 'pre-line';

  const message = hud.querySelector('.h-msg');
  message.classList.toggle('on', !player.alive || match.phase === 'intro');
  setText(message, !player.alive
    ? `${player.killedBy ? `KILLED BY ${player.killedBy}  ·  ` : ''}RESPAWN IN ${Math.max(0, Math.ceil(player.respawnAt - match.world.time))}`
    : match.phase === 'intro' ? `MATCH STARTS IN ${clockSeconds}` : '');
  hud.querySelector('.h-cross').classList.toggle('off', !player.alive || (player.zoom > 0 && gun.id === 'sniper'));
}

function syncFrame(frame, payload, fraction, index, width, height, dt) {
  const { match, alpha } = payload;
  const game = frame.game;
  const player = match.world.players.find((candidate) => candidate.id === payload.viewers[index]);
  frame.iframe.style.display = fraction ? 'block' : 'none';
  if (!fraction || !player || !game) {
    return;
  }

  const rect = {
    x: fraction.x * width,
    y: fraction.y * height,
    w: fraction.w * width,
    h: fraction.h * height,
  };
  Object.assign(frame.iframe.style, {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.w}px`,
    height: `${rect.h}px`,
  });

  const eye = eyeOf(player, TUNING);
  const lerp = (a, b) => a + (b - a) * alpha;
  const camera = {
    x: lerp(player.px, player.x),
    y: eye.y + (player.py - player.y) * (1 - alpha),
    z: lerp(player.pz, player.z),
    pitch: player.alive ? lerp(player.ppitch, player.pitch) : -0.5,
    yaw: lerp(player.pyaw, player.yaw),
    roll: player.alive ? 0 : 0.4,
    fov: WEAPONS[player.guns[player.slot].id].zoom[player.zoom] ?? 74,
    aspect: rect.w / Math.max(1, rect.h),
  };
  if (!player.alive) {
    camera.y = player.y + 0.5;
  }
  const actors = match.world.players.map((other) => ({
    id: other.id,
    type: other.enemyType ?? (other.team === 1 ? 'hound' : 'gull'),
    team: other.team,
    x: other.px + (other.x - other.px) * alpha,
    y: other.py + (other.y - other.py) * alpha,
    z: other.pz + (other.z - other.pz) * alpha,
    yaw: other.pyaw + (other.yaw - other.pyaw) * alpha,
    alive: other.alive,
  }));
  const rendered = frame.bridge.renderFrame({
    camera,
    player: {
      y: player.y,
      vx: player.vx,
      vy: player.vy,
      vz: player.vz,
      hp: player.hp,
      alive: player.alive,
      sprinting: player.speedClass === 'sprint',
      crouching: player.crouch > 0.5,
      ads: player.zoom > 0 ? 1 : 0,
      ammo: player.guns[player.slot].mag,
      reserve: player.guns[player.slot].reserve,
    },
    actors,
    dt,
  });
  if (!rendered) {
    throw new Error('The original Saltline multiplayer renderer is not ready.');
  }
  updateHud(game, player, match, payload.feed, payload.scoresFor.has(player.id));
}

function createView(container, index, onError) {
  const iframe = document.createElement('iframe');
  iframe.title = `Saltline multiplayer view ${index + 1}`;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.style.cssText = 'position:absolute;display:none;border:0;pointer-events:none;overflow:hidden;background:#0b0d0f;';
  container.append(iframe);

  const frame = { iframe, game: null, bridge: null, error: null, timer: null, startedAt: performance.now() };
  function initialize() {
    let win;
    try {
      win = iframe.contentWindow;
      if (!win) {
        return false;
      }
      const game = win.__G;
      const hasCharacterModel = game?.enemies?.list?.some((enemy) => enemy.rig?.group?.clone);
      const bridge = win.__POCKET_PARTY__;
      if (!game?.render || !game?.hud || !game?.weapon || !hasCharacterModel || !game?.level
        || !bridge?.startHostView?.()) {
        if (performance.now() - frame.startedAt > READY_TIMEOUT_MS) {
          const details = win.__errors?.length ? `\n${win.__errors.join('\n')}` : '';
          throw new Error(`The original Saltline page did not finish loading.${details}`);
        }
        return false;
      }
      frame.game = game;
      frame.bridge = bridge;
      return true;
    } catch (error) {
      frame.error = error instanceof Error ? error : new Error(String(error));
      onError(frame.error);
      return true;
    }
  }

  iframe.addEventListener('load', () => {
    const poll = () => {
      if (initialize()) {
        return;
      }
      frame.timer = window.setTimeout(poll, 50);
    };
    poll();
  }, { once: true });
  iframe.addEventListener('error', () => {
    frame.error = new Error('Could not load the original Saltline game page.');
    onError(frame.error);
  }, { once: true });
  iframe.src = ORIGINAL_GAME;
  return frame;
}

export function createRenderer(container) {
  container.style.position = 'relative';
  const frames = [];
  let width = 0;
  let height = 0;
  let previous = performance.now();
  const error = document.createElement('div');
  error.style.cssText = 'position:absolute;inset:auto 12px 12px;padding:8px 10px;background:rgba(40,8,4,.9);color:#ffb4a8;font:12px/1.4 ui-monospace,monospace;white-space:pre-wrap;z-index:20;display:none;';
  container.append(error);

  function reportError(problem) {
    error.style.display = 'block';
    error.textContent = `Saltline renderer failed to load:\n${problem.message}`;
    console.error(error.textContent);
  }

  function ensureView(index) {
    while (frames.length <= index) {
      frames.push(createView(container, frames.length, reportError));
    }
    return frames[index];
  }

  function draw(payload) {
    const currentWidth = container.clientWidth;
    const currentHeight = container.clientHeight;
    if (!currentWidth || !currentHeight) {
      return;
    }
    width = currentWidth;
    height = currentHeight;
    const now = performance.now();
    const dt = Math.min(0.1, (now - previous) / 1000);
    previous = now;
    const viewers = payload.match ? payload.viewers : [];
    const count = payload.match ? Math.min(MAX_VIEWS, viewers.length) : 1;
    const fractions = layoutViews(count);

    for (let index = 0; index < count; index += 1) {
      const frame = ensureView(index);
      const fraction = fractions[index];
      if (!frame.game || frame.error) {
        frame.iframe.style.display = 'block';
        Object.assign(frame.iframe.style, {
          left: `${(fraction?.x ?? 0) * width}px`,
          top: `${(fraction?.y ?? 0) * height}px`,
          width: `${(fraction?.w ?? 1) * width}px`,
          height: `${(fraction?.h ?? 1) * height}px`,
          pointerEvents: 'auto',
        });
        frame.iframe.setAttribute('aria-hidden', 'false');
        frame.iframe.tabIndex = 0;
        continue;
      }
      if (payload.match) {
        syncFrame(frame, payload, fraction, index, width, height, dt);
      } else {
        frame.iframe.style.display = 'block';
        Object.assign(frame.iframe.style, {
          left: '0px',
          top: '0px',
          width: `${width}px`,
          height: `${height}px`,
          pointerEvents: 'auto',
        });
        frame.iframe.setAttribute('aria-hidden', 'false');
        frame.iframe.tabIndex = 0;
      }
    }
    for (let index = count; index < frames.length; index += 1) {
      frames[index].iframe.style.display = 'none';
    }
  }

  function destroy() {
    for (const frame of frames) {
      if (frame.timer !== null) {
        window.clearTimeout(frame.timer);
      }
      frame.iframe.remove();
    }
    error.remove();
  }

  return { draw, destroy };
}
