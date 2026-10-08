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


## Overlay-ad cleanup after physical playback testing

Some nuisance ads do not navigate away immediately. Instead they insert a high-z-index fixed/absolute overlay above the active video and intercept the next remote click.

On Movix/Dofuz top pages, Kaylane TV now removes only overlay candidates that are:
- large enough to cover a meaningful portion of the viewport;
- fixed/sticky/absolute with a high z-index;
- outside the active fullscreen tree;
- not a video/audio container;
- tied to a known blocked host or an external escape link.

The cleanup runs on the initial document and on bounded added-node / src / href / style / class mutations. It does not use polling and it does not globally delete third-party player iframes.


## Playback modal shield

Physical Fire TV testing showed a second ad pattern: pressing Play can inject small or medium modal layers directly over the video without navigating away.

Kaylane TV now arms an event-driven playback shield around player interaction.

The shield is armed:
- immediately before Pointer-mode OK activation;
- when a click targets video/audio/iframe/player-like content;
- when HTML5 media emits a play event.

While armed, the guard removes newly-added modal-like layers that are fixed/sticky/absolute and visually capable of covering playback. It detects semantic dialogs, aria-modal layers, popup/interstitial/ad/promo markers, and generic high-z overlays that are not part of player controls.

The shield is intentionally bounded and optimized:
- default click window: 20 seconds;
- play event can extend protection to 45 seconds;
- no setInterval or permanent polling;
- MutationObserver only reacts to added nodes and relevant src/href/style/class/open/role/aria-modal/aria-hidden changes;
- modal scans are capped at 40 candidates per pass.

Human-verification surfaces are preserved by explicit captcha / Turnstile / hCaptcha / reCAPTCHA / challenge / verification signals. The shield does not solve or bypass those challenges.

While the shield is active, blocking JavaScript alert/confirm/prompt dialogs are also suppressed so they cannot cover or freeze playback.


## Small playback modal suppression (physical-device follow-up)

A later Fire TV capture showed a smaller circular ad modal with a close X sitting over the video. The previous shield focused mostly on large or semantically-labelled overlays, so compact ad widgets could still survive.

Playback shield v10 now treats newly-added or newly-shown overlay nodes more aggressively while the shield is armed:

- any newly-added fixed/sticky/absolute overlay covering at least about 1.2% of the viewport can be removed even without a useful z-index;
- attribute changes that reveal a previously hidden overlay are treated the same way;
- descendants of a newly-added wrapper are scanned with a strict cap of 60 candidates;
- real video/audio nodes, fullscreen content, verification widgets, player controls, and containers holding a large real player iframe remain protected;
- no polling is added.

This specifically targets compact pop-over ads and circular/card modals that appear immediately after pressing Play.

## Browser Back history source of truth

Vega's native canGoBack value can temporarily report false after player/source promotion even though the WebView still has real browser history.

While browsing, Back now always asks the page's DOM history first:

- if window.history.length > 1, Kaylane TV runs window.history.back();
- only when DOM history is genuinely empty does the page bridge tell the native app to return to Kaylane TV home.

This keeps Back inside Dofuz/Movix/player history so the user can return to the previous source selector instead of jumping straight to the Kaylane home screen.


## Movix source-selector regression guard

Physical testing after the small-modal shield showed that Movix's legitimate source/player selector could be mistaken for an ad overlay. The shield was arming too early on generic player/video wrapper classes and the aggressive added-node cleanup could remove legitimate source UI before playback started.

The guard now separates source selection from playback protection:

- on Movix/Dofuz primary pages, the playback shield arms from real video/audio/iframe interaction, not from generic player/video wrapper class names;
- source/server/serveur/mirror/provider/quality/language/episode/saison/lecteur surfaces are explicitly preserved;
- compact multi-option panels with 2–24 local interactive choices are preserved when they do not contain blocked-host or external-escape links;
- generic aggressive removal on primary pages requires actual media presence or ad/external-navigation evidence;
- promoted third-party player pages keep the stronger aggressive modal cleanup.

This restores source selection and player opening on Movix without backing out the stronger ad-modal protections used once playback is genuinely active.


## Movix source click must win over iframe promotion

A physical-device regression showed that the pointer's iframe promotion heuristic was inspecting every element under the pointer with elementsFromPoint(). Movix can render the Source control visually above the player iframe, so the heuristic saw the iframe underneath the visible Source button and isolated the player instead of clicking Source.

Pointer v6 changes that contract:

- short OK always clicks the single topmost element returned by elementFromPoint();
- short OK never auto-promotes an iframe found underneath another control;
- player isolation remains available only through the explicit browser-menu action "Ouvrir le lecteur dans Kaylane TV";
- explicit isolation still arms the playback modal shield.

