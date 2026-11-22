// Draws the temple run on the host with Three.js, in split screen: one view for each person (up to four), each
// with its own camera behind its own runner or the monkey, over one shared causeway (world3d.js) with the
// explorers and the demon monkey (people3d.js). The views, their HUDs and name labels are split-views.js; the
// settings page in the lobby is lobby-panel.js. It only reads the round; rules live in rules.js. Used by index.js.

import * as THREE from 'three';
import { PLAYER_COLORS, colorText } from '/host/roster.js';
import { chaserOf, livingRunners, turnPrompt, JUMP_SECONDS } from './rules.js';
import { pathPoint, LANE_WIDTH } from './path.js';
import { createWorld } from './world3d.js';
import { buildFigure, poseFigure, disposeFigure, disposePeople } from './people3d.js';
import { createSplitViews } from './split-views.js';
import { createLobbyPanel } from './lobby-panel.js';
import { templeIcon } from '/shared/temple-icons.js';

const IDLE_SEED = 4242;
const IDLE_STATE = { collected: new Set(), fallen: new Map(), hazards: true };
// How far behind and above the followed player each camera sits: close behind a runner, further back for the monkey.
const CAMERAS = { runner: { back: 7, up: 4.4 }, monkey: { back: 11, up: 5.8 } };
const OVERLAY_STYLE = 'position:absolute;inset:0;pointer-events:none;font-family:sans-serif;color:#fff;';
const POWER_ICONS = [['boostT', 'bolt'], ['shieldT', 'shield'], ['magnetT', 'magnet']];

