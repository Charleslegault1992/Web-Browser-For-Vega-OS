# Git / PR Workflow

## Rule zero

The bootstrap README commit is the only planned direct initialization commit on `main`. From this point forward, meaningful work is done through pull requests.

## Planned sequence

### PR 1 — Project foundation
Branch: `chore/project-foundation`
Scope:
- AGENTS.md;
- architecture/requirements/workflow docs;
- validator rules;
- PR template.

### PR 2 — Agent A: Vega application shell
Branch from merged PR 1.
Scope:
- Vega RN 0.83 scaffold;
- WebView 4.x dependency;
- `manifest.toml`;
- app entry point and baseline build scripts;
- black loading background / preferred WebView focus.

### PR 3 — Agent B: navigation + popup/ad guard
Branch from the same fresh `main` as PR 2.
Scope:
- rule model;
- popup/new-window neutralization;
- safe current-tab redirect;
- conservative blocker hooks;
- tests for URL/hostname policy.

### PR 4 — Agent C: remote + TV UX
Branch from the same fresh `main` as PR 2/3.
Scope:
- remote/back behavior;
- home/loading/error surfaces;
- focus management;
- fullscreen/media interaction helpers;
- TV readability.

### Validator pass
Agent D reviews each PR independently and then performs an integration review after merges/rebase.

## Merge order

Preferred:
1. PR 2 shell;
2. rebase PR 3 and PR 4 on updated `main`;
3. merge PR 3 after blocker tests;
4. rebase PR 4 again if needed;
5. merge PR 4;
6. integration QA PR for fixes discovered by Validator.

## Merge gates

Do not merge a feature PR with:
- unresolved blocker;
- merge conflict;
- missing required tests;
- known playback regression;
- unbounded performance issue;
- changes outside assigned scope without explanation.
