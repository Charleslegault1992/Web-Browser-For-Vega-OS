# Agent B — Navigation / Popup / Ad Suppression

## Goal
Make browsing single-window and aggressively suppress nuisance navigation without breaking legitimate playback.

## Branch
`feat/agent-b-navigation-guard`

## Required work
- Implement normalized URL/hostname parsing.
- Implement explicit top-level navigation decision types.
- Intercept popup primitives as early as Vega WebView permits.
- Rewrite or intercept new-tab link behavior into same-window navigation when safe.
- Block known nuisance navigation through data-driven rules.
- Add bounded cosmetic cleanup helpers.
- Make all injected JavaScript idempotent.
- Add unit tests for domain matching, lookalike domains, allowed routes and denied routes.

## Critical compatibility rule
Do not treat every third-party hostname as an ad. Streaming sites commonly load media, players, subtitles and CDN assets cross-origin.

## Do not
- proxy or rewrite media playlists;
- defeat DRM;
- add perpetual full-DOM scanning;
- change unrelated native UX.

## Acceptance
Popup/new-window attempts cannot spawn another browser window, unwanted top-level ad redirects are blocked, and safe user navigation can stay in the current WebView.
