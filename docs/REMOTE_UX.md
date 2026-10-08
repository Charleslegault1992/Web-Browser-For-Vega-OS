# Fire TV Remote / UX

## Goal

Kaylane TV must be fully usable with a Fire TV Vega remote only. No mouse,
touchscreen, or keyboard is required for the core journey.

This scope uses native TV focus on Kaylane TV home. Inside web content, physical Fire TV testing required an explicit two-mode browser input model: pointer mode temporarily owns D-pad/Select, while selection mode restores Vega/player native spatial navigation. Focus polling and permanent timers are still avoided.

## Home

The home surface is intentionally small:

- clearly branded **Kaylane TV**;
- Movix and Dofuz are the only default destinations;
- the first destination receives preferred focus on first entry;
- an optional preferred URL can restore the last home-card focus on return;
- focus is represented by a high-contrast border plus a small static scale;
- no JS animation loop and no expensive transition;
- layout uses wide safe margins and large typography suitable for 1080p/4K;
- the destination model is data-driven so favorites/history/custom addresses can
  be added later without replacing the home architecture.

If a remembered destination no longer exists, focus falls back to the first
available destination. If the destination list is empty, no preferred focus is
invented.

## Native -> WebView focus

When opening a site:

1. the native home unmounts;
2. the single WebView mounts with `hasTVPreferredFocus={true}`;
3. Kaylane pointer mode owns D-pad/Select by default;
4. holding OK switches to native selection mode for player controls;
5. no native overlay is allowed to take focus during normal playback.

## WebView -> native focus

When returning home, mount `BrowserHome` again. The home preferred-focus rule
gives Vega one deterministic native target.

For fatal main-frame failures, use `BrowserError` instead of a transient toast.
Its **Réessayer** action receives preferred focus; **Accueil** remains reachable
by native spatial navigation. On retry, remount/reload the WebView so its
preferred focus is re-applied.

Transient notices use `BrowserNotice`, which is non-focusable and
`pointerEvents="none"`; it must never cover remote interaction or steal focus
from a player.

## Back policy

App-level order:

1. close the active native notice/overlay;
2. otherwise, if the browser surface is active and WebView can go back, call
   `WebView.goBack()`;
3. otherwise return to Kaylane TV home;
4. from home return `false` from `BackHandler` so Vega performs normal
   system Back behavior.

The pure policy treats **home as authoritative** even if a stale
`canGoBack=true` is observed during a rapid surface transition.

The BackHandler listener is installed once per mounted shell and reads the
latest controller state through a ref. A 180 ms no-timer debounce consumes the
immediate key-repeat burst from a just-handled app Back. This prevents one
physical press from closing a notice, navigating, then exiting after the Home
re-render. A clean Back press that starts on Home still falls through to Vega.

## Back integration contract

The integrated shell should update `canGoBack` from both `onLoadStart` and
`onLoad`. Vega WebView exposes `canGoBack` on both events. This reduces stale
history state during redirects and fast navigation.

Reasonable edge-case behavior:

| State | Back result |
| --- | --- |
| transient notice visible | dismiss notice only |
| fatal native error surface | close/resolve native surface first according to shell state |
| browser + canGoBack | WebView.goBack() |
| browser + no history | home |
| home | Vega system Back |
| redirect/loading + history | WebView.goBack() |
| redirect/loading + no history | home |
| rapid repeated Back | first handled action runs; key-repeat burst is consumed |
| stale canGoBack while already home | Vega system Back |

## Web-page Back events

Keep `allowSystemKeyEvents` disabled/unset for the initial integration while
the native Back state machine owns Back. Vega requires that property only when
the web page itself needs the system Back key event.

Enabling it without a site-specific reason risks splitting Back ownership
between page JavaScript and the native shell.

## DPAD / Select

Expected ownership:

- Home: native `Pressable` focus.
- Web content pointer mode: app-level Vega input listeners move/click the injected pointer.
- Web content selection mode: WebView/player native spatial navigation.
- Hold OK for about 700 ms to switch modes.
- No focus polling.
- No periodic DOM scan.

`enableSynchronousFocusEvents={true}` is used only on the small native control
set so focus stays deterministic during fast remote presses.

## Media

Keep `allowsDefaultMediaControl={true}` in the WebView.

Vega WebView supports the media transport path for:

- Play/Pause;
- Rewind;
- Fast-forward / seek;
- page `navigator.mediaSession` handlers where provided;
- default WebView behavior when the page does not provide custom handlers.

Do not mirror playback time into React state and do not add a JS interval for
player progress.

## Fullscreen video

Kaylane TV native chrome must not be layered above fullscreen video.

Vega WebView 4.0.2 does not expose a generic fullscreen callback in the current
component reference, so fullscreen entry/exit and Back interaction remain a
mandatory physical-device gate.

Do not add speculative fullscreen polling or DOM fullscreen watchers globally.
If Movix or Dofuz proves to need a compatibility shim, keep it site-scoped and
event-driven.

