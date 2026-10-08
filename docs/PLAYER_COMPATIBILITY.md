# Player Compatibility Layer

Kaylane TV targets standard web video players inside Vega WebView without bypassing DRM, authentication, paywalls, or stream authorization.

## Vega WebView baseline

For broad embedded-player compatibility, the browser enables:

- JavaScript and DOM storage;
- third-party cookies;
- HTML5 media playback without an additional WebView user-action gate;
- Vega default media controls;
- strict HTTPS / no mixed-content downgrade.

This combination is intended for legitimate HTML5, iframe, MSE/HLS-style, and site-provided players that depend on cross-site cookies or delayed playback.

## Page compatibility bootstrap

The injected player compatibility layer:

- detects current and dynamically-added `video` / `audio` elements;
- enables `playsInline` hints;
- disables unsupported remote-playback surfaces;
- does not replace the page's own player framework;
- does not override `navigator.mediaSession` handlers;
- does not poll continuously.

## Manual recovery

Press the Fire TV **Menu** key while browsing to open Kaylane TV browser options.

Available recovery actions:

- **Relancer le lecteur**: retries errored/uninitialized native media, then falls back to reloading the largest visible player iframe;
- **Recharger la page**: full WebView reload;
- **Accueil Kaylane TV**;
- **Fermer les options**.

The manual player retry avoids reloading `blob:` / MSE media sources and `srcObject` streams.

## Dofuz / player-button compatibility

Some sites attach their real player bootstrap JavaScript to a link that also has an external fallback `href` or new-window target.

The navigation guard therefore prevents the browser's default escape navigation without stopping propagation of the site's click/submit event. This lets the site's player handler run while the single-window/ad protection remains active.

Popup requests still receive an isolated truthy stub and cannot redirect the real Kaylane TV WebView through `popup.location`.

## Limits

Compatibility cannot make an unsupported codec, unavailable stream, invalid TLS endpoint, or DRM system work. Kaylane TV does not bypass access controls. Unsupported/invalid media must fail normally rather than weakening app security.
