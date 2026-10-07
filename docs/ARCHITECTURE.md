# Architecture — Kaylane TV

## Baseline

At bootstrap the project follows Amazon Vega SDK 0.24 guidance:
- React Native 0.83 line;
- Vega WebView 4.x;
- TypeScript;
- Vega `manifest.toml`;
- physical Fire TV hardware required for final performance/UX validation.

## Layers

### 1. Native TV shell
React Native for Vega owns:
- application lifecycle;
- WebView instance;
- loading/error chrome;
- top-level remote/back behavior;
- configuration.

### 2. Navigation policy
A small deterministic policy decides whether a top-level navigation is:
- allowed;
- redirected into current WebView;
- blocked.

This policy must distinguish **top-level navigations** from ordinary subresources. Media/CDN requests are not to be denied by a simplistic hostname allowlist.

### 3. Page guard injection
A compact script injected before page content:
- wraps popup-opening primitives;
- normalizes `target="_blank"` behavior;
- reports navigation intents to the native shell when needed;
- installs conservative DOM cleanup hooks.

The script must be idempotent.

### 4. Blocking rules
Rules are data, not scattered string checks.

Suggested categories:
- blocked navigation hosts;
- allowed primary hosts;
- per-site exceptions;
- cosmetic selectors;
- compatibility flags.

Rules must support hostname suffix matching without accidental lookalike-domain matches.

### 5. Remote/focus layer
Remote handling must cooperate with WebView spatial navigation instead of fighting it.
Use native focus for app chrome and WebView focus for page content; custom DOM focus logic is only added where a site proves unusable with native WebView behavior.

## Back-button state machine

Preferred order:
1. if a native modal/overlay is open, close it;
2. else if WebView can go back, navigate back;
3. else return to app home/start surface or request app exit per final UX.

## Error handling

Handle:
- initial page failure;
- SSL errors (cancel by default);
- blocked navigation feedback;
- WebView crash/reload path if Vega exposes the required callback;
- offline/timeout states where detectable.

## Performance principles

- memoize static injected scripts;
- keep rule lookup O(1) or close to it;
- avoid React state updates on every WebView event;
- avoid MutationObserver callbacks that rescan the entire DOM;
- batch DOM cleanup;
- disable debug logging for release builds;
- validate on a physical Vega Fire TV Stick, not only VVD.
