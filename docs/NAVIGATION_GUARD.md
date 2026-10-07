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

1. `window.open` is neutralized before it can create a new context.
2. New-context anchor clicks (`_blank`, `_new`, named targets, `rel=external`) are captured and reported to native code.
3. New-context form targets are forced into `_self`, including direct `form.submit()` calls.
4. Dynamic `<base target>` values that would create a second context are normalized to `_self`.
5. Native policy decides allow / same-window / block for navigation intents.
6. Vega `onShouldStartLoadWithRequest` must apply `shouldAllowWebViewNavigation()` so JS redirects, `location.assign`, `location.replace`, `top.location`, `parent.location`, ordinary link navigation and server redirects cannot bypass the native policy.
7. A small ad-host set is used only for nuisance navigation and targeted blocked-iframe cleanup.
8. MutationObserver inspects added nodes and only `src`/`target` attribute mutations; it never periodically rescans the full document.

## Trusted gesture model

A popup attempt within 1200 ms of a real browser pointer or Enter/Space interaction is considered user-initiated. New-context link clicks additionally use `event.isTrusted`, so a programmatic `element.click()` is not automatically promoted to a trusted popup.

Trusted third-party popups may be reused in the current WebView because legitimate players can live on third-party origins. A known blocked-ad destination is still denied even when a popup claims a trusted gesture.

Untrusted popups are allowed into the current WebView only when they target a primary Kaylane TV host or the exact same origin as the opener. Other untrusted third-party popups are denied.

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
- one initial targeted `iframe[src]` / `base[target]` scan;
- incremental work only for newly added nodes and relevant `src` / `target` mutations.

The blocked-host list remains intentionally small and is not evaluated against every network request.

## Integration contract

Agent A / Lead integration code must:
- create `createPageGuardScript()` once and inject it through `injectedJavaScriptBeforeContentLoaded`;
- pass WebView `onMessage` payloads through `parsePageGuardMessage`;
- call `decideTopLevelNavigation` for valid popup/new-context messages;
- for `same-window`, navigate the existing WebView only;
- for `block`, keep the current page and optionally show lightweight feedback;
- wire `onShouldStartLoadWithRequest` to `shouldAllowWebViewNavigation(request.url)` so page/server redirects cannot bypass the top-level policy;
- never use `BLOCKED_AD_NAVIGATION_HOSTS` as a blanket network/subresource denylist.

Physical Vega hardware validation remains mandatory for injection timing, Fire TV Enter/OK semantics, fullscreen controls, Movix/Dofuz playback and repeated-navigation stability.
