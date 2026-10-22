// One player's card in the host's input lab: who it is, which phone and input, a live picture of the input,
// and the numbers (rate, round trip, jitter, raw value). Used by host/scenes/input-lab-scene.js.

import { INPUT_KINDS } from '/shared/protocol.js';

// Cards sit in a 3x3 grid (MAX_PLAYERS is 9) in the 1380 px left of the join panel.
export const CARD_WIDTH = 440;
export const CARD_HEIGHT = 340;
export const CARD_GAP = 15;
const CARDS_PER_ROW = 3;
// The stick picture, relative to the card's top-left corner.
export const RING_CENTER = { x: 105, y: 195 };
export const RING_RADIUS = 75;
const DOT_RADIUS = 22;

const SWIPE_ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };
const TEXT_STYLE = { fontFamily: 'sans-serif', color: '#ffffff' };
const DIM_COLOR = '#9aa4bf';
const WARNING_COLOR = '#f39c12';

// Top-left corner of the card for slot 0-8.
export function cardPosition(slotIndex) {
  return {
    x: CARD_GAP + (slotIndex % CARDS_PER_ROW) * (CARD_WIDTH + CARD_GAP),
    y: CARD_GAP + Math.floor(slotIndex / CARDS_PER_ROW) * (CARD_HEIGHT + CARD_GAP),
  };
}

// Draws an empty card. Returns { showName, showDevice, showMode, showInput, showStats, showWaiting, destroy }.
export function createPlayerCard(scene, slotIndex, color, colorText) {
  const { x, y } = cardPosition(slotIndex);
  const container = scene.add.container(x, y);
  const text = (left, top, value, style) => scene.add.text(left, top, value, { ...TEXT_STYLE, ...style });

  const background = scene.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0x1c2130).setOrigin(0);
  background.setStrokeStyle(4, color);
  const title = text(20, 12, '', { fontSize: '36px', color: colorText, fontStyle: 'bold' });
  const deviceText = text(20, 56, '', { fontSize: '22px', color: DIM_COLOR });
  const modeText = text(20, 84, 'no input yet', { fontSize: '24px' });
  const ring = scene.add.circle(RING_CENTER.x, RING_CENTER.y, RING_RADIUS).setStrokeStyle(3, 0x3a4258);
  const dot = scene.add.circle(RING_CENTER.x, RING_CENTER.y, DOT_RADIUS, color);
  const bigText = text(RING_CENTER.x, RING_CENTER.y, '', { fontSize: '80px' }).setOrigin(0.5);
  const statsText = text(215, 118, '', { fontSize: '24px', fontFamily: 'monospace', lineSpacing: 6 });
  const rawText = text(20, 296, '', { fontSize: '20px', color: DIM_COLOR });
  // Covers the card while the player is in their grace period.
  const waitingCover = scene.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0x10131c, 0.92).setOrigin(0);
  const waitingText = text(CARD_WIDTH / 2, CARD_HEIGHT / 2, '', { fontSize: '30px', color: WARNING_COLOR, align: 'center' })
    .setOrigin(0.5);
  container.add([background, title, deviceText, modeText, ring, dot, bigText, statsText, rawText, waitingCover, waitingText]);
  showWaiting(null);

  let tapCount = 0;

  function showName(name) {
    title.setText(name);
  }

  function showDevice(label) {
    deviceText.setText(label);
  }

  // Shows the input the controller picked, and why if it had to fall back from another one.
  function showMode(mode, fallbackFrom, reason) {
    const usesStick = mode === INPUT_KINDS.DRAG || mode === INPUT_KINDS.TILT;
    ring.setVisible(usesStick);
    dot.setVisible(usesStick).setPosition(RING_CENTER.x, RING_CENTER.y);
    bigText.setVisible(!usesStick).setText(mode === INPUT_KINDS.TAP ? '0' : '');
    tapCount = 0;
    rawText.setText('');
    if (fallbackFrom) {
      modeText.setText(`${mode} (${fallbackFrom}: ${reason})`).setColor(WARNING_COLOR);
    } else {
      modeText.setText(mode).setColor(TEXT_STYLE.color);
    }
  }

  function showInput(input) {
    rawText.setText(JSON.stringify(input));
    if (input.kind === INPUT_KINDS.DRAG || input.kind === INPUT_KINDS.TILT) {
      const travel = RING_RADIUS - DOT_RADIUS;
      dot.setPosition(RING_CENTER.x + (Number(input.x) || 0) * travel, RING_CENTER.y + (Number(input.y) || 0) * travel);
    } else if (input.kind === INPUT_KINDS.TAP) {
      tapCount += 1;
      bigText.setText(String(tapCount));
    } else if (input.kind === INPUT_KINDS.SWIPE) {
      bigText.setText(SWIPE_ARROWS[input.direction] || '?');
    }
  }

  // rate in Hz; roundTrip is { last, average, max } or null; jitter in ms or null (see host/latency-stats.js).
  function showStats({ rate, roundTrip, jitter }) {
    const milliseconds = (value) => (value === null || value === undefined ? '-' : `${value} ms`);
    const lines = [
      `rate   ${rate} Hz`,
      `rtt    ${milliseconds(roundTrip?.last)}`,
      `  avg  ${milliseconds(roundTrip?.average)}`,
      `  max  ${milliseconds(roundTrip?.max)}`,
      `jitter ${milliseconds(jitter)}`,
    ];
    statsText.setText(lines);
  }

  // `label` is e.g. 'waiting to reconnect\n1:52', or null once the player is back.
  function showWaiting(label) {
    waitingCover.setVisible(label !== null);
    waitingText.setVisible(label !== null).setText(label ?? '');
  }

  return { showName, showDevice, showMode, showInput, showStats, showWaiting, destroy: () => container.destroy() };
}
