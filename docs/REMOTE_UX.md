# Fire TV Remote / UX

## Navigation principle

Vega WebView already provides spatial DPAD navigation by default. Kaylane TV should preserve that behavior and add custom focus logic only for site-specific failures.

## App-level Back order

1. Close native overlay/menu.
2. If WebView history can go back, call WebView back.
3. Otherwise return to Kaylane TV home.
4. From Kaylane TV home, return `false` from the BackHandler so Vega performs the normal system back/exit behavior.

## Web-page Back events

`allowSystemKeyEvents` must be used carefully. When enabled, Vega WebView consumes the Back key after receiving it, even if page JavaScript does nothing with it. Therefore the initial integration should keep app-level Back ownership unless a site specifically requires page-level Back handling.

## Focus

- First native home destination receives preferred TV focus.
- Focused controls use a visible high-contrast border and small scale change.
- No focus polling.
- No custom global arrow-key interception unless a site proves incompatible with WebView spatial navigation.

## Media

Keep `allowsDefaultMediaControl={true}` for the initial integration so standard page media sessions can cooperate with Fire TV transport controls.
