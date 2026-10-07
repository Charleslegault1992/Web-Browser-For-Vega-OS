# Project Status

## Current phase

The final Agent A, B and C snapshots have been synchronized into draft PR #5. The project is now ready for authenticated Vega SDK 0.24 validation on Ubuntu 24.04 and then physical Fire TV testing.

## Pull request map

- PR #1 — project foundation: merged.
- PR #2 — Agent A Vega/native shell: final static audit complete; blocked only on Vega/hardware gates.
- PR #3 — Agent B navigation/popup/ad guard: final pure-policy audit complete; blocked only on integrated Vega/hardware gates.
- PR #4 — Agent C Fire TV remote/UX: final pure-policy audit complete; blocked only on integrated Vega/hardware gates.
- PR #5 — Lead integration MVP: synchronized to latest Agent A base plus final Agent B/C files; remains draft.

## Integrated hardening

- React Native 0.83 / React 19.2 / WebView 4.0.2.
- Vega OS 1.2 manifest/runtime-module.
- Required renderer, network, input, media and audio wiring.
- WebView media-provider metadata.
- HTTPS-only top-level policy and mixed-content disabled.
- SSL errors fail closed.
- Single-WebView popup/new-context handling.
- Server/JS/native navigation request guard.
- Relative/protocol-relative popup normalization.
- Named target, base target and form target handling.
- Bounded MutationObserver.
- Remote-first Home with deterministic focus restoration.
- Back key-repeat protection.
- Fatal main-frame error screen with Retry/Home.
- Loading and transient blocked-navigation feedback.
- No global third-party media blocking.
- No polling/per-frame focus or DOM processing.

## Immediate gates

Run on Ubuntu 24.04:

1. install Vega SDK 0.24;
2. authenticate required Amazon package access;
3. checkout `feat/integration-browser-mvp`;
4. run `scripts/validate-vega.sh`;
5. review and commit the generated `package-lock.json` if dependency resolution is clean;
6. validate Release VPKG with VPT/Strict ABI;
7. install on the physical Vega Fire TV;
8. execute the full hardware matrix.

Do not merge runtime PRs until these gates pass.
