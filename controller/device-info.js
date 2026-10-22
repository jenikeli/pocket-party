// Works out what the phone and browser offer: platform, browser, secure context, sensor and Wake Lock APIs.
// Used by controller/main.js (join screen list, and DEVICE_INFO to the host).

// Returns 'iPhone', 'iPad', 'Android' or 'other'.
export function detectPlatform() {
  const userAgent = navigator.userAgent;
  if (/Android/.test(userAgent)) {
    return 'Android';
  }
  if (/iPhone|iPod/.test(userAgent)) {
    return 'iPhone';
  }
  // iPadOS asks for desktop sites by default, so its Safari says "Macintosh". Only the touch screen gives it away.
  if (/iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1)) {
    return 'iPad';
  }
  return 'other';
}

// Returns 'Chrome', 'Safari', 'Firefox' or 'other'. On iOS every browser runs Apple's WebKit engine
// underneath, so iOS Chrome ("CriOS") should behave like Safari for sensors; the name is still useful.
export function detectBrowser() {
  const userAgent = navigator.userAgent;
  if (/CriOS|Chrome\//.test(userAgent)) {
    return 'Chrome';
  }
  if (/FxiOS|Firefox\//.test(userAgent)) {
    return 'Firefox';
  }
  if (/Safari\//.test(userAgent)) {
    return 'Safari';
  }
  return 'other';
}

// Label -> value pairs for the join screen.
export function listDeviceInfo() {
  return {
    Platform: `${detectPlatform()} ${detectBrowser()}`,
    'Secure context': String(window.isSecureContext),
    // Both are missing entirely over plain HTTP (measured in the spike); they appear once we serve HTTPS (M2).
    'Tilt API': 'DeviceOrientationEvent' in window ? 'present' : 'missing',
    // iOS must call this from a tap before any tilt events arrive. The spike found it on Android Chrome too.
    'Tilt permission API': hasTiltPermissionApi() ? 'present' : 'missing',
    'Wake Lock API': 'wakeLock' in navigator ? 'present' : 'missing',
  };
}

function hasTiltPermissionApi() {
  return 'DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission === 'function';
}
