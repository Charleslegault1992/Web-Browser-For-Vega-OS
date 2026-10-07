# Building Kaylane TV

## Baseline

Kaylane TV targets the current Vega SDK 0.24 line:
- Vega OS 1.2 minimum and target;
- React Native 0.83.0;
- React 19.2.0;
- `@amazon-devices/webview` 4.0.2-compatible releases;
- Node.js 22.14.0 or newer on the Node 22 line.

For a physical Vega Fire TV, build/install the `armv7` VPKG. The Vega Virtual Device uses the architecture of the development host instead.

## Required host environment

Use a supported Vega SDK host. Ubuntu 24.04 x86_64 is supported and is the recommended path for this project. Windows and WSL are not supported for the full Vega Developer Tools workflow.

## First setup

From the repository root:

```bash
nvm use
vega --version
vega project install --fix
npm install
npm run validate:static
npm test
npm run typecheck
npm run doctor
```

`vega project install --fix` resolves compatible `@amazon-devices/*` package versions into `package.json`; `npm install` performs the actual install. Review any package-version diff produced by the Vega command before committing it.

The repository intentionally does not fabricate a `package-lock.json`. Generate the lockfile from the authenticated Vega/npm environment and commit the resulting lockfile once dependency resolution succeeds.

## Builds

Build both configurations before integration:

```bash
npm run build:debug
npm run build:release
```

For the physical Fire TV, validate the generated ARM package before installation:

```bash
vega exec vpt validate build/armv7-release/kaylanetv_armv7.vpkg
vega exec vpt info build/armv7-release/kaylanetv_armv7.vpkg --json
vega device install-app --packagePath build/armv7-release/kaylanetv_armv7.vpkg
vega device launch-app --appName com.kaylanetv.browser.main
```

If the generated artifact name differs, use the actual `armv7` VPKG path printed by the build.

## Metro and debugging

Normal development:

```bash
npm start
```

After dependency or bundler changes:

```bash
npm start -- --reset-cache
```

On the RN 0.83 track, use React Native DevTools. Vega SDK 0.24 does not support Chrome DevTools for React Native 0.83.

## WebView / security validation

The shell is deliberately HTTPS-first:
- no `network-traffic-policy.cleartext` manifest entry;
- `mixedContentMode="never"`;
- recoverable SSL errors are explicitly cancelled;
- background WebView JavaScript is disabled;
- production builds do not emit the shell's WebView diagnostics.

Vega SDK 0.24 has a known native Cookie Manager limitation: native Cookie Manager `set`, `get`, and `clear` operations are not initialized in this release. Kaylane TV does not depend on those native APIs. Validate normal site cookie/session behavior directly in WebView on the target Fire TV.

## Physical Fire TV smoke tests required

Before merge/release, validate all of the following on a Vega OS 1.2 Fire TV:

1. Cold launch reaches the WebView without a white flash and initial focus is usable.
2. `https://movix.luxe/` and `https://dofuz.com/` load over HTTPS.
3. Normal cookies/session state and DOM storage behave as required by each site.
4. Video starts after a user action, audio/video remain synchronized, fullscreen remains usable, and default media transport controls work.
5. DPAD, Select and Back behavior pass Agent C's remote smoke tests.
6. Network loss does not crash the app; reconnect/retry behavior is validated with the integrated Agent C error UI.
7. Background/foreground transitions do not leave audio, video, focus or the WebView in a broken state.
8. Repeated navigation and at least one extended playback session do not show unbounded CPU, memory, listener, timer or React-render growth.
9. Release logging remains quiet and no browsing URL/credential data is logged by the native shell.
10. App relaunch after OS/app termination is clean. Vega WebView 4.0.2 documentation does not expose a render-process-crash callback in its documented component API, so do not add undocumented Android WebView crash callbacks as a substitute.

## Scope note

Navigation/ad suppression belongs to Agent B. DPAD/Back/error overlays and final playback UX belong to Agent C. This shell only provides the native/WebView baseline needed by those layers.
