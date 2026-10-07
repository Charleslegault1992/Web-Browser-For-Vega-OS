# Agent A — Vega Shell / Native Integration

## Goal
Produce the smallest production-grade Vega OS shell that can safely host the Kaylane TV browser.

## Branch
`feat/agent-a-vega-shell`

## Required work
- Build against current project baseline: React Native 0.83 + Vega WebView 4.x.
- Add the Vega project files and TypeScript configuration.
- Add `manifest.toml` with required OS version metadata.
- Ensure the WebView renderer service/dependencies required by Vega are declared.
- Use a black background to avoid white flashes.
- Give the WebView preferred initial TV focus.
- Enable JavaScript and DOM storage needed by modern streaming sites.
- Keep HTTP cleartext disabled unless a later requirement proves it necessary.
- Expose clean hooks/interfaces for navigation policy and injected page guard without implementing Agent B's rules.

## Do not
- add ad-host lists;
- create site-specific hacks;
- bypass DRM/access controls;
- own the final remote focus algorithm.

## Acceptance
A clean build scaffold exists and App.tsx can load a configurable HTTPS URL in a focused WebView.
