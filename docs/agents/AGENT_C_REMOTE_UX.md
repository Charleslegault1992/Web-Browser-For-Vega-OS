# Agent C — Remote / Focus / TV UX

## Goal
Make Kaylane TV feel purpose-built for a Fire TV remote.

## Branch
`feat/agent-c-remote-ux`

## Required work
- Implement predictable Back behavior around WebView history.
- Keep focus visible and recoverable.
- Ensure home/start/loading/error UI is navigable by DPAD.
- Avoid stealing focus from active video controls.
- Add TV-scale spacing/text.
- Add lightweight user feedback when navigation is blocked or a page fails.
- Document physical-device smoke tests.

## Principles
Prefer Vega/WebView's built-in spatial navigation. Add custom DOM focus code only when necessary and keep it site-scoped.

## Do not
- duplicate Agent B's URL/blocking rules;
- add continuous focus polling;
- break fullscreen playback to keep app chrome visible.

## Acceptance
Core journeys can be completed using only the Fire TV remote with no mouse/touch dependency.
