# Fire TV Remote Pointer

Physical Fire TV testing proved that WebView spatial focus alone is not a usable browser experience for Kaylane TV, especially once a video player owns focus.

## Controls

Kaylane TV now has two explicit browser modes:

- **Pointer mode** (default): D-pad moves the Kaylane pointer, OK clicks under it.
- **Selection mode**: Vega/player native spatial focus owns D-pad and OK.

Use the Fire TV **Menu** button and choose the first option to switch between Pointer and Selection modes.

The injected page shows a short mode badge after a switch so the user always knows which mode is active.

## Vega input ownership

While pointer mode is active, the app uses Vega `useAddUserInputListenerCallback()` for Left/Right/Up/Down/Select. This is intentional: physical testing showed that a fullscreen/player surface can otherwise consume D-pad events before the page pointer sees them.

The override exists only while:
- the browser surface is active; and
- pointer mode is active.

When selection mode is enabled, those override subscriptions are removed so Vega/player native focus behavior is restored.

`useTVEventHandler()` observes a long Select press while selection mode is active so the user can return to pointer mode without leaving playback.

## Fullscreen

The injected pointer is event-driven and reattaches itself to the active fullscreen element on `fullscreenchange` / `webkitfullscreenchange`. It also exposes a small page API used by the native Vega remote controller to change mode, press/release directions, activate the element under the pointer, and refresh pointer attachment.

This makes the pointer survive normal player fullscreen transitions instead of disappearing while the player takes spatial focus.

## Performance

Pointer movement remains frame-timed only while a direction is held or velocity is decaying.

There is:
- no permanent interval;
- no permanent animation loop;
- no React render per pointer frame;
- no DOM-wide polling;
- native key subscriptions only while pointer mode is active;
- bounded one-shot timers only for the temporary mode badge.

## Physical test gate

Validate on the target Fire TV:
- pointer survives video start and fullscreen;
- D-pad no longer moves player focus while pointer mode is active;
- short OK clicks under the pointer;
- Menu -> Passer en mode sélection switches to native selection mode;
- player controls work normally in selection mode;
- Menu -> Passer en mode pointeur returns to pointer mode;
- Back and media transport keys remain unaffected.


## Physical fix: prevent player spatial-focus bleed-through

A fullscreen/active video player can keep its own spatial focus even while app-level D-pad listeners are receiving the same keys. Returning `true` from the input callback alone did not fully prevent the WebView/player focus engine from moving.

Pointer mode now mounts a transparent, native focus-capture View above the WebView and explicitly focuses it with Vega `FocusManager`. The injected cursor remains visible underneath and receives movement through the pointer bridge. Because the WebView itself is not the native focus target in pointer mode, its player controls cannot move at the same time.

Selection mode removes the capture View and programmatically returns focus to the WebView.

## Long OK reliability

Mode switching now uses a bounded 700 ms timer that starts on Select press instead of waiting for release-duration calculation. This avoids failures when a player swallows or delays the release event.

The switch happens while OK is still held. The same physical hold is ignored until release so it cannot immediately toggle back into the previous mode.

## Mode badge

The top-right mode badge is no longer persistent. It appears only after a real pointer/selection mode change and fades completely after about 1.3 seconds. Page load, fullscreen entry, and pointer refresh do not show it.


## Physical fix: Select / OK ownership

Physical testing after the native focus-capture change showed that registering `UserInputEventName.Select` through UserInputManager suppressed the normal Vega Pressable Select behavior. The pointer still moved, but short OK no longer clicked.

Pointer mode now splits responsibilities:
- UserInputManager overrides only D-pad directions so player spatial focus cannot move in parallel;
- the transparent native focus-capture surface is a Vega/React Native `Pressable`;
- short OK is handled by the Pressable and calls the injected pointer activation API;
- long OK is handled by the same Pressable after 700 ms and switches to Selection mode;
- Selection mode still uses TVEventHandler observation for long OK back to Pointer mode without replacing the player's normal short-OK behavior.

This matches Vega guidance: Pressable is the normal TV Select surface, while UserInputManager overrides platform behavior for keys it registers.


