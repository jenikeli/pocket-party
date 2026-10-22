# Input findings (M3 input lab)

What tap, swipe and tilt (plus drag, from M1) are like on real phones, measured with the input lab: the host at `/host`, phones at `/`, over HTTPS on the hotspot. These findings decide which minigames M5 and M7 build. Numbers come from the host's player cards unless a row says otherwise.

How the lab measures (so the numbers can be read correctly):
- **rate**: input messages the host received from that phone in the last second. Drag and tilt are capped at about 30 Hz by the controller (33 ms throttle); tap and swipe send one message per gesture.
- **rtt**: round trip host -> server -> phone -> server -> host, one ping a second; "avg" and "max" cover the last 10 pings. One way is roughly half.
- **jitter**: over the last second, max minus min of (host receive time - phone send time). The two clocks differ, but by a constant amount, so this spread is how much the one-way delay varies. Only shows while inputs are flowing.
- Headless browser tests show RTTs of 100-250 ms on the dev box because the test host page renders slowly; those are not network numbers. Only real devices count here.

## Results (first device run, user-reported)

Devices: iPhone (Safari) and Android (Chrome), over HTTPS. All four inputs worked on both: tilt permission flow, tilt movement and Set zero, the fallback to drag after a denied permission, tap (including two thumbs) and swipe, with no page scrolling or zooming reported.

### Tilt permission memory

| | iPhone Safari | Android Chrome |
|---|---|---|
| Remembered after "Enable tilt" (reload, reopen tab) | yes | yes |
| Private / incognito tab | asks again | still remembered |
| After restarting the browser | asks again | still remembered |

So on iOS, expect players to tap "Enable tilt" again after Safari restarts. Every game that uses tilt needs the button anyway (M3 always shows it), so this costs one tap, not a code change. Why Android keeps it even in incognito was not checked; a likely reason is that Chrome's "Motion sensors" site setting defaults to allowed, so its `requestPermission()` grants without asking.

### Latency and rate

The numbers varied a lot from moment to moment, so no table was recorded. Judged good enough: the controls feel responsive, and feel is what matters for the games. Re-measure only if a minigame feels laggy.

### Responsiveness

Tilt feels less responsive than drag. That is expected, and the cause is on the phone, not the network: both inputs take the same path to the host, but tilt adds the sensor's own rate (about 60 Hz), the 0.35 moving-average smoothing (roughly 50-100 ms before the value settles) and the 25-degree full-tilt range. To review later if a tilt game needs it, in `controller/inputs/tilt.js`: raise `SMOOTHING` (less lag, more shake), lower `FULL_TILT_DEGREES`, or halve `SEND_INTERVAL_MS` to send at 60 Hz.

## Conclusions

- Tap, swipe, drag and tilt are all usable on iPhone and Android, so the M5 (tap) and M7 (swipe, tilt) minigames can go ahead as planned.
- Tilt games should not need quick reactions until the tilt responsiveness above has been tuned. Steering and balancing suit it better than dodging.
- On iOS, assume the tilt permission is lost whenever Safari restarts.
