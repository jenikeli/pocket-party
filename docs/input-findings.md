# Input findings (M3 input lab)

What tap, swipe and tilt (plus drag, from M1) are like on real phones, measured with the input lab: the host at `/host`, phones at `/`, over HTTPS on the hotspot. These findings decide which minigames M5 and M7 build. Numbers come from the host's player cards unless a row says otherwise.

How the lab measures (so the numbers can be read correctly):
- **rate**: input messages the host received from that phone in the last second. Drag and tilt are capped at about 30 Hz by the controller (33 ms throttle); tap and swipe send one message per gesture.
- **rtt**: round trip host -> server -> phone -> server -> host, one ping a second; "avg" and "max" cover the last 10 pings. One way is roughly half.
- **jitter**: over the last second, max minus min of (host receive time - phone send time). The two clocks differ, but by a constant amount, so this spread is how much the one-way delay varies. Only shows while inputs are flowing.
- Headless browser tests show RTTs of 100-250 ms on the dev box because the test host page renders slowly; those are not network numbers. Only real devices count here.

## Setup for each run

Write down: server device (Termux phone or dev box), network (hotspot or home Wi-Fi), number of phones connected, and the date.

## Latency and rate

Fill in one row per phone and input. "Idle rtt" is with the phone connected but not sending; "busy rtt" is while dragging or tilting.

| Phone + browser | Input | rate (Hz) | idle rtt avg / max | busy rtt avg / max | jitter (ms) | Notes |
|---|---|---|---|---|---|---|
| iPhone Safari | drag | | | | | |
| iPhone Safari | tap | | | | | |
| iPhone Safari | swipe | | | | | |
| iPhone Safari | tilt | | | | | |
| Android Chrome | drag | | | | | |
| Android Chrome | tap | | | | | |
| Android Chrome | swipe | | | | | |
| Android Chrome | tilt | | | | | |

## Tilt

| Question | iPhone Safari | Android Chrome |
|---|---|---|
| Permission prompt shown on "Enable tilt"? | | |
| Asked again after a reload? After closing and reopening the tab? | | |
| After denying once, can it be granted again without clearing site data? | | |
| Rate while moving / while lying still (Hz) | | |
| Drift: x and y after "Set zero", then 30 s held still | | |
| Does the value jump when the phone is tipped past vertical? | | |
| Comfortable full-tilt angle (the lab uses 25 degrees) | | |

## Touch

| Question | iPhone Safari | Android Chrome |
|---|---|---|
| Fastest tap rate one thumb / two thumbs (taps per second on the controller counter over 5 s) | | |
| Any taps missed or doubled? | | |
| Swipes that should count but did not (too short or too slow)? | | |
| Edge swipes stolen by the OS (back gesture, home bar)? | | |
| Any page scroll, zoom or pull-to-refresh while playing? | | |

## Conclusions

(Which inputs feel good enough for a minigame, and any change to the lab's constants: tilt range, smoothing, swipe thresholds, send rate.)
