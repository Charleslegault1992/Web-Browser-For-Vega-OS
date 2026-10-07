# Navigation / Popup Guard

## Principle

Kaylane TV blocks nuisance **navigation and popup behavior** without turning the app into a blanket network filter.

That distinction is important because streaming pages commonly use third-party origins for:
- video;
- manifests;
- subtitles;
- CDNs;
- embedded players.

Those resources are not denied merely because they are cross-origin.

## Layers

1. `window.open` is neutralized before it can create a new context and locked against later reassignment when Chromium permits it.
2. Explicit new-context anchor clicks (`_blank`, `_new`, named targets, `rel=external`) are consumed and ignored.
3. Explicit new-context form submissions are consumed and ignored, including direct `form.submit()` calls.
4. `<base target>` is considered when deciding whether a link/form is trying to open another browsing context.
5. Same-window links/forms are left untouched so ordinary site navigation continues normally.
6. Vega `onShouldStartLoadWithRequest` must still apply `shouldAllowWebViewNavigation()` so unsafe top-level schemes/redirects cannot bypass native policy.
7. A small ad-host set is used only for nuisance navigation and targeted blocked-iframe cleanup.
8. MutationObserver inspects added nodes and only `src` attribute mutations for targeted iframe cleanup; it never periodically rescans the full document.

## New-window behavior

Kaylane TV is intentionally single-window.

A website may call `window.open()` as a side effect of pressing Play. Kaylane TV now ignores that request completely instead of recycling the destination into the current WebView. The guard returns the current `window` object only as a truthy compatibility value so basic popup-blocker detection does not break the page's inline Play behavior.

Explicit links/forms that request a second browsing context are also consumed and ignored. Same-window navigation is not rewritten.

## URL / hostname safety

The policy:
- resolves relative and protocol-relative popup URLs only against a valid HTTPS opener;
- rejects malformed/empty URLs and malformed/non-HTTPS opener URLs;
- blocks cleartext HTTP;
- blocks external/custom schemes for top-level navigation (`javascript:`, `data:`, `blob:`, `mailto:`, `tel:`, `intent:` and unknown schemes);
- normalizes hostname case and trailing dots;
- uses exact-or-dot-boundary suffix matching, never substring matching;
- therefore rejects lookalikes such as `notdoubleclick.net` and `doubleclick.net.evil.example`;
- lets the platform URL parser canonicalize Unicode hostnames to their normal URL representation before hostname rules are evaluated.

## Message bridge

`parsePageGuardMessage()` treats page messages as untrusted input. It:
- accepts only the navigation-intent message type;
- accepts only `window.open` / `blank-target` sources;
- requires a boolean `userInitiated` value;
- requires a valid HTTPS opener;
- rejects empty or oversized URLs and oversized bridge payloads;
- rejects malformed JSON and array payloads.

Bridge validation is not an authorization boundary: page JavaScript already controls its own current-document navigation. Native policy still rejects unsafe schemes and known blocked destinations before a message can cause same-window navigation.

## DOM cleanup / playback compatibility

The generic guard removes only iframes whose resolved hostname matches the explicit blocked-ad host set. It does **not** remove arbitrary third-party iframes and does not inspect/rewrite media playlists, DRM, authentication, stream authorization, subtitles or CDN traffic.

Generic overlay/fake-play-button removal is intentionally avoided because visual heuristics can destroy legitimate video controls. Add cosmetic rules only when a specific site/ad element is proven safe to remove.

SPA routing and the History API are intentionally left alone. They do not create a second browser context and interfering with them would break modern sites.

## Performance

The page guard is idempotent and installs one set of listeners plus one MutationObserver. There is:
- no `setInterval` polling;
- no animation-frame work;
- no permanent whole-document scan;
- one initial targeted `iframe[src]` scan;
- incremental work only for newly added nodes and relevant `src` mutations.

The blocked-host list remains intentionally small and is not evaluated against every network request.

## Integration contract

Agent A / Lead integration code must:
- create `createPageGuardScript()` once and inject it through `injectedJavaScriptBeforeContentLoaded`;
- keep `window.open` and explicit new-context navigation as no-op behavior inside the injected guard;
- do not recycle popup/new-tab destinations into the current WebView;
- wire `onShouldStartLoadWithRequest` to `shouldAllowWebViewNavigation(request.url)` so page/server redirects cannot bypass the top-level policy;
- never use `BLOCKED_AD_NAVIGATION_HOSTS` as a blanket network/subresource denylist.

Physical Vega hardware validation remains mandatory for injection timing, Fire TV Enter/OK semantics, fullscreen controls, Movix/Dofuz playback and repeated-navigation stability.


## Physical Fire TV hardening: same-tab ad redirects

Physical testing showed two additional popup/ad patterns:

1. a site calls `window.open()`, receives a truthy value, then assigns to the returned object's `location`; and
2. a primary page attempts to leave Movix/Dofuz in the current tab through an ordinary link, form, or scripted Navigation API transition.

Kaylane TV now returns an isolated popup stub rather than the real `window`. Writes such as `popup.location.href = ...`, `assign()`, or `replace()` remain inside the stub and cannot redirect the only WebView.

On a primary Movix/Dofuz top document, explicit same-tab escapes to unrelated HTTPS hosts are consumed. This guard is scoped to the frame's own hostname, so third-party player/media iframes are not globally denied. Known nuisance hosts remain blocked independently.

When Chromium's Navigation API is available, the guard also cancels matching scripted top-level transitions. This closes the `location`/scripted-navigation path without adding polling.
