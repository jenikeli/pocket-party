// The phone during a Spirefall match: the clock and crowns, the tower strip, the elixir bar, the deploy pad, the
// hand, a line for notices, emotes and Forfeit (two taps). Pressing a card and dragging it over the pad aims; the
// host draws a ghost on the big screen where it would land, and letting go plays it. A quick tap on a card selects it
// and the next tap on the pad plays it there. Used by index.js.

import { MESSAGE_TYPES, INPUT_KINDS, ARENA_CHOICES, ARENA_EMOTES } from '/shared/protocol.js';
import { confirmOnSecondClick } from '/shared/confirm-click.js';
import { createThrottle } from '/controller/inputs/throttle.js';
import { createPad } from './pad.js';
import { createHand } from './hand.js';

const AIM_INTERVAL_MS = 33;
const NOTICE_TEXT = { 'no-elixir': 'Not enough elixir', 'bad-spot': 'Cannot play there', 'not-playing': 'The match is not running', 'bad-slot': 'Pick a card' };
const RESULT_TEXT = { win: 'You win', lose: 'You lose', draw: 'Draw' };

const MARKUP = `
  <div id="ar-match">
    <div id="ar-top"><span id="ar-clock"></span><span id="ar-mult"></span><span id="ar-crowns"></span></div>
    <div id="ar-towers"><span class="ar-hp" data-side="own"></span><span class="ar-hp" data-side="foe"></span></div>
    <div id="ar-elixir"><div id="ar-pips"></div><span id="ar-elixir-number"></span></div>
    <div id="ar-pad-box"><canvas id="ar-pad"></canvas><div id="ar-banner" hidden></div></div>
    <p id="ar-notice"></p>
    <div id="ar-hand"></div>
    <div id="ar-tools"><div id="ar-emotes"></div><button type="button" id="ar-forfeit" class="pp-button">Forfeit</button></div>
  </div>`;

// Builds the screen in `container`. `send(message)` sends to the server. Returns { show(view), unmount() }.
export function mountMatchScreen(container, send) {
  container.innerHTML = MARKUP;
  const byId = (id) => container.querySelector(`#${id}`);
  const pad = createPad(byId('ar-pad'), 0);
  let padTeam = 0;
  const hand = createHand(byId('ar-hand'), { onPick, onMove, onRelease });
  const pips = byId('ar-pips');
  pips.innerHTML = '<i></i>'.repeat(10);
  byId('ar-emotes').innerHTML = ARENA_EMOTES.map((label, index) => `<button type="button" class="pp-button ar-emote" data-emote="${index}">${label}</button>`).join('');
  confirmOnSecondClick(byId('ar-forfeit'), () => sendChoice(ARENA_CHOICES.FORFEIT, true));
  byId('ar-emotes').addEventListener('click', (event) => {
    const button = event.target.closest('[data-emote]');
    if (button) {
      sendChoice(ARENA_CHOICES.EMOTE, Number(button.dataset.emote));
    }
  });

  let view = null;
  let receivedAt = 0;
  let selected = null;
  let noticeCount = 0;
  let frame = 0;
  const aim = createThrottle(AIM_INTERVAL_MS, (value) => sendPlace(value));

  function sendPlace(fields) {
    send({ type: MESSAGE_TYPES.INPUT, input: { kind: INPUT_KINDS.PLACE, ...fields }, sentAt: Date.now() });
  }

  function sendChoice(choice, value) {
    send({ type: MESSAGE_TYPES.INPUT, input: { kind: INPUT_KINDS.CHOICE, choice, value }, sentAt: Date.now() });
  }

  function onPick(slot) {
    selected = slot;
    sendPlace({ phase: 'pick', slot });
  }

  function aimAt(clientX, clientY) {
    const spot = pad.fractionAt(clientX, clientY);
    aim.queue(spot ? { phase: 'aim', slot: selected, ...spot } : { phase: 'cancel', slot: selected });
  }

  function onMove(clientX, clientY) {
    aimAt(clientX, clientY);
  }

  // A drag ends in a play (over the pad) or a cancel. A tap keeps the card selected for the next tap on the pad.
  function onRelease(clientX, clientY, wasTap) {
    aim.cancel();
    if (wasTap) {
      return;
    }
    const spot = pad.fractionAt(clientX, clientY);
    sendPlace(spot ? { phase: 'drop', slot: selected, ...spot } : { phase: 'cancel', slot: selected });
    selected = null;
  }

  const padCanvas = byId('ar-pad');
  padCanvas.addEventListener('pointerdown', (event) => {
    if (selected !== null) {
      padCanvas.setPointerCapture(event.pointerId);
      aimAt(event.clientX, event.clientY);
    }
  });
  padCanvas.addEventListener('pointermove', (event) => {
    if (selected !== null && event.buttons > 0) {
      aimAt(event.clientX, event.clientY);
    }
  });
  padCanvas.addEventListener('pointerup', (event) => {
    if (selected !== null) {
      aim.cancel();
      const spot = pad.fractionAt(event.clientX, event.clientY);
      sendPlace(spot ? { phase: 'drop', slot: selected, ...spot } : { phase: 'cancel', slot: selected });
      selected = null;
    }
  });

  // The elixir fills smoothly between views using the host's rate.
  function elixirNow() {
    return Math.min(10, view.elixir + (view.rate * (performance.now() - receivedAt)) / 1000);
  }

  function paint() {
    if (!view) {
      return;
    }
    const elixir = elixirNow();
    [...pips.children].forEach((pip, index) => pip.style.setProperty('--fill', String(Math.min(Math.max(elixir - index, 0), 1))));
    byId('ar-elixir-number').textContent = String(Math.floor(elixir));
    hand.show({ ...view, selected }, elixir);
    pad.draw(selected !== null);
    frame = requestAnimationFrame(paint);
  }

  function show(newView) {
    view = newView;
    receivedAt = performance.now();
    if (padTeam !== view.team) {
      padTeam = view.team;
      Object.assign(pad, createPad(padCanvas, padTeam));
    }
    container.querySelector('#ar-match').dataset.team = String(view.team);
    byId('ar-clock').textContent = view.stage === 'intro' ? `Starts in ${view.t}` : `${Math.floor(view.t / 60)}:${String(view.t % 60).padStart(2, '0')}`;
    byId('ar-mult').textContent = view.mult > 1 ? `x${view.mult}` : '';
    byId('ar-crowns').textContent = `${view.crowns[0]} : ${view.crowns[1]}`;
    byId('ar-towers').querySelectorAll('.ar-hp').forEach((strip) => {
      strip.innerHTML = view.towers[strip.dataset.side].map((percent) => `<b style="--hp:${percent}%"></b>`).join('');
    });
    if (view.notice.n !== noticeCount) {
      noticeCount = view.notice.n;
      byId('ar-notice').textContent = NOTICE_TEXT[view.notice.code] ?? '';
      setTimeout(() => { byId('ar-notice').textContent = ''; }, 1500);
    }
    const banner = byId('ar-banner');
    banner.hidden = !view.result && !view.paused;
    banner.textContent = view.result ? `${RESULT_TEXT[view.result.outcome]}. ${view.result.crowns[0]} to ${view.result.crowns[1]}` : 'Paused: a player is away';
    if (!frame) {
      frame = requestAnimationFrame(paint);
    }
  }

  function unmount() {
    cancelAnimationFrame(frame);
    aim.cancel();
  }

  return { show, unmount };
}
