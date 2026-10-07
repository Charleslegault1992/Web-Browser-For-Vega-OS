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
