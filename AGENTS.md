# AGENTS.md — Kaylane TV

This repository is developed with a strict multi-agent PR workflow.

## Mission

Build **Kaylane TV**, a high-performance browser-style app for Amazon Fire TV devices running **Vega OS**.

Primary use cases:
- browse TV-friendly websites with the Fire TV remote;
- support `https://movix.luxe/` and `https://dofuz.com/`;
- keep legitimate video playback working;
- suppress unwanted popups/new windows and common ad-driven navigation;
- make remote navigation, focus, Back, Select and playback controls feel native and reliable.

## Non-negotiable constraints

1. Target the current Vega SDK line (0.24 at project bootstrap) and React Native 0.83 unless an approved migration changes this.
2. Use `@amazon-devices/webview` for the browsing surface.
3. Never intentionally bypass DRM, authentication, paywalls, stream authorization, or site access controls.
4. Do not block legitimate video/media subresources merely because they are cross-origin.
5. Popups/new-window attempts must not create extra browser tabs/windows. Safe allowed destinations may be redirected into the current WebView; unwanted destinations are denied.
6. Remote control behavior is a first-class requirement, not an afterthought.
7. Avoid per-frame polling, unbounded DOM scans, noisy timers, and unnecessary JavaScript injection.
8. No feature work directly on `main`.
9. One concern per PR whenever practical.
10. A feature PR is not mergeable until Validator review reports no blocker.

## Team model

### Lead / integrator — ChatGPT
Owns architecture, task decomposition, conflict resolution, final review and merge decisions.

### Agent A — Vega shell / native integration
Primary ownership:
- project scaffold;
- `package.json`, Vega config, `manifest.toml`;
- root React Native app shell;
- WebView lifecycle;
- app startup/recovery;
- build/run documentation.

Avoid changing blocker rules or focus algorithms unless coordinated.

### Agent B — navigation / popup / ad suppression
Primary ownership:
- top-level navigation policy;
- `window.open` / target=`_blank` suppression;
- current-tab redirect behavior;
- ad/tracker rule engine;
- DOM cleanup strategy;
- per-site compatibility shims.

Do not implement DRM or stream interception.

### Agent C — Fire TV remote / UX / media behavior
Primary ownership:
- DPAD/focus behavior;
- Back-button behavior;
- loading/error overlays;
- TV-scale UI;
- video/fullscreen interaction;
- remote-focused smoke tests.

Avoid changing core navigation blocking rules unless coordinated.

### Agent D — Validator / QA
Must remain independent from feature implementation.
Responsibilities:
- inspect every PR diff;
- check overlap/regressions between agents;
- verify TypeScript/lint/tests where available;
- validate Vega manifest assumptions;
- review performance risks;
- review remote navigation behavior;
- explicitly report BLOCKER / MAJOR / MINOR findings;
- never approve by default.

## Branch naming

- `feat/agent-a-...`
- `feat/agent-b-...`
- `feat/agent-c-...`
- `qa/validator-...`
- `chore/...`
- `fix/...`

## PR protocol

Before coding:
1. fetch current `main`;
2. branch from the current `main` HEAD;
3. read this file and relevant docs;
4. declare files expected to change.

Before asking for merge:
1. summarize behavior;
2. list changed files;
3. list tests run and exact result;
4. call out anything not validated on physical Fire TV hardware;
5. ensure no unrelated formatting churn.

## Definition of done

A change is done only when:
- behavior matches the relevant requirement;
- failure paths are handled;
- remote control path is considered;
- no obvious streaming regression is introduced;
- performance is bounded;
- validator has no blocker;
- PR is mergeable against fresh `main`.
