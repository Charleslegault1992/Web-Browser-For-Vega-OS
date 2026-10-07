# Navigation / Popup Guard

## Principle

Kaylane TV blocks nuisance **top-level navigation** and popup behavior without turning the app into a blanket network filter.

That distinction is important because streaming pages commonly use third-party origins for:
- video;
- manifests;
- subtitles;
- CDNs;
- embedded players.

## Layers

1. `window.open` is neutralized before it can create a new context.
2. `target="_blank"` clicks are captured and reported to native code.
3. Native policy decides allow / same-window / block.
4. A small ad-host set is used only for top-level nuisance destinations and blocked iframes.
5. MutationObserver inspects only newly-added nodes instead of rescanning the whole DOM.

## Trusted gesture model

A popup attempt within 1200 ms of a pointer or Enter/Space interaction is considered user-initiated. It may be opened in the current WebView if the URL passes scheme/host policy.

## Integration contract

Agent A / integration code must:
- inject `createPageGuardScript()` through `injectedJavaScriptBeforeContentLoaded`;
- pass WebView `onMessage` payloads through `parsePageGuardMessage`;
- call `decideTopLevelNavigation`;
- for `same-window`, navigate the existing WebView to that URL;
- for `block`, keep the current page and optionally show lightweight feedback.

Do not apply `BLOCKED_AD_NAVIGATION_HOSTS` as a global subresource denylist.
