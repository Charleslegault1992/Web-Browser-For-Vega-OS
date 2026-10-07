# Kaylane TV — Integrated MVP

PR #5 is the integration branch for the final reviewed Agent A, B and C work.

## Runtime flow

1. App launches to the remote-first Kaylane TV home.
2. User selects Movix or Dofuz.
3. One Vega WebView is mounted with preferred TV focus.
4. Agent B's idempotent page guard is injected before content finishes loading.
5. New-window targets, popup calls and form targets are normalized into the current browsing context.
6. Native navigation policy blocks explicit nuisance destinations, unsafe schemes and insecure top-level HTTP.
7. Legitimate HTTPS destinations remain in the same WebView.
8. Agent C Back handling prioritizes transient notice -> WebView history -> Kaylane TV home -> Vega system default.
9. Main-frame load failures show a remote-focusable Retry/Home screen.
10. SSL failures cancel closed.

## Performance decisions

- No per-frame work.
- No permanent polling loop.
- One BackHandler subscription per mounted shell.
- One idempotent MutationObserver inspecting only added nodes and relevant attribute changes.
- Small explicit nuisance-host rule set.
- WebView source is memoized.
- Page guard is generated once.
- No playback-progress React state.
- No blanket third-party resource blocking.
- No periodic cache clearing or forced reload loop.

## Security / playback boundary

Kaylane TV does not bypass DRM, authentication, subscriptions, paywalls or stream authorization.

The blocker is intentionally conservative so third-party media players, CDNs and subtitles remain compatible unless a hostname is explicitly proven to be nuisance navigation.

## Remaining merge gates

PR #5 remains draft until all of these pass on the authenticated Ubuntu 24.04 Vega environment:

- Vega dependency resolution/install;
- static validation;
- Jest;
- TypeScript;
- Vega doctor;
- Debug VPKG build;
- Release VPKG build;
- VPT/Strict ABI validation;
- physical Vega Fire TV testing for Movix and Dofuz;
- popup/new-window stress tests;
- DPAD/Back/fullscreen/media transport checks;
- background/foreground and network-loss recovery;
- repeated navigation and extended playback stability.
