# Fire TV Remote Pointer

Physical Fire TV testing proved that WebView spatial focus alone is not a usable browser experience for Kaylane TV, especially once a video player owns focus.

## Controls

Kaylane TV now has two explicit browser modes:

- **Pointer mode** (default): D-pad moves the Kaylane pointer, OK clicks under it.
- **Selection mode**: Vega/player native spatial focus owns D-pad and OK.

Hold the center **OK / Select** button for about 700 ms to switch modes.

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
- long OK switches to native selection mode;
- player controls work normally in selection mode;
- long OK returns to pointer mode;
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
