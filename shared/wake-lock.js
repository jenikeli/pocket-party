// Keeps the screen on with the Screen Wake Lock API, where the browser has it (secure contexts only, so
// HTTPS on the LAN). Used by host/main.js and controller/main.js.

// Calls onStatus(text) whenever the lock is taken, lost or refused, so the page can show it.
export function keepScreenAwake(onStatus) {
  if (!('wakeLock' in navigator)) {
    onStatus('not supported (needs https)');
    return;
  }
  let lock = null;

  async function requestLock() {
    if (lock && !lock.released) {
      return;
    }
    try {
      lock = await navigator.wakeLock.request('screen');
      onStatus('on');
      lock.addEventListener('release', () => onStatus('off'));
    } catch (error) {
      // Some browsers may only grant the lock during a tap (not verified on every one), so try again on the
      // next tap. Passing the same function means repeated failures still leave only one listener.
      console.warn('Wake Lock request failed:', error);
      onStatus(`refused (${error.name}), tap the screen to retry`);
      document.addEventListener('pointerup', requestLock, { once: true });
    }
  }

  // The browser releases the lock whenever the page is hidden, so take it again when it comes back.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      requestLock();
    }
  });
  requestLock();
}
