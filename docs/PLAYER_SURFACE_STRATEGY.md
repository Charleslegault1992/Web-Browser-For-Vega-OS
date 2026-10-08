# Player Surface Strategy

Kaylane TV uses a single Vega WebView.

## Why the old synthetic click failed

The Kaylane pointer is injected into the top document. That works for ordinary buttons and links in the same document.

It does not reliably activate controls inside a cross-origin iframe. Browser origin isolation prevents parent-page JavaScript from reaching the real Play button inside an unrelated iframe. Dispatching a synthetic parent-document mouse event is not equivalent to a native touch delivered to the embedded renderer.

TV Bro on Android solves this differently: it dispatches native MotionEvent touch input directly to the Android WebView surface. Vega WebView does not expose an equivalent coordinate-based native touch injection API in the public SDK used by this app.

## New approach: player promotion

When Pointer mode OK lands over a sufficiently large HTTPS iframe:

1. ignore known blocked-ad iframe hosts;
2. send the iframe URL through the WebView bridge;
3. temporarily authorize exactly that HTTPS URL through the navigation guard;
4. navigate the existing WebView to that player URL;
5. keep the original page in WebView history;
6. inject the Kaylane pointer into the player as its new top document.

The pointer can then interact with the player's real DOM instead of trying to click across an iframe boundary.

Back returns to the previous Movix/Dofuz page.

The same mechanism can be triggered manually from:

**Menu -> Ouvrir le lecteur dans Kaylane TV**

## Recursive embedded players

If the promoted player itself contains another large player iframe, the same action can promote that nested iframe again. This remains one WebView and uses normal browser history for returning.

## Ad overlays on player pages

Promoted player pages also receive bounded overlay cleanup.

The guard removes:
- overlays tied to known blocked-ad hosts;
- large high-z external overlays above a substantial visible video;
- dynamic candidates added or restyled after playback starts.

The guard does not:
- delete the active fullscreen tree;
- delete video/audio containers;
- blanket-block all third-party player/CDN traffic;
- bypass DRM, authentication, paywalls, or human-verification challenges.

## Physical validation

Test on Fire TV:

- open Movix and Dofuz;
- put pointer on the embedded player and press OK;
- confirm the player is promoted in the same WebView;
- press OK on the real Play control;
- confirm Back returns to the content page;
- confirm popup and overlay ads do not replace or cover playback;
- repeat once if the player contains a nested iframe;
- verify Menu -> Ouvrir le lecteur dans Kaylane TV as a fallback.
