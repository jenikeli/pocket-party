// Serves the controller, host, shared and asset files over HTTP(S).
// Used by server/index.js as the request handler for every non-WebSocket request.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Only these top-level folders are public. Everything else (server/, node_modules/, certs) is not.
const PUBLIC_FOLDERS = ['controller', 'host', 'shared', 'assets'];

// Short URLs people type by hand.
const PAGE_ALIASES = {
  '/': '/controller/index.html',
  '/host': '/host/index.html',
  '/host/': '/host/index.html',
};

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  // Browsers refuse to run an ES module served with any non-JavaScript type, so .mjs needs its own entry.
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
};

export function handleStaticRequest(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendText(response, 405, 'Method not allowed');
    return;
  }

  const filePath = resolvePublicPath(request.url);
  if (!filePath) {
    sendText(response, 404, 'Not found');
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      sendText(response, 404, 'Not found');
      return;
    }
    sendFile(request, response, filePath, stats);
  });
}

// Turns a request URL into an absolute file path, or null if it is not a public file.
function resolvePublicPath(requestUrl) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  } catch {
    return null; // Malformed percent-encoding: treat as not found.
  }
  urlPath = PAGE_ALIASES[urlPath] || urlPath;

  // path.resolve collapses any "../" so a request cannot climb out of the folder we check below.
  const filePath = path.resolve(ROOT_DIR, '.' + urlPath);
  const isPublic = PUBLIC_FOLDERS.some((folder) =>
    filePath.startsWith(path.join(ROOT_DIR, folder) + path.sep),
  );
  return isPublic ? filePath : null;
}

function sendFile(request, response, filePath, stats) {
  // "no-cache" means "cache it, but ask the server before reusing it". Paired with Last-Modified,
  // an unchanged file costs a tiny 304 reply instead of a full download, and edits show up on reload.
  const lastModified = stats.mtime.toUTCString();
  const headers = {
    'Cache-Control': 'no-cache',
    'Last-Modified': lastModified,
  };

  if (request.headers['if-modified-since'] === lastModified) {
    response.writeHead(304, headers);
    response.end();
    return;
  }

  headers['Content-Type'] = CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream';
  headers['Content-Length'] = stats.size;
  response.writeHead(200, headers);

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', (error) => {
    console.error(`Failed while sending ${filePath}:`, error.message);
    response.destroy();
  });
  stream.pipe(response);
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}
