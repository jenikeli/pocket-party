// Our three airlines' emblems (M9), drawn on a canvas round (0, 0) in a disc of `radius`: Palm Air's palm against
// a rising sun, Coral Wings' pair of wings over a coral disc, Skipjack Air's leaping fish over a wave. Each is
// ringed in white, so it reads on any colour. Used by the planes' liveries (kit/airliner-liveries.js) on noses
// and fins.

// Draws `kind`'s emblem ('palm', 'wings' or 'fish') in colours { main, accent } (CSS colour strings).
export function drawEmblem(context, kind, radius, colors) {
  context.save();
  context.lineJoin = 'round';
  context.lineCap = 'round';
  disc(context, radius, '#ffffff');
  disc(context, radius * 0.88, kind === 'palm' ? colors.accent : colors.main);
  context.beginPath();
  context.arc(0, 0, radius * 0.88, 0, 2 * Math.PI);
  context.clip();
  EMBLEMS[kind](context, radius, colors);
  context.restore();
}

function disc(context, radius, fill) {
  context.fillStyle = fill;
  context.beginPath();
  context.arc(0, 0, radius, 0, 2 * Math.PI);
  context.fill();
}

const EMBLEMS = {
  // A green palm leaning over the sun, on a strip of sand.
  palm(context, radius, { main }) {
    const r = radius;
    context.fillStyle = '#ffe9a8';
    context.beginPath();
    context.ellipse(0, r * 0.95, r * 1.1, r * 0.42, 0, 0, 2 * Math.PI);
    context.fill();
    context.strokeStyle = '#7a4b25';
    context.lineWidth = r * 0.14;
    context.beginPath();
    context.moveTo(r * 0.15, r * 0.65);
    context.quadraticCurveTo(r * 0.25, 0, -r * 0.05, -r * 0.35);
    context.stroke();
    context.fillStyle = main;
    for (const turn of [-2.6, -1.9, -1.2, -0.5, 0.2]) {
      context.save();
      context.translate(-r * 0.05, -r * 0.38);
      context.rotate(turn);
      context.beginPath();
      context.ellipse(r * 0.38, 0, r * 0.42, r * 0.12, 0.25, 0, 2 * Math.PI);
      context.fill();
      context.restore();
    }
  },
  // Two white wings swept up from the middle, with a navy line under each.
  wings(context, radius, { accent }) {
    const r = radius;
    for (const side of [-1, 1]) {
      for (const [lift, fill] of [[0.12, accent], [0, '#ffffff']]) {
        context.fillStyle = fill;
        context.beginPath();
        context.moveTo(0, r * (0.2 + lift));
        context.quadraticCurveTo(side * r * 0.35, -r * (0.05 - lift), side * r * 0.82, -r * (0.45 - lift));
        context.quadraticCurveTo(side * r * 0.55, r * (0.05 + lift), side * r * 0.62, r * (0.08 + lift));
        context.quadraticCurveTo(side * r * 0.3, r * (0.3 + lift), 0, r * (0.42 + lift));
        context.fill();
      }
    }
  },
  // A fish leaping over a wave: a white body with dark stripes along its back and a forked tail.
  fish(context, radius, { accent }) {
    const r = radius;
    context.fillStyle = accent;
    context.beginPath();
    context.moveTo(-r, r * 0.55);
    context.bezierCurveTo(-r * 0.4, r * 0.25, r * 0.1, r * 0.85, r, r * 0.45);
    context.lineTo(r, r);
    context.lineTo(-r, r);
    context.fill();
    context.save();
    context.rotate(-0.45);
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.ellipse(0, 0, r * 0.55, r * 0.24, 0, 0, 2 * Math.PI);
    context.moveTo(-r * 0.45, 0);
    context.lineTo(-r * 0.82, -r * 0.28);
    context.lineTo(-r * 0.72, 0);
    context.lineTo(-r * 0.82, r * 0.28);
    context.fill();
    context.strokeStyle = '#1e3566';
    context.lineWidth = r * 0.05;
    for (const stripe of [-0.2, 0, 0.2]) {
      context.beginPath();
      context.moveTo(r * (stripe - 0.15), -r * 0.05);
      context.lineTo(r * (stripe + 0.1), -r * 0.18);
      context.stroke();
    }
    context.fillStyle = '#1e3566';
    context.beginPath();
    context.arc(r * 0.36, -r * 0.04, r * 0.05, 0, 2 * Math.PI);
    context.fill();
    context.restore();
  },
};
