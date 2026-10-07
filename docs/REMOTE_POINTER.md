# Fire TV Remote Pointer

Physical Fire TV testing showed that default WebView spatial navigation is not the desired browser experience for Kaylane TV.

Inside web pages, Kaylane TV therefore uses a lightweight JavaScript pointer layer.

## Controls

- D-pad Left / Right / Up / Down: move the on-screen pointer.
- Select / OK (Enter): activate the element underneath the pointer.
- Back: remains owned by the existing native browser Back policy.
- Media transport keys are not intercepted by the pointer layer.

The Kaylane TV native Home keeps normal TV focus navigation. Pointer mode is injected only inside the WebView.

## Implementation

The pointer:

- is a fixed 30px high-contrast ring with a center dot;
- uses `document.elementFromPoint()` for hit testing;
- uses CSS `translate3d` for movement;
- sends lightweight hover/mouse movement compatibility events;
- focuses and clicks the hit-tested element on Select;
- scrolls vertically by part of the viewport when the pointer reaches a vertical edge;
- consumes Arrow/Enter key events with `preventDefault()` so Vega WebView spatial navigation does not also move focus.

This follows Vega WebView guidance for custom focus management: prevent the default key action when the app intentionally replaces built-in spatial navigation.

## Performance

There is:

- no `setInterval`;
- no `requestAnimationFrame` loop;
- no React state update for pointer movement;
- no native bridge message on each movement;
- one keydown listener and one resize listener per page;
- direct DOM style updates only when the user presses a remote key.

## Popup compatibility discovered on hardware

Some streaming pages treat a falsy return from `window.open()` as proof that the browser blocked their legitimate continuation flow.

Kaylane TV still never creates a second browsing context. The guarded `window.open()` now returns the current `window` object while sending the destination through native policy.

Priority sites (Movix/Dofuz) may also defer a legitimate HTTPS player popup beyond the trusted-gesture window. A delayed popup originating from a primary host may therefore reuse the same WebView, unless the destination matches an explicit nuisance/ad hostname. Unknown third-party popups from unrelated opener sites remain blocked.

Physical Fire TV validation is mandatory after every change to this layer.