// `handlers` is { onSet(settingKey, value), onStart() }, called from the settings page.
export function createRenderer(container, handlers) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
  container.style.position = 'relative';
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x4a5a3a, 1.5));
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.2);
  sun.position.set(40, 80, 30);
  scene.add(sun);
  const world = createWorld(scene);
  const overlay = document.createElement('div');
  overlay.style.cssText = OVERLAY_STYLE;
  container.append(overlay);
  const screens = createSplitViews(overlay, renderer);
  const lobby = createLobbyPanel(overlay, handlers);

  // playerId -> { figure, kind, colorIndex, lane (eased) }
  const actors = new Map();
  let lastRound = null;
  let lastFrame = performance.now();
  let width = 0;
  let height = 0;

  function resize() {
    if (container.clientWidth !== width || container.clientHeight !== height) {
      width = container.clientWidth;
      height = container.clientHeight;
      renderer.setSize(width, height, false);
    }
  }

  // The player a person's camera follows: themselves while they run, otherwise the monkey (a downed or finished
  // runner watches the chase).
  function followedBy(round, viewerId) {
    const own = round.players.get(viewerId);
    return own && own.status === 'alive' ? own : chaserOf(round);
  }

  // model: { round, result, settings, players: [{ id, name, colorIndex, ready }], viewers: [playerId] }.
  function draw(model) {
    const now = performance.now();
    const dt = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    resize();
    const { round } = model;
    const time = round ? round.time : now / 1000;
    const seed = round ? round.seed : IDLE_SEED;
    const viewerIds = round ? model.viewers.slice(0, 4) : [];
    const count = Math.max(1, viewerIds.length);
    const targets = round ? viewerIds.map((id) => followedBy(round, id)) : [];
    const idleAnchor = (now / 1000) * 8;
    const anchors = round ? targets.map((target) => target.z - CAMERAS[target.role === 'chaser' ? 'monkey' : 'runner'].back) : [idleAnchor];
    world.update(seed, Math.min(...anchors), Math.max(...anchors), round ? { collected: round.collected, fallen: round.fallen, hazards: round.settings.hazards } : IDLE_STATE, time);
    const labels = round ? drawActors(model, time) : hideActors();
    screens.layout(count, width, height);
    for (let index = 0; index < count; index += 1) {
      const view = screens.views[index];
      const target = targets[index];
      const camera = CAMERAS[target?.role === 'chaser' ? 'monkey' : 'runner'];
      screens.follow(view, {
        seed, anchor: anchors[index], lane: target ? (actors.get(target.id)?.lane ?? target.lane) : 1, up: camera.up,
        key: target?.id ?? 'idle', snap: round !== lastRound, dt,
      });
      screens.placeLabels(view, labels);
      screens.setHud(view, round ? hudFor(round, round.players.get(viewerIds[index])) : { left: '', right: '', big: '', turn: '' });
    }
    lastRound = round;
    if (round) {
      lobby.hide();
    } else {
      lobby.update({ settings: model.settings, players: model.players, result: model.result });
    }
    screens.render(scene, count, height);
  }

  // Poses every figure and returns the name labels each view should show.
  function drawActors(model, time) {
    const { round } = model;
    const infoById = new Map(model.players.map((player) => [player.id, player]));
    const labels = [];
    for (const [id, actor] of actors) {
      const player = round.players.get(id);
      if (!player || player.status === 'out') {
        actor.figure.root.visible = false;
      }
    }
    for (const player of round.players.values()) {
      if (player.status !== 'out') {
        labels.push(drawActor(player, infoById.get(player.id), round, time));
      }
    }
    return labels;
  }

  function actorFor(player, colorIndex) {
    const kind = player.role === 'chaser' ? 'monkey' : 'explorer';
    let actor = actors.get(player.id);
    if (actor && (actor.kind !== kind || actor.colorIndex !== colorIndex)) {
      scene.remove(actor.figure.root);
      disposeFigure(actor.figure);
      actor = null;
    }
    if (!actor) {
      const figure = buildFigure(kind, PLAYER_COLORS[colorIndex] ?? 0xffffff);
      scene.add(figure.root);
      actor = { figure, kind, colorIndex, lane: player.lane };
      actors.set(player.id, actor);
    }
    return actor;
  }

  function drawActor(player, info, round, time) {
    const actor = actorFor(player, info?.colorIndex ?? 0);
    const { figure } = actor;
    actor.lane += (player.lane - actor.lane) * 0.35;
    const point = pathPoint(round.seed, player.z, (actor.lane - 1) * LANE_WIDTH);
    const down = player.status === 'down';
    const lift = player.jumpT > 0 ? 1.5 * Math.sin(Math.PI * (1 - player.jumpT / JUMP_SECONDS)) : 0;
    figure.root.position.set(point.x, lift, point.z);
    figure.root.rotation.y = -point.heading;
    figure.root.visible = down || !(player.stumbleT > 0 && Math.floor(time * 10) % 2 === 0);
    poseFigure(figure, {
      phase: player.z * (actor.kind === 'monkey' ? 0.6 : 0.9),
      lift, down, time,
      crouch: player.slideT > 0,
      eating: player.pauseT > 0,
    });
    figure.bubble.visible = player.shieldT > 0 || player.boostT > 0;
    figure.bubble.material.color.set(player.boostT > 0 ? 0xff8a1f : 0x5ac8fa);
    const hearts = player.role === 'runner' ? ` ${'♥'.repeat(Math.max(0, player.lives))}` : '';
    return {
      id: player.id,
      text: `${info?.name ?? ''}${down ? ' (down)' : ''}${hearts}`,
      color: info ? colorText(info) : '#ffffff',
      position: figure.root.position,
      above: actor.kind === 'monkey' ? 3.6 : 2.3,
    };
  }

  function hideActors() {
    for (const actor of actors.values()) {
      actor.figure.root.visible = false;
    }
    return [];
  }

  // One person's HUD, as icons and numbers: lives, team coins, distance, the powerup running, who is left, the
  // countdown or their own state, and the arrow when a corner needs a turn.
  function hudFor(round, player) {
    if (!player) {
      return { left: '', right: '', big: '', turn: '' };
    }
    const monkey = player.role === 'chaser';
    const hearts = monkey ? '' : Array.from({ length: round.settings.lives }, (unused, index) =>
      `<span style="color:${index < player.lives ? '#ff4d5e' : '#6b7280'}">${templeIcon(index < player.lives ? 'heart' : 'heart-empty')}</span>`).join('');
    const power = POWER_ICONS.find(([timer]) => !monkey && player[timer] > 0);
    const powerChip = power ? `<span style="color:#5ac8fa">${templeIcon(power[1])} ${Math.ceil(player[power[0]])}</span>` : '';
    const coins = `<span style="color:#ffc933">${templeIcon('coin')} ${round.coins}</span>`;
    const left = `${hearts}${coins}<span>${Math.floor(round.bestZ)} m</span>${powerChip}`;
    const right = monkey
      ? `<span style="color:#ff8a5b">${templeIcon('monkey')} Monkey</span>`
      : `${templeIcon('runner')} ${livingRunners(round).length} left`;
    let big = '';
    if (round.phase === 'countdown') {
      big = String(Math.max(1, Math.ceil(round.countdown)));
    } else if (player.status === 'down') {
      big = `DOWN ${Math.ceil(player.downT)}`;
    } else if (player.status === 'out') {
      big = player.lives <= 0 && !monkey ? 'GAME OVER' : 'OUT';
    }
    const dir = turnPrompt(round, player);
    const turn = dir ? `${templeIcon(`turn-${dir}`)} TURN ${dir.toUpperCase()}` : '';
    return { left, right, big, turn };
  }

  function destroy() {
    for (const actor of actors.values()) {
      scene.remove(actor.figure.root);
      disposeFigure(actor.figure);
    }
    actors.clear();
    world.dispose();
    disposePeople();
    // forceContextLoss frees the WebGL context now: iOS allows few at once.
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    overlay.remove();
  }

  return { draw, destroy };
}
