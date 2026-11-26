// Bot navigation: a grid of ground nodes over the map (3 m apart, kept where a player fits), each linked to its
// neighbours when the straight line between them is clear at knee and chest height, with an A* path search. Built
// once per map by session.js. No DOM, unit tested. Used by bots.js.

import { fits, lineClear } from './collision.js';

const CELL = 3;

export function buildNav(map) {
  const { x0, x1, z0, z1 } = map.bounds;
  const columns = Math.floor((x1 - x0) / CELL);
  const rows = Math.floor((z1 - z0) / CELL);
  const index = new Map();
  const nodes = [];
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const x = x0 + CELL / 2 + column * CELL;
      const z = z0 + CELL / 2 + row * CELL;
      if (fits(map.boxes, { x, y: 0, z, r: 0.5 }, 1.8)) {
        index.set(`${column},${row}`, nodes.length);
        nodes.push({ x, z, column, row, links: [] });
      }
    }
  }
  for (const node of nodes) {
    for (let dc = -1; dc <= 1; dc += 1) {
      for (let dr = -1; dr <= 1; dr += 1) {
        const other = nodes[index.get(`${node.column + dc},${node.row + dr}`)];
        const open = (height) => lineClear(map.boxes, { x: node.x, y: height, z: node.z }, { x: other.x, y: height, z: other.z });
        if ((dc !== 0 || dr !== 0) && other && open(0.35) && open(1.0)) {
          node.links.push(nodes.indexOf(other));
        }
      }
    }
  }
  return { nodes, nearest: (x, z) => nearestNode(nodes, x, z) };
}

function nearestNode(nodes, x, z) {
  let best = 0;
  let bestDistance = Infinity;
  nodes.forEach((node, id) => {
    const distance = (node.x - x) ** 2 + (node.z - z) ** 2;
    if (distance < bestDistance) {
      best = id;
      bestDistance = distance;
    }
  });
  return best;
}

// A path of { x, z } points from one place to another, or [] when there is none.
export function findPath(nav, from, to) {
  const start = nav.nearest(from.x, from.z);
  const goal = nav.nearest(to.x, to.z);
  const cost = new Map([[start, 0]]);
  const came = new Map();
  const open = [start];
  while (open.length > 0) {
    open.sort((a, b) => cost.get(a) + heuristic(nav, a, goal) - (cost.get(b) + heuristic(nav, b, goal)));
    const current = open.shift();
    if (current === goal) {
      const path = [];
      for (let step = goal; step !== undefined; step = came.get(step)) {
        path.unshift({ x: nav.nodes[step].x, z: nav.nodes[step].z });
      }
      return path;
    }
    for (const next of nav.nodes[current].links) {
      const move = cost.get(current) + Math.hypot(nav.nodes[next].x - nav.nodes[current].x, nav.nodes[next].z - nav.nodes[current].z);
      if (move < (cost.get(next) ?? Infinity)) {
        cost.set(next, move);
        came.set(next, current);
        if (!open.includes(next)) {
          open.push(next);
        }
      }
    }
  }
  return [];
}

function heuristic(nav, a, b) {
  return Math.hypot(nav.nodes[a].x - nav.nodes[b].x, nav.nodes[a].z - nav.nodes[b].z);
}