This lets Source / server controls overlay the player normally without being hijacked by iframe promotion.

## Fake verification / QR ad distinction

A later Fire TV screenshot showed an ad pretending to be a "Confirm you're not a robot" QR verification, with another promotional card layered in front. The previous guard preserved generic verify/human/challenge text to avoid breaking real verification, which allowed this fake ad to survive.

The guard now preserves verification only when there is strong provider evidence:
- Cloudflare Turnstile / challenges.cloudflare.com;
- Google reCAPTCHA paths / recaptcha.net;
- hCaptcha / hcaptcha.com;
- corresponding strong DOM markers such as cf-turnstile, recaptcha, and hcaptcha.

Generic phrases such as "verify", "human", or "not a robot" are no longer sufficient to whitelist a modal.

Obvious QR robot-check ads (for example text combining scan + QR with not-a-robot / confirm / phone language) are removed even outside the aggressive playback-modal path. Closeable modal cards tied to blocked/ad external destinations are also removed.

This does not bypass a real CAPTCHA or verification challenge; trusted verification providers remain intact for manual completion.


## No-modal policy + Dofuz bootstrap performance

Physical testing showed two remaining problems:

- robot / human-verification overlays could still cover playback;
- Dofuz could stall on its three-dot loader after the increasingly aggressive mutation cleanup.

The current policy is intentionally simpler:

- no robot / human-verification modal is exempt anymore;
- dialog / alertdialog / aria-modal / modal / popup / interstitial UI is removed when it appears, except legitimate Movix/Dofuz source-selection UI;
- on promoted/non-primary player pages, modal/captcha/turnstile/recaptcha UI is pre-hidden with injected CSS before it can cover playback;
- JavaScript alert(), confirm(), and prompt() are always neutralized so they can never block the TV UI.

This does not solve or bypass a verification challenge. It simply refuses to show that source's modal; another source can be selected.

To prevent the guard itself from starving Dofuz's SPA:

- MutationObserver work is queued into a Set and processed once per requestAnimationFrame;
- mutation queue size is capped at 80;
- always-on modal scans are capped at 32 candidates;
- playback subtree scans are capped at 40 candidates;
- deep playback/ad scans do not run while the primary page is merely bootstrapping;
- blocked iframe cleanup remains bounded.

The result should be a responsive Dofuz homepage while still enforcing a strict no-modal playback experience.


## Recurring cross-origin popup iframe quarantine

Physical Fire TV testing showed a remaining case where a white QR/robot ad is rendered inside a cross-origin iframe. From the parent page, the close X is not visible as a DOM button; the only hit-test result is the iframe itself. The previous pointer logic therefore treated that click as "open/isolate this player".

The guard now has an iframe-popup quarantine path:

- pointer OK in the top-right close zone of a topmost iframe asks the guard to dismiss that iframe instead of promoting it;
- dismissed popup frames are remembered by HTTPS origin + path signature;
- if the site recreates the same popup 2–3 seconds later, the MutationObserver removes the repeated frame automatically;
- dismissing a popup or running the manual cleanup arms a 15-second event-driven purge window for delayed reinsertion;
- the manual **Fermer toutes les fenêtres** pass now includes iframe[src] and iframe[data-src] candidates, not only DOM nodes with modal/popup class names;
- video-shaped iframes (large 16:9-ish surfaces) are protected from generic purge heuristics unless the user explicitly hits their close-corner path.

This remains event-driven: there is no polling timer and no repeated background scan.


## Visual-stack popup removal above the real player

A later Fire TV test showed that semantic popup detection was still insufficient for a QR/robot overlay. The important clue was that Selection mode could focus the real video behind the white popup, proving the popup was a separate visual layer stacked over the actual player.

The guard now uses browser visual stacking rather than class names alone:

- `document.elementsFromPoint(x, y)` inspects the full top-document layer stack at a screen coordinate;
- if a non-player layer is above a real `video`, player control surface, or large player iframe, that top layer is treated as an obstruction;
- pointer OK asks the guard to remove that obstruction before trying iframe promotion;
- iframe overlays are quarantined when removed;
- **Fermer toutes les fenêtres** performs a bounded 30-point viewport sweep, up to three passes, to find opaque layers above the player even when they have no modal/popup/captcha class or readable text;
- recurring iframe reinsertion is caught by the existing quarantine + mutation observer path.

For performance, the expensive iframe stack test only runs automatically while playback protection or a manual popup-purge window is active. Dofuz bootstrap does not pay this cost.

This is designed for exactly the case where the parent page cannot inspect the ad iframe's internal X button, but can still see that the iframe is visually stacked above the real player.
