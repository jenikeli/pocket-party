// The phone side of Breakwater: a team setup screen and a minimal first-person control surface.

import { MESSAGE_TYPES, INPUT_KINDS, FPS_CHOICES, FPS_BUTTONS } from '/shared/protocol.js';
import { PORTRAIT_QUERY, pointInTurnedBox } from '/controller/kart/turned-layout.js';

let container = null;
let send = null;
let view = null;
let kind = null;
let setup = null;
let play = null;

const SETTINGS_KEY = 'pocket-party-fps-settings';
const DEFAULT_SETTINGS = { sensitivity: 1, invertY: false, leftHanded: false };
const STICK_RADIUS = 62;

function readSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
    if (!stored) return { ...DEFAULT_SETTINGS };
    return {
      sensitivity: Math.max(0.3, Math.min(3, Number(stored.sensitivity) || 1)),
      invertY: Boolean(stored.invertY),
      leftHanded: Boolean(stored.leftHanded),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let settings = readSettings();

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

export function start(gameContainer, sendMessage) {
  container = gameContainer;
  send = sendMessage;
  container.replaceChildren();
}

export function stop() {
  play?.stop();
  setup?.stop();
  container = null;
  send = null;
  view = null;
  kind = null;
}

export function showView(nextView) {
  if (!nextView) {
    container.textContent = 'Joining';
    return;
  }
  view = nextView;
  const nextKind = nextView.phase === 'match' ? 'match' : 'setup';
  if (nextKind !== kind) {
    play?.stop();
    setup?.stop();
    container.replaceChildren();
    kind = nextKind;
    if (kind === 'match') {
      play = createPlay(container);
    } else {
      setup = createSetup(container);
    }
  }
  kind === 'match' ? play.show(view) : setup.show(view);
}

function sendInput(input) {
  send({ type: MESSAGE_TYPES.INPUT, input, sentAt: Date.now() });
}

function sendChoice(choice, value) {
  sendInput({ kind: INPUT_KINDS.CHOICE, choice, value });
}

function createSetup(root) {
  root.innerHTML = `
    <div class="fps-phone fps-phone-setup">
      <h1>Breakwater</h1>
      <p class="fps-setup-intro">Breakwater Port · Ranger AR-9. Choose your team, tune your aim, then get ready.</p>
      <div class="fps-choice-row fps-team-choice"><span>Team</span><button data-team="0">Vanguard</button><button data-team="1">Syndicate</button></div>
      <p class="fps-mission-hint" hidden>Restore all three relays. Stay together and watch for defenders.</p>
      <label class="fps-setting"><span>Aim sensitivity</span><input id="fps-sensitivity" type="range" min="0.3" max="3" step="0.1" value="${settings.sensitivity}"><output id="fps-sensitivity-output">${settings.sensitivity.toFixed(1)}</output></label>
      <div class="fps-setting-buttons"><button id="fps-invert" type="button" aria-pressed="false">Invert Y</button><button id="fps-handed" type="button" aria-pressed="false">Left handed</button></div>
      <div id="fps-look-test" class="fps-look-test"><i></i><span>Live aim test</span></div>
      <button class="fps-ready" type="button" aria-pressed="false">Ready</button>
    </div>`;
  const teamButtons = [...root.querySelectorAll('[data-team]')];
  const phone = root.querySelector('.fps-phone-setup');
  const readyButton = root.querySelector('.fps-ready');
  const sensitivity = root.querySelector('#fps-sensitivity');
  const sensitivityOutput = root.querySelector('#fps-sensitivity-output');
  const invertButton = root.querySelector('#fps-invert');
  const handedButton = root.querySelector('#fps-handed');
  const lookTest = root.querySelector('#fps-look-test');
  teamButtons.forEach((button) => button.addEventListener('click', () => sendChoice(FPS_CHOICES.TEAM, Number(button.dataset.team))));
  readyButton.addEventListener('click', () => sendChoice(FPS_CHOICES.READY, !view.ready));
  sensitivity.addEventListener('input', () => {
    settings.sensitivity = Number(sensitivity.value);
    sensitivityOutput.value = settings.sensitivity.toFixed(1);
    saveSettings();
  });
  invertButton.addEventListener('click', () => {
    settings.invertY = !settings.invertY;
    saveSettings();
  });
  handedButton.addEventListener('click', () => {
    settings.leftHanded = !settings.leftHanded;
    saveSettings();
  });
  let testX = 50;
  let testY = 50;
  lookTest.addEventListener('pointerdown', (event) => {
    lookTest.setPointerCapture(event.pointerId);
    lookTest.lastX = event.clientX;
    lookTest.lastY = event.clientY;
  });
  lookTest.addEventListener('pointermove', (event) => {
    if (!lookTest.hasPointerCapture(event.pointerId)) return;
    testX = Math.max(8, Math.min(92, testX + (event.clientX - lookTest.lastX) * 0.25 * settings.sensitivity));
    testY = Math.max(8, Math.min(92, testY + (event.clientY - lookTest.lastY) * 0.25 * settings.sensitivity * (settings.invertY ? -1 : 1)));
    lookTest.lastX = event.clientX;
    lookTest.lastY = event.clientY;
    lookTest.firstElementChild.style.left = `${testX}%`;
    lookTest.firstElementChild.style.top = `${testY}%`;
  });
  lookTest.addEventListener('pointerup', (event) => {
    if (lookTest.hasPointerCapture(event.pointerId)) lookTest.releasePointerCapture(event.pointerId);
  });
  lookTest.addEventListener('pointercancel', (event) => {
    if (lookTest.hasPointerCapture(event.pointerId)) lookTest.releasePointerCapture(event.pointerId);
  });

  function show(current) {
    const cooperative = current.mode === 'relay';
    root.querySelector('.fps-team-choice').hidden = cooperative;
    root.querySelector('.fps-mission-hint').hidden = !cooperative;
    teamButtons.forEach((button) => {
      const selected = Number(button.dataset.team) === current.team;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    readyButton.textContent = current.ready ? 'Ready: tap to undo' : 'Ready';
    readyButton.classList.toggle('selected', Boolean(current.ready));
    readyButton.setAttribute('aria-pressed', String(Boolean(current.ready)));
    invertButton.classList.toggle('selected', settings.invertY);
    handedButton.classList.toggle('selected', settings.leftHanded);
    invertButton.setAttribute('aria-pressed', String(settings.invertY));
    handedButton.setAttribute('aria-pressed', String(settings.leftHanded));
    phone.classList.toggle('fps-left-handed', settings.leftHanded);
  }

  return { show, stop() {} };
}

function createPlay(root) {
  root.innerHTML = `
    <div class="fps-phone fps-phone-play">
      <header class="fps-hud">
        <div class="fps-vitals"><span class="fps-hud-label">HEALTH</span><strong id="fps-hp">100</strong><span id="fps-armor"></span></div>
        <div class="fps-objective-wrap"><span class="fps-hud-label">MISSION</span><strong id="fps-objective"></strong></div>
        <div class="fps-ammo-wrap"><span class="fps-hud-label" id="fps-weapon">WEAPON</span><strong id="fps-ammo">--</strong></div>
        <button class="fps-hud-button" data-action="scores" type="button">Scores</button>
        <button class="fps-hud-button fps-settings-open" type="button" aria-label="Controller settings" aria-expanded="false">Settings</button>
      </header>
      <div id="fps-move" class="fps-zone fps-move"><i class="fps-stick-ring"></i><b class="fps-stick-knob"></b><span>Move</span></div>
      <div id="fps-look" class="fps-zone fps-look" aria-label="Drag to aim"><span>AIM</span></div>
      <div class="fps-actions">
        <button data-action="ads" class="fps-action fps-ads" type="button" aria-pressed="false">ADS</button>
        <button data-action="reload" class="fps-action fps-reload" type="button">Reload</button>
        <button data-action="grenade" class="fps-action fps-grenade" type="button">Grenade</button>
        <button data-action="jump" class="fps-action fps-jump" type="button">Jump</button>
        <button data-action="crouch" class="fps-action fps-crouch" type="button" aria-pressed="false">Crouch</button>
        <button data-action="use" class="fps-action fps-use" type="button" hidden>Use</button>
        <button data-action="fire" class="fps-action fps-fire" type="button" aria-pressed="false">FIRE</button>
      </div>
      <div class="fps-state-card" hidden role="status" aria-live="polite"></div>
      <div class="fps-settings" role="dialog" aria-modal="true" aria-label="Controller settings" hidden>
        <div class="fps-settings-card">
          <div class="fps-settings-heading"><h2>Controller settings</h2><button class="fps-settings-close" type="button">Done</button></div>
          <label class="fps-setting"><span>Aim sensitivity</span><input class="fps-sensitivity" type="range" min="0.3" max="3" step="0.1" value="${settings.sensitivity}"><output class="fps-sensitivity-output">${settings.sensitivity.toFixed(1)}</output></label>
          <div class="fps-setting-buttons"><button class="fps-invert" type="button" aria-pressed="false">Invert Y</button><button class="fps-handed" type="button" aria-pressed="false">Left handed</button></div>
          <p>Hold Fire and drag to aim while shooting.</p>
        </div>
      </div>
    </div>`;
  const phone = root.querySelector('.fps-phone-play');
  const moveZone = root.querySelector('#fps-move');
  const lookZone = root.querySelector('#fps-look');
  const hp = root.querySelector('#fps-hp');
  const armor = root.querySelector('#fps-armor');
  const objective = root.querySelector('#fps-objective');
  const ammo = root.querySelector('#fps-ammo');
  const weapon = root.querySelector('#fps-weapon');
  const stateCard = root.querySelector('.fps-state-card');
  const settingsPanel = root.querySelector('.fps-settings');
  const settingsOpen = root.querySelector('.fps-settings-open');
  const portrait = window.matchMedia(PORTRAIT_QUERY);
  let movePointer = null;
  let moveOrigin = null;
  let lookPointer = null;
  let lookLast = null;
  let lookX = 0;
  let lookY = 0;
  const heldPointers = new Map();
  const firePointers = new Map();

  function controlDelta(dx, dy) {
    return portrait.matches ? { x: dy, y: -dx } : { x: dx, y: dy };
  }

  function sendMove(event) {
    if (event.pointerId !== movePointer || !moveOrigin) return;
    const raw = controlDelta(event.clientX - moveOrigin.x, event.clientY - moveOrigin.y);
    let x = raw.x / STICK_RADIUS;
    let y = -raw.y / STICK_RADIUS;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    x = Math.round(x * 100) / 100;
    y = Math.round(y * 100) / 100;
    sendInput({ kind: INPUT_KINDS.MOVE, x, y });
    const ring = moveZone.querySelector('.fps-stick-ring');
    const knob = moveZone.querySelector('.fps-stick-knob');
    const point = pointInTurnedBox(moveOrigin.x, moveOrigin.y, moveZone.getBoundingClientRect(), portrait.matches);
    ring.style.left = `${point.x}px`;
    ring.style.top = `${point.y}px`;
    ring.style.opacity = '1';
    knob.style.left = `${point.x + x * STICK_RADIUS}px`;
    knob.style.top = `${point.y - y * STICK_RADIUS}px`;
    const magnitude = Math.hypot(x, y);
    moveZone.dataset.speed = magnitude < 0.45 ? 'walk' : magnitude < 0.9 ? 'run' : 'sprint';
  }
  function moveDown(event) {
    if (movePointer !== null) return;
    event.preventDefault();
    movePointer = event.pointerId;
    moveOrigin = { x: event.clientX, y: event.clientY };
    moveZone.setPointerCapture(event.pointerId);
    sendMove({ pointerId: event.pointerId, clientX: moveOrigin.x, clientY: moveOrigin.y });
  }
  function moveUp(event) {
    if (event.pointerId !== movePointer) return;
    movePointer = null;
    moveOrigin = null;
    sendInput({ kind: INPUT_KINDS.MOVE, x: 0, y: 0 });
    moveZone.dataset.speed = 'stand';
    moveZone.querySelector('.fps-stick-ring').style.opacity = '0';
    moveZone.querySelector('.fps-stick-knob').style.left = '50%';
    moveZone.querySelector('.fps-stick-knob').style.top = '50%';
  }

  function flushLook() {
    if (lookX === 0 && lookY === 0) return;
    sendInput({ kind: INPUT_KINDS.LOOK, dx: lookX, dy: lookY });
    lookX = 0;
    lookY = 0;
  }
  function lookMove(event) {
    if (event.pointerId !== lookPointer || !lookLast) return;
    addLookDelta(event.clientX - lookLast.x, event.clientY - lookLast.y);
    lookLast = { x: event.clientX, y: event.clientY };
  }
  function addLookDelta(dx, dy) {
    const delta = controlDelta(dx, dy);
    lookX += (delta.x / 160) * settings.sensitivity;
    lookY += (delta.y / 160) * settings.sensitivity * (settings.invertY ? -1 : 1);
  }
  function lookDown(event) {
    if (lookPointer !== null) return;
    event.preventDefault();
    lookPointer = event.pointerId;
    lookZone.setPointerCapture(event.pointerId);
    lookLast = { x: event.clientX, y: event.clientY };
  }
  function lookPointerMove(event) {
    lookMove(event);
  }
  function lookUp(event) {
    if (event.pointerId !== lookPointer) return;
    lookPointer = null;
    lookLast = null;
    flushLook();
  }

  moveZone.addEventListener('pointerdown', moveDown);
  moveZone.addEventListener('pointermove', sendMove);
  moveZone.addEventListener('pointerup', moveUp);
  moveZone.addEventListener('pointercancel', moveUp);
  moveZone.addEventListener('lostpointercapture', moveUp);
  lookZone.addEventListener('pointerdown', lookDown);
  lookZone.addEventListener('pointermove', lookPointerMove);
  lookZone.addEventListener('pointerup', lookUp);
  lookZone.addEventListener('pointercancel', lookUp);
  lookZone.addEventListener('lostpointercapture', lookUp);
  const lookTimer = setInterval(flushLook, 16);

  root.querySelectorAll('[data-action]').forEach((button) => {
    const action = button.dataset.action;
    const buttonName = {
      fire: FPS_BUTTONS.FIRE,
      crouch: FPS_BUTTONS.CROUCH,
      ads: FPS_BUTTONS.ADS,
      reload: FPS_BUTTONS.RELOAD,
      jump: FPS_BUTTONS.JUMP,
      grenade: FPS_BUTTONS.GRENADE,
      scores: FPS_BUTTONS.SCORES,
      use: FPS_BUTTONS.USE,
    }[action];
    const held = new Set();
    heldPointers.set(buttonName, held);
    const updateButton = (pressed) => {
      sendInput({ kind: INPUT_KINDS.BUTTON, button: buttonName, pressed });
      button.classList.toggle('held', pressed);
      button.setAttribute('aria-pressed', String(pressed));
    };
    const release = (event) => {
      if (!held.delete(event.pointerId)) return;
      if (action === 'fire') firePointers.delete(event.pointerId);
      if (!held.size) updateButton(false);
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!held.size) updateButton(true);
      held.add(event.pointerId);
      button.setPointerCapture(event.pointerId);
      if (action === 'fire') firePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    });
    if (action === 'fire') {
      button.addEventListener('pointermove', (event) => {
        const last = firePointers.get(event.pointerId);
        if (!last) return;
        addLookDelta(event.clientX - last.x, event.clientY - last.y);
        firePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        flushLook();
      });
    }
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  function show(current) {
    hp.textContent = current.alive ? String(Math.ceil(current.hp)) : 'DOWN';
    armor.textContent = current.armor > 0 ? `ARMOR ${Math.ceil(current.armor)}` : '';
    phone.classList.toggle('fps-low-health', current.alive && current.hp <= 30);
    phone.classList.toggle('fps-not-playing', !current.alive || Boolean(current.result));
    weapon.textContent = (current.weapon?.name ?? 'WEAPON').toUpperCase();
    ammo.textContent = current.weapon ? `${current.mag} / ${current.reserve}` : '--';
    const cut = current.relays?.filter((relay) => relay.cut).length ?? 0;
    objective.textContent = current.mode === 'relay'
      ? `RELAYS ${cut} / ${current.relays.length}`
      : `${current.scores?.[0] ?? 0} — ${current.scores?.[1] ?? 0}  ·  ${current.t ?? 0}s`;
    ammo.classList.toggle('fps-ammo-empty', current.mag === 0);
    root.querySelector('[data-action="reload"]').textContent = current.reloading ? 'Reloading…' : 'Reload';
    const grenadeCount = current.grenades?.[current.grenadeKind] ?? '';
    root.querySelector('[data-action="grenade"]').textContent = grenadeCount === '' ? 'Grenade' : `Grenade · ${grenadeCount}`;
    const adsButton = root.querySelector('[data-action="ads"]');
    adsButton.classList.toggle('held', current.zoom > 0);
    adsButton.setAttribute('aria-pressed', String(current.zoom > 0));
    const crouchButton = root.querySelector('[data-action="crouch"]');
    crouchButton.classList.toggle('held', Boolean(current.crouching));
    crouchButton.setAttribute('aria-pressed', String(Boolean(current.crouching)));
    const useButton = root.querySelector('[data-action="use"]');
    useButton.hidden = !(current.uplink?.canUse || current.relay?.canUse);
    useButton.textContent = current.mode === 'relay' ? 'Cut relay' : current.uplink?.planted ? 'Defuse' : 'Plant';
    if (current.result) {
      stateCard.hidden = false;
      stateCard.textContent = current.result.outcome === 'win' ? 'MISSION COMPLETE' : current.result.outcome === 'draw' ? 'DRAW' : 'MISSION FAILED';
    } else if (!current.alive) {
      stateCard.hidden = false;
      stateCard.innerHTML = `<strong>DOWN</strong><span>${current.killedBy ? `Eliminated by ${current.killedBy}` : 'Waiting to respawn'}${current.respawnIn ? ` · ${current.respawnIn}s` : ''}</span>`;
    } else if (current.relay?.canUse) {
      stateCard.hidden = false;
      stateCard.textContent = `RELAY ${current.relay.id} · HOLD TO CUT · ${Math.round((current.relay.progress ?? 0) * 25)}%`;
    } else if (current.uplink?.canUse) {
      stateCard.hidden = false;
      stateCard.textContent = current.uplink.planted ? 'UPLINK · HOLD TO DEFUSE' : 'UPLINK · HOLD TO PLANT';
    } else {
      stateCard.hidden = true;
    }
    phone.classList.toggle('fps-left-handed', settings.leftHanded);
    syncSettings();
  }

  function syncSettings() {
    const sensitivity = settingsPanel.querySelector('.fps-sensitivity');
    const output = settingsPanel.querySelector('.fps-sensitivity-output');
    sensitivity.value = String(settings.sensitivity);
    output.value = settings.sensitivity.toFixed(1);
    const invert = settingsPanel.querySelector('.fps-invert');
    const handed = settingsPanel.querySelector('.fps-handed');
    invert.classList.toggle('selected', settings.invertY);
    handed.classList.toggle('selected', settings.leftHanded);
    invert.setAttribute('aria-pressed', String(settings.invertY));
    handed.setAttribute('aria-pressed', String(settings.leftHanded));
  }
  const sensitivityInput = settingsPanel.querySelector('.fps-sensitivity');
  sensitivityInput.addEventListener('input', () => {
    settings.sensitivity = Number(sensitivityInput.value);
    settingsPanel.querySelector('.fps-sensitivity-output').value = settings.sensitivity.toFixed(1);
    saveSettings();
  });
  settingsPanel.querySelector('.fps-invert').addEventListener('click', () => {
    settings.invertY = !settings.invertY;
    saveSettings();
    syncSettings();
  });
  settingsPanel.querySelector('.fps-handed').addEventListener('click', () => {
    settings.leftHanded = !settings.leftHanded;
    saveSettings();
    root.classList.toggle('fps-left-handed', settings.leftHanded);
    syncSettings();
  });
  const closeSettings = () => {
    settingsPanel.hidden = true;
    settingsOpen.setAttribute('aria-expanded', 'false');
  };
  settingsOpen.addEventListener('click', () => {
    settingsPanel.hidden = false;
    settingsOpen.setAttribute('aria-expanded', 'true');
  });
  settingsPanel.querySelector('.fps-settings-close').addEventListener('click', closeSettings);
  settingsPanel.addEventListener('pointerdown', (event) => {
    if (event.target === settingsPanel) closeSettings();
  });
  phone.addEventListener('contextmenu', (event) => event.preventDefault());
  syncSettings();

  function stop() {
    clearInterval(lookTimer);
    if (movePointer !== null) {
      sendInput({ kind: INPUT_KINDS.MOVE, x: 0, y: 0 });
    }
    if (lookPointer !== null) flushLook();
    for (const [button, pointers] of heldPointers) {
      if (pointers.size) sendInput({ kind: INPUT_KINDS.BUTTON, button, pressed: false });
    }
  }

  return { show, stop };
}
