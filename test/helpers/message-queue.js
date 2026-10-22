// A queue of received messages that tests can await one at a time, in arrival order.
// Used by the ws test client (test/helpers/socket-client.js) and the browser tests' frame watcher.

const DEFAULT_TIMEOUT_MS = 2000;

export function createMessageQueue() {
  const received = [];
  let waiter = null; // { resolve, reject, timer } while a test is awaiting the next message

  function push(message) {
    if (waiter) {
      clearTimeout(waiter.timer);
      waiter.resolve(message);
      waiter = null;
    } else {
      received.push(message);
    }
  }

  // Resolves with the next message, or rejects if none arrives in time.
  function next(timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (received.length > 0) {
      return Promise.resolve(received.shift());
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiter = null;
        reject(new Error(`No message arrived within ${timeoutMs} ms`));
      }, timeoutMs);
      waiter = { resolve, reject, timer };
    });
  }

  // Skips messages until one of the given type arrives (for streams with traffic the test does not care about).
  async function nextOfType(type, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const deadline = Date.now() + timeoutMs;
    while (true) {
      const message = await next(Math.max(1, deadline - Date.now()));
      if (message.type === type) {
        return message;
      }
    }
  }

  // Waits a while and returns whatever arrived, so a test can check that nothing was delivered.
  async function collectFor(durationMs) {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    return received.splice(0);
  }

  return { push, next, nextOfType, collectFor };
}