## Embedded player / verification surfaces

A pointer click injected into the top document cannot directly click inside a cross-origin iframe because the browser same-origin policy intentionally isolates that frame. This affects some embedded video controls and human-verification widgets.

Kaylane TV now detects when the pointer is over an embedded native surface such as an iframe, object, or embed. On short OK:

- the embedded surface is focused in the page;
- the page sends a bounded bridge message to the native app;
- Pointer mode switches to Selection mode;
- the pointer capture surface unmounts;
- the WebView regains native TV interaction;
- a short notice tells the user to press OK to interact with the real embedded control.

The next OK is therefore handled by the actual WebView/player/verification widget rather than a synthetic parent-document click.

This does not solve or bypass a human-verification challenge. It only restores the user's ability to interact with the legitimate verification control using the Fire TV remote.


## Current physical-device policy

The latest Fire TV testing supersedes the earlier long-OK and automatic iframe handoff experiments.

- Short OK in Pointer mode always means "click under the Kaylane pointer".
- Holding OK does not change modes.
- Clicking a video/iframe does not automatically force Selection mode.
- Pointer/Selection switching is available only from the browser Menu.
- Pointer mode continues to override D-pad directions so an active player cannot move its spatial selection in parallel.
- Selection mode intentionally gives the WebView/player native D-pad and OK behavior.


## Precision pointer tuning

Physical Fire TV testing showed that a quick D-pad tap moved the pointer too far, which made small Play buttons and player controls hard to target.

Pointer v5 now uses a precision-first movement curve:

- a fresh direction press gives only a 7 px nudge;
- the first ~170 ms stays at a slow precision speed;
- acceleration starts only after the button is held;
- maximum pointer speed is reduced;
- friction is stronger so short taps stop immediately instead of gliding;
- edge scrolling is also slower.

Result: quick taps are for fine aiming, while holding a direction still ramps into smooth continuous travel across the TV screen.


## Robust OK activation + compact menu recovery

Physical Fire TV testing showed that short OK could still fail on some Play buttons and close X controls.

Pointer v7 now uses a stronger activation path:
- resolves the deepest same-origin/shadow-DOM element under the pointer;
- promotes an iframe only when the iframe itself is the topmost visible hit target;
- resolves the nearest interactive button/link/control ancestor;
- dispatches pointerdown/pointerup plus mouse down/up before native click();
- directly toggles HTML5 video/audio play/pause when the actual media element is targeted;
- close/X controls first ask the navigation guard to remove the popup containing that point.

The browser menu now also exposes **Fermer toutes les fenêtres**, which runs a manual bounded cleanup pass for visible popup/modal/captcha/interstitial overlays while preserving legitimate source-selection and player surfaces.

The options panel was changed to a compact two-column TV-safe grid. All actions fit on one 720p screen, so focus no longer has to scroll beyond the visible panel and then become difficult to recover with the D-pad.


## Manual delete-element mode

Physical testing of the automatic visual-obstruction removal showed that it was too aggressive: ordinary pointer clicks could remove legitimate page content. That automatic click-to-delete behavior is intentionally not carried forward.

Normal Pointer mode is restored to activation-only behavior:
- OK clicks/activates the visible target;
- OK can play/pause direct HTML5 media;
- a topmost player iframe can still follow the existing player-promotion path;
- normal OK does not delete DOM elements.

The browser menu now contains an explicit toggle:

**Supprimer élément : OFF / ON**

When enabled:
- Kaylane TV automatically returns to Pointer mode;
- the cursor changes to a red delete-state appearance;
- OK removes the logical element under the pointer instead of clicking it;
- modal/overlay ancestors are preferred when appropriate so one press can remove a whole nuisance card rather than only its text/icon;
- deleted iframe signatures are quarantined so the same nuisance frame is less likely to reappear immediately;
- actual video/audio elements and large video-shaped player iframes are protected and return a temporary “Vidéo protégée” status instead of being deleted.

The toggle is OFF by default and resets when opening a new Kaylane TV site or returning to the Kaylane home screen.
