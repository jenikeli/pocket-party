// Saltline's map materials: one canvas-drawn texture per box material (container, concrete, steel, metal, wood) plus
// the ground. Drawn once when createMaterials() is called. The maps are tinted per box by instance colour, which
// multiplies the texture, so every texture here is a light, fairly neutral grey and the tint carries the colour.
import * as THREE from 'three';

// How shiny each surface is (0 = mirror). The ground is wet; painted steel is a little glossy.
export const MATERIAL_ROUGHNESS = Object.freeze({ container: 0.72, concrete: 0.88, steel: 0.45, metal: 0.55, wood: 0.9, ground: 0.2 });

// A tiny seeded random so the textures look the same every run.
function makeRandom(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

function makeCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return { canvas, g: canvas.getContext('2d') };
}

function toTexture(canvas, repeatX, repeatY, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function fill(g, size, grey) {
  g.fillStyle = `rgb(${grey},${grey},${grey})`;
  g.fillRect(0, 0, size, size);
}

// Speckle noise over the whole canvas, to take the flat look off.
function speckle(g, size, rand, count, alpha) {
  for (let i = 0; i < count; i++) {
    const v = rand() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${alpha * rand()})`;
    g.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }
}

// Vertical corrugation, rust streaks running down, and a door end (a seam and two locking bars) on one side.
function drawContainer() {
  const size = 512;
  const { canvas, g } = makeCanvas(size);
  const rand = makeRandom(11);
  fill(g, size, 205);
  const ribs = 36;
  for (let i = 0; i < ribs; i++) {
    const x = (i / ribs) * size;
    const w = size / ribs;
    const grad = g.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0.35)');
    grad.addColorStop(0.28, 'rgba(0,0,0,0.3)');
    grad.addColorStop(0.52, 'rgba(255,255,255,0.12)');
    grad.addColorStop(0.76, 'rgba(0,0,0,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0.52)');
    g.fillStyle = grad;
    g.fillRect(x, 0, w, size);
  }
  for (let i = 0; i < 42; i++) {
    const x = rand() * size;
    const grad = g.createLinearGradient(0, 0, 0, size);
    const top = rand() * 0.48;
    const rust = `rgba(105,48,25,${0.18 + 0.38 * rand()})`;
    grad.addColorStop(top, 'rgba(105,48,25,0)');
    grad.addColorStop(top + 0.16 + 0.24 * rand(), rust);
    grad.addColorStop(Math.min(0.94, top + 0.48 + 0.18 * rand()), 'rgba(105,48,25,0.08)');
    grad.addColorStop(1, 'rgba(105,48,25,0)');
    g.fillStyle = grad;
    g.fillRect(x, 0, 1 + rand() * 7, size);
  }
  const wet = g.createLinearGradient(0, size * 0.72, 0, size);
  wet.addColorStop(0, 'rgba(20,25,30,0)');
  wet.addColorStop(1, 'rgba(12,18,24,0.4)');
  g.fillStyle = wet;
  g.fillRect(0, 0, size, size);
  g.fillStyle = 'rgba(15,19,21,0.65)';
  g.fillRect(0, 0, size, 8);
  g.fillRect(0, size - 8, size, 8);
  g.fillRect(size / 2 - 3, 0, 6, size);
  g.fillStyle = 'rgba(35,38,38,0.62)';
  g.fillRect(size * 0.17, 18, 7, size - 36);
  g.fillRect(size * 0.83, 18, 7, size - 36);
  g.fillStyle = 'rgba(230,220,200,0.16)';
  g.fillRect(size * 0.18, 20, 2, size - 40);
  speckle(g, size, rand, 6500, 0.34);
  return toTexture(canvas, 1, 1);
}

// Stained concrete: mottled blotches, damp dark patches low down, hairline cracks.
function drawConcrete() {
  const size = 512;
  const { canvas, g } = makeCanvas(size);
  const rand = makeRandom(23);
  fill(g, size, 200);
  for (let i = 0; i < 60; i++) {
    const v = 150 + rand() * 90;
    g.fillStyle = `rgba(${v},${v},${v},0.25)`;
    g.beginPath();
    g.arc(rand() * size, rand() * size, 20 + rand() * 60, 0, Math.PI * 2);
    g.fill();
  }
  const damp = g.createLinearGradient(0, size * 0.6, 0, size);
  damp.addColorStop(0, 'rgba(30,40,50,0)');
  damp.addColorStop(1, 'rgba(30,40,50,0.3)');
  g.fillStyle = damp;
  g.fillRect(0, 0, size, size);
  g.strokeStyle = 'rgba(40,40,40,0.35)';
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    let x = rand() * size;
    let y = rand() * size;
    g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (rand() - 0.5) * 40; y += rand() * 30; g.lineTo(x, y); }
    g.stroke();
  }
  speckle(g, size, rand, 5000, 0.3);
  return toTexture(canvas, 1, 1);
}

// Diamond plate: rows of small raised lozenges, alternating direction.
function drawSteel() {
  const size = 256;
  const { canvas, g } = makeCanvas(size);
  const rand = makeRandom(37);
  fill(g, size, 170);
  const cells = 8;
  const step = size / cells;
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const cx = (col + 0.5) * step;
      const cy = (row + 0.5) * step;
      const flip = (row + col) % 2 ? 1 : -1;
      g.save();
      g.translate(cx, cy);
      g.rotate((Math.PI / 4) * flip);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect(-step * 0.32, -step * 0.08, step * 0.64, step * 0.16);
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fillRect(-step * 0.32, step * 0.08, step * 0.64, step * 0.05);
      g.restore();
    }
  }
  speckle(g, size, rand, 1200, 0.25);
  return toTexture(canvas, 1, 1);
}

// Thin sheet panels: a grid of panels with bevelled seams and a rivet at each corner.
function drawMetal() {
  const size = 256;
  const { canvas, g } = makeCanvas(size);
  const rand = makeRandom(41);
  fill(g, size, 210);
  const panels = 2;
  const step = size / panels;
  for (let r = 0; r < panels; r++) {
    for (let c = 0; c < panels; c++) {
      const v = 190 + rand() * 50;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(c * step + 3, r * step + 3, step - 6, step - 6);
      g.fillStyle = 'rgba(60,60,60,0.8)';
      for (const [dx, dy] of [[12, 12], [step - 12, 12], [12, step - 12], [step - 12, step - 12]]) {
        g.beginPath();
        g.arc(c * step + dx, r * step + dy, 3, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.6)';
  for (let i = 0; i < panels; i++) { g.fillRect(i * step - 1, 0, 3, size); g.fillRect(0, i * step - 1, size, 3); }
  speckle(g, size, rand, 1500, 0.25);
  return toTexture(canvas, 1, 1);
}

// Planks running across the canvas, each its own tone, with grain lines and a nail at each end.
function drawWood() {
  const size = 256;
  const { canvas, g } = makeCanvas(size);
  const rand = makeRandom(53);
  const planks = 6;
  const h = size / planks;
  for (let i = 0; i < planks; i++) {
    const v = 175 + rand() * 60;
    g.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
    g.fillRect(0, i * h, size, h);
    for (let k = 0; k < 7; k++) {
      g.strokeStyle = `rgba(60,40,20,${0.15 + rand() * 0.25})`;
      g.beginPath();
      const y = i * h + 2 + rand() * (h - 4);
      g.moveTo(0, y);
      g.bezierCurveTo(size * 0.3, y + (rand() - 0.5) * 5, size * 0.6, y + (rand() - 0.5) * 5, size, y);
      g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,0.7)';
    g.fillRect(0, i * h, size, 2);
    g.fillRect(6, i * h + h / 2, 3, 3);
    g.fillRect(size - 9, i * h + h / 2, 3, 3);
  }
  return toTexture(canvas, 1, 1);
}

// Wet dark asphalt: fine aggregate, mottled damp patches, and faint tire marks.
function drawGround() {
  const size = 512;
  const { canvas, g } = makeCanvas(size);
  const rand = makeRandom(67);
  const pixels = g.createImageData(size, size);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const grit = 44 + Math.floor(rand() * 45);
    pixels.data[i] = grit;
    pixels.data[i + 1] = grit + 3;
    pixels.data[i + 2] = grit + 8;
    pixels.data[i + 3] = 255;
  }
  g.putImageData(pixels, 0, 0);
  for (let i = 0; i < 48; i++) {
    const v = 50 + rand() * 45;
    g.fillStyle = `rgba(${v},${v + 5},${v + 11},${0.12 + rand() * 0.2})`;
    g.beginPath();
    g.ellipse(rand() * size, rand() * size, 12 + rand() * 80, 8 + rand() * 42, rand() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    g.strokeStyle = `rgba(15,20,24,${0.08 + rand() * 0.11})`;
    g.lineWidth = 3 + rand() * 7;
    g.beginPath();
    const y = rand() * size;
    g.moveTo(-20, y);
    g.bezierCurveTo(size * 0.3, y + (rand() - 0.5) * 70, size * 0.7, y + (rand() - 0.5) * 70, size + 20, y);
    g.stroke();
  }
  speckle(g, size, rand, 8000, 0.28);

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = normalCanvas.height = size;
  const normalContext = normalCanvas.getContext('2d');
  const normal = normalContext.createImageData(size, size);
  const heightAt = (x, y) => pixels.data[(y * size + x) * 4];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const left = heightAt((x + size - 1) % size, y);
      const right = heightAt((x + 1) % size, y);
      const up = heightAt(x, (y + size - 1) % size);
      const down = heightAt(x, (y + 1) % size);
      const nx = left - right;
      const ny = up - down;
      const length = Math.hypot(nx, ny, 48);
      const offset = (y * size + x) * 4;
      normal.data[offset] = 128 + (nx / length) * 127;
      normal.data[offset + 1] = 128 + (ny / length) * 127;
      normal.data[offset + 2] = 128 + (48 / length) * 127;
      normal.data[offset + 3] = 255;
    }
  }
  normalContext.putImageData(normal, 0, 0);
  return {
    map: toTexture(canvas, 52, 44),
    normalMap: toTexture(normalCanvas, 52, 44, false),
  };
}

function standard(map, name, extra) {
  return new THREE.MeshStandardMaterial({ map, roughness: MATERIAL_ROUGHNESS[name], metalness: 0, ...extra });
}

export function createMaterials() {
  const ground = drawGround();
  return {
    container: standard(drawContainer(), 'container', { metalness: 0.25 }),
    concrete: standard(drawConcrete(), 'concrete'),
    steel: standard(drawSteel(), 'steel', { metalness: 0.5 }),
    metal: standard(drawMetal(), 'metal', { metalness: 0.4 }),
    wood: standard(drawWood(), 'wood'),
    ground: standard(ground.map, 'ground', { metalness: 0.12, normalMap: ground.normalMap, normalScale: new THREE.Vector2(0.45, 0.45) }),
  };
}
