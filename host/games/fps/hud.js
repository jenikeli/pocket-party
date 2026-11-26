// One split-screen view's HUD: the crosshair that widens with spread, hit markers, a damage-direction arc, health and
// ammo, the killfeed, team scores and clock, the respawn card, the scope overlay, the flash whiteout and the radar
// (a circular minimap that shows teammates and enemies who just fired). DOM over the canvas; names from players are
// only ever set as text. Used by renderer.js.


const FONT = 'font-family:"Barlow Condensed","Arial Narrow",sans-serif;color:#e8e4da;letter-spacing:.04em;';

function box(parent, css) {
  const element = document.createElement('div');
  element.style.cssText = `position:absolute;${css}`;
  parent.append(element);
  return element;
}

function setText(element, text) {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

const RADAR = 132;
const RADAR_SCALE = 2;

// Adds a HUD to `view` (an element). Returns { update(model), resize(width, height) }.
export function createHud(view) {
  const size = { w: 1, h: 1 };
  const cross = ['left', 'right', 'top', 'bottom'].map(() => box(view, 'background:#fff;box-shadow:0 0 2px #000;'));
  const hitmark = box(view, 'left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;opacity:0;font:700 26px/22px sans-serif;text-align:center;color:#fff;text-shadow:0 0 3px #000;');
  hitmark.textContent = '×';
  const arc = box(view, 'left:50%;top:50%;width:0;height:0;');
  const arcBar = box(arc, 'left:-46px;top:-130px;width:92px;height:10px;border-radius:5px;background:#ff4a3a;opacity:0;');
  const scores = box(view, `left:0;right:0;top:2%;text-align:center;font-weight:800;font-size:1.3em;text-shadow:0 1px 4px #000;${FONT}`);
  const mission = box(view, `left:2%;top:8%;padding:.55em .8em;border-left:2px solid #ffb347;background:rgba(11,13,15,.72);font-size:1.1em;text-shadow:0 1px 4px #000;${FONT}`);
  const missionTitle = box(mission, 'position:static;font-weight:800;text-transform:uppercase;letter-spacing:.15em;');
  const relayTrack = box(mission, 'position:static;margin-top:.35em;color:rgba(232,228,218,.75);font:500 .78em/1.2 ui-monospace,monospace;letter-spacing:.14em;');
  const interaction = box(view, `left:50%;top:62%;transform:translateX(-50%);padding:.45em .7em;border-left:2px solid #ffb347;background:rgba(11,13,15,.78);font-weight:700;text-transform:uppercase;white-space:nowrap;display:none;${FONT}`);
  const feed = box(view, `right:2%;top:7%;text-align:right;font-weight:700;font-size:0.95em;text-shadow:0 1px 3px #000;${FONT}`);
  const vitals = box(view, `left:2%;bottom:3%;font-weight:800;font-size:1.5em;text-shadow:0 1px 4px #000;${FONT}`);
  const ammo = box(view, `right:2%;bottom:3%;text-align:right;font-weight:800;font-size:1.5em;text-shadow:0 1px 4px #000;${FONT}`);
  const respawn = box(view, `left:0;right:0;top:38%;text-align:center;font-weight:800;font-size:2em;text-shadow:0 2px 8px #000;display:none;${FONT}`);
  const board = box(view, `left:15%;right:15%;top:14%;padding:0.6em 1em;background:rgba(8,12,20,0.82);border-radius:0.5em;font-size:0.9em;display:none;${FONT}`);
  const scope = box(view, 'inset:0;display:none;background:radial-gradient(circle at 50% 50%, transparent 0, transparent 30%, #000 31%);');
  box(scope, 'left:0;right:0;top:50%;height:1px;background:#000;');
  box(scope, 'top:0;bottom:0;left:50%;width:1px;background:#000;');
  const whiteout = box(view, 'inset:0;background:#fff;opacity:0;');
  const radar = document.createElement('canvas');
  radar.width = RADAR;
  radar.height = RADAR;
  radar.style.cssText = `position:absolute;left:2%;bottom:14%;width:${RADAR}px;height:${RADAR}px;border-radius:50%;background:rgba(8,12,20,0.55);border:2px solid rgba(255,255,255,0.35);`;
  view.append(radar);
  const context = radar.getContext('2d');
  let lastHit = 0;
  let lastHurt = 0;
  let hitUntil = 0;
  let hurtUntil = 0;

  function drawCross(gap) {
    const length = 9;
    const place = [[`left:calc(50% - ${gap + length}px);top:50%;width:${length}px;height:2px;margin-top:-1px;`], [`left:calc(50% + ${gap}px);top:50%;width:${length}px;height:2px;margin-top:-1px;`], [`left:50%;top:calc(50% - ${gap + length}px);width:2px;height:${length}px;margin-left:-1px;`], [`left:50%;top:calc(50% + ${gap}px);width:2px;height:${length}px;margin-left:-1px;`]];
    cross.forEach((part, index) => {
      part.style.cssText = `position:absolute;background:#fff;box-shadow:0 0 2px #000;${place[index][0]}`;
    });
  }

  function drawRadar(player, match) {
    const { world } = match;
    const teams = match.mode.teams;
    context.clearRect(0, 0, RADAR, RADAR);
    context.save();
    context.beginPath();
    context.arc(RADAR / 2, RADAR / 2, RADAR / 2 - 2, 0, Math.PI * 2);
    context.clip();
    context.translate(RADAR / 2, RADAR / 2);
    context.rotate(player.yaw);
    context.scale(RADAR_SCALE, RADAR_SCALE);
    context.translate(-player.x, -player.z);
    context.fillStyle = 'rgba(150,170,185,0.55)';
    for (const wall of world.boxes) {
      if (wall.y1 > 1.2 && Math.abs((wall.x0 + wall.x1) / 2 - player.x) < 60 && Math.abs((wall.z0 + wall.z1) / 2 - player.z) < 60) {
        context.fillRect(wall.x0, wall.z0, wall.x1 - wall.x0, wall.z1 - wall.z0);
      }
    }
    for (const other of world.players) {
      const friend = teams && other.team === player.team;
      const loud = world.time - other.lastFiredAt < 1.5;
      if (other === player || !other.alive || !(friend || loud)) {
        continue;
      }
      context.fillStyle = friend ? '#4ade80' : '#ff4a3a';
      context.beginPath();
      context.arc(other.x, other.z, 1.6, 0, Math.PI * 2);
      context.fill();
    }
    if (match.mode.cooperative) {
      for (const relay of match.relays) {
        context.fillStyle = relay.cut ? '#ffb347' : '#e8e4da';
        context.fillRect(relay.x - 0.8, relay.z - 0.8, 1.6, 1.6);
      }
    }
    context.restore();
    context.fillStyle = '#fff';
    context.beginPath();
    context.moveTo(RADAR / 2, RADAR / 2 - 7);
    context.lineTo(RADAR / 2 - 5, RADAR / 2 + 5);
    context.lineTo(RADAR / 2 + 5, RADAR / 2 + 5);
    context.fill();
  }

  // model: { player, match, spread (radians), fov, feed: [{ text }], showScores, now (seconds) }
  function update(model) {
    const { player, match, now } = model;
    const { world } = match;
    drawCross(4 + (model.spread * size.h) / (2 * Math.tan((model.fov * Math.PI) / 360)) * 0.5);
    cross.forEach((part) => { part.style.display = player.alive && !(player.zoom > 0 && player.guns[player.slot].id === 'sniper') ? 'block' : 'none'; });
    if (player.hit.n !== lastHit) {
      lastHit = player.hit.n;
      hitUntil = now + 0.25;
      hitmark.style.color = player.hit.head ? '#ff3b30' : '#fff';
    }
    hitmark.style.opacity = now < hitUntil ? '1' : '0';
    if (player.hurt.n !== lastHurt) {
      lastHurt = player.hurt.n;
      hurtUntil = now + 0.7;
      const dir = Math.atan2(Math.sin(player.hurt.yaw - player.yaw), Math.cos(player.hurt.yaw - player.yaw));
      arc.style.transform = `rotate(${(-dir * 180) / Math.PI + 180}deg)`;
    }
    arcBar.style.opacity = now < hurtUntil ? String((hurtUntil - now) / 0.7) : '0';
    const state = player.guns[player.slot];
    setText(vitals, `HP ${Math.ceil(player.hp)}${player.armor > 0 ? `  AR ${Math.ceil(player.armor)}` : ''}`);
    setText(ammo, state.mag > 0 || state.reserve > 0 ? `${state.mag} / ${state.reserve}${player.reloadLeft > 0 ? '  reloading' : ''}` : player.guns[player.slot].id);
    const left = match.phase === 'intro' ? Math.ceil(match.clock) : Math.max(0, Math.ceil(match.timeLeft));
    const clock = match.phase === 'intro' ? `Starts in ${left}` : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    const uplink = match.uplink ? `${match.uplink.planted ? `UPLINK ${match.uplink.site}  ${Math.max(0, Math.ceil(match.uplink.remaining))}s` : 'UPLINK  plant or defuse'}` : '';
    setText(scores, match.mode.cooperative
      ? `BREAKWATER   ${clock}`
      : match.mode.teams
        ? `Vanguard ${match.scores[0]}   ${clock}   ${match.scores[1]} Syndicate${uplink ? `   ${uplink}` : ''}`
        : `${clock}   You ${player.score}   first to ${match.mode.targetScore}`);
    mission.style.display = match.mode.cooperative ? 'block' : 'none';
    if (match.mode.cooperative) {
      const cut = match.relays.filter((relay) => relay.cut).length;
      setText(missionTitle, cut === match.relays.length ? 'Signal restored' : 'Cut the signal relays');
      setText(relayTrack, match.relays.map((relay) => `${relay.cut ? '[X]' : '[ ]'} ${relay.id}`).join('   '));
      const nearby = match.phase === 'play' && match.relays.find((relay) => !relay.cut && Math.hypot(player.x - relay.x, player.z - relay.z) <= relay.radius);
      interaction.style.display = nearby ? 'block' : 'none';
      setText(interaction, nearby
        ? `${nearby.progress > 0 ? `Cutting ${nearby.id}  ${Math.floor((nearby.progress / 4) * 100)}%` : `Hold USE to cut relay ${nearby.id}`}`
        : '');
    } else {
      interaction.style.display = 'none';
    }
    setText(feed, model.feed.map((item) => item.text).join('\n'));
    feed.style.whiteSpace = 'pre';
    respawn.style.display = player.alive ? 'none' : 'block';
    if (!player.alive) {
      const by = player.killedBy ? world.players.find((other) => other.id === player.killedBy)?.name : null;
      setText(respawn, `${by ? `Killed by ${by}. ` : ''}Respawn in ${Math.max(0, Math.ceil(player.respawnAt - world.time))}`);
    }
    scope.style.display = player.alive && player.zoom > 0 && state.id === 'sniper' ? 'block' : 'none';
    whiteout.style.opacity = String(player.flashLeft > 0 ? Math.min(1, (player.flashLeft / Math.max(1, player.flashPeak)) * 1.4) : 0);
    board.style.display = model.showScores ? 'block' : 'none';
    if (model.showScores) {
      const rows = [...world.players].sort((a, b) => b.kills - a.kills).map((other) => `${other.name.padEnd(10)} ${String(other.kills).padStart(3)} K ${String(other.deaths).padStart(3)} D`);
      board.style.whiteSpace = 'pre';
      board.style.fontFamily = 'monospace';
      setText(board, rows.join('\n'));
    }
    drawRadar(player, match);
  }

  function resize(width, height) {
    size.w = width;
    size.h = height;
  }

  return { update, resize };
}
