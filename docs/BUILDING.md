# Building Kaylane TV

## Baseline

The project targets:
- Vega SDK 0.24 line;
- Vega OS 1.2 minimum/target;
- React Native 0.83;
- Vega WebView 4.0.2.

## Required host environment

Amazon's current Vega tooling supports Mac or Linux for the full development toolchain. Windows/WSL is not currently supported for Vega Developer Tools.

## First setup

From the repository root:

```bash
vega project install --fix
npm install
vega project doctor
npm run typecheck
npm run build
```

If Amazon package authentication is required by your environment, refresh/configure the Vega npm registry before `npm install`.

## Run / validation

Use Vega Studio or Vega CLI to install the generated VPKG on:
1. a Vega Virtual Device for early functional work where supported;
2. a physical Vega Fire TV device for final remote, playback, performance and certification validation.

## Security baseline

No cleartext HTTP policy is declared in `manifest.toml`, so WebView 4.0.2 keeps HTTP blocked by default. Kaylane TV starts with HTTPS only.
