// Times the M6a spike's code loading, split into the network part (fetching Three.js and the spike's files
// from the server) and the rest (the browser parsing and running them). Only the network part would get faster
// with more caching (see "Later ideas" in plan.md). Used by the spike's load().

// Runs `importModules` (a function returning the dynamic import's promise) and returns { module, timing }.
// timing: { files, bytes, fileBytes, networkMs, totalMs }: bytes is what came over the network, fileBytes the
// files' own size. The browser's Resource Timing entries say when each file's request started and its last
// byte arrived; networkMs is the span from the first request to the last byte, because the browser fetches
// some files in parallel. It is an upper bound: a module's imports are only requested once it has been
// parsed. A file the browser already has costs a 304 (a tiny reply to "has it changed?"), so a second run
// shows few bytes.
export async function timeImport(importModules) {
  const startedAt = performance.now();
  const module = await importModules();
  const totalMs = performance.now() - startedAt;
  const entries = performance
    .getEntriesByType('resource')
    .filter((entry) => entry.startTime >= startedAt);
  if (entries.length === 0) {
    return { module, timing: { files: 0, bytes: 0, fileBytes: 0, networkMs: 0, totalMs } };
  }
  const firstStart = Math.min(...entries.map((entry) => entry.startTime));
  const lastEnd = Math.max(...entries.map((entry) => entry.responseEnd));
  return {
    module,
    timing: {
      files: entries.length,
      bytes: entries.reduce((sum, entry) => sum + entry.transferSize, 0),
      fileBytes: entries.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
      networkMs: lastEnd - firstStart,
      totalMs,
    },
  };
}