Physical validation must cover:

- enter fullscreen with OK;
- DPAD/player overlay focus;
- Play/Pause;
- Rewind;
- Fast-forward;
- Back exits fullscreen without unexpectedly leaving the video page;
- focus returns to the WebView/player after fullscreen exit;
- native notice/error UI is not visible above fullscreen.

## Loading

Initial loading feedback should be visual but non-focusable and should not
replace WebView focus.

Rules:

- keep the WebView background black to prevent white flash;
- loading UI uses `pointerEvents="none"`;
- do not dim or re-render the entire player during ordinary playback;
- do not start an interval or update React state per progress event;
- any "long load" hint should use one bounded one-shot timeout per top-level
  navigation and must be cleared on load/error/unmount.

A long-load hint is informational only; do not force-stop a legitimate slow
stream just because an arbitrary UI timeout elapsed.

## Errors

Use the Vega WebView error callbacks at the shell boundary:

- `onError`: network/general load failure;
- `onHttpError`: surface a fatal page UI only when `isMainFrame === true`;
  iframe/subresource HTTP failures must not replace a working video page;
- `onSslError`: always cancel, never proceed through certificate errors;
- `onCloseWindow`: never let page content create/close a second app window;
  route the single-window experience back to a safe app state.

For a fatal main-frame error, show `BrowserError` with **Réessayer** and
**Accueil**. A transient notice is appropriate for blocked popups and
non-fatal information, not as the only recovery UI for an unreachable page.

## Performance audit

Agent C runtime code contains:

- zero polling loops;
- zero permanent intervals;
- frame callbacks only while pointer motion is active;
- one BackHandler subscription per mounted shell;
- bounded Vega D-pad/Select override subscriptions only in pointer mode;
- local focus state only for currently rendered native buttons/cards;
- no React playback-progress state;
- no global DOM focus polling engine.

The 180 ms Back protection compares timestamps only when a Back event arrives;
it schedules no timer.

## TV display

Native surfaces target a 10-foot UI:

- large titles/action labels;
- high contrast;
- generous safe margins;
- no thin focus-only color change;
- focused state remains recognizable from a distance;
- no important UI pinned to extreme screen edges;
- French copy is short and direct.

## Physical Fire Stick test matrix

Run on the target Vega Fire TV hardware after the integrated shell contains
Agent A + B + C.

### Home

- Cold launch: Movix has visible initial focus.
- RIGHT: focus moves to Dofuz.
- LEFT: focus returns to Movix.
- OK on both cards opens the requested site.
- Browser -> Home: one deterministic card has focus immediately.
- Re-enter Home repeatedly: no focus loss or dead-end.
- Back from Home: Vega receives system Back.

### Browser / DPAD

For both Movix and Dofuz:

- UP/DOWN/LEFT/RIGHT navigate page focus without mouse/touch.
- OK activates links/player controls.
- focus stays visible after navigation and redirects.
- no dead-end after a blocked popup.
- no native focus ring remains over WebView content.

### Back

- notice -> dismiss only;
- page with history -> one history step;
- no history -> Home;
- Home -> system Back;
- hold/spam Back -> no multi-step accidental escape;
- Back during load;
- Back during redirect chain;
- Back after load error;
- Back immediately after switching source.

### Video

- start playback;
- player receives focus;
- Play/Pause works;
- Rewind works;
- Fast-forward works;
- enter/exit fullscreen;
- Back from fullscreen behaves correctly;
- focus recovers after fullscreen;
- native notice never steals focus;
- no loading/error chrome remains above fullscreen.

### Failure / recovery

- offline before load;
- network loss during page navigation;
- unreachable host;
- HTTP 4xx/5xx main frame;
- failing iframe/subresource does not replace the page;
- SSL error is cancelled;
- Retry returns focus to WebView;
- Accueil returns focus to native home.

### Stability

Repeat Home -> Movix/Dofuz -> playback -> Back -> Home for at least 20 cycles:

- no accumulating listeners;
- no progressive focus lag;
- no repeated notices from one event;
- no increasing React render activity during playback;
- no second WebView/window;
- no crash or obvious memory-growth regression.


## Playback/load resilience after physical testing

Generic WebView `onError` events are not treated as an immediate fatal replacement screen anymore. The callback does not expose `isMainFrame`, so replacing the entire browser surface on every load error can incorrectly turn a dependent/player failure into a full-page "connection lost" experience.

Kaylane TV now:
- ignores dependent/player errors when the failing URL is different from the tracked main-frame URL;
- performs at most two bounded soft reload attempts for a matching top-level load error;
- retries transient main-frame HTTP responses such as 408, 429, 5xx gateway/service errors, and common 52x edge failures;
- leaves the existing page visible after the bounded retries instead of forcing a fatal connection overlay;
- still cancels SSL errors;
- still uses a fatal recovery screen for non-transient main-frame HTTP failures.

This is intentionally bounded: there is no infinite reload loop and no permanent retry timer.
