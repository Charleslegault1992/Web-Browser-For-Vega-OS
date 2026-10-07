# Kaylane TV — Product Requirements

## Core experience

Kaylane TV is a single-window TV browser for Vega OS.

Initial high-priority destinations:
- `https://movix.luxe/`
- `https://dofuz.com/`

The app must behave like a TV-first browser rather than a touch-first mobile browser.

## Required behavior

### Browsing
- Launch quickly into a simple home/start experience.
- Load HTTPS pages in a Vega WebView.
- Keep cookies and DOM storage available where required for normal site behavior.
- Keep browsing in one app window.

### Popup and new-tab suppression
- Prevent sites from opening extra app/browser windows.
- Intercept `window.open` and link targets such as `target="_blank"`.
- When a destination is considered safe and user-initiated, open it in the current WebView instead of a new tab.
- Deny known unwanted ad/pop-under destinations.

### Ad suppression
Use layered, conservative blocking:
1. navigation-level deny rules for obvious ad/pop-under hosts;
2. early page injection to neutralize popup primitives;
3. targeted DOM cleanup for common overlays/iframes;
4. optional per-site compatibility rules when generic rules would break playback.

Blocking must be bounded and must avoid large continuous DOM scans.

### Streaming compatibility
- Do not tamper with DRM.
- Do not rewrite or proxy media streams.
- Do not globally block third-party media/CDN hosts.
- Preserve standard HTML5 video playback and legitimate embedded players where Vega WebView supports them.
- Site-specific blockers must be tested against playback before merge.

### Remote control
- DPAD navigation must remain predictable.
- Select/OK must activate the focused control/link.
- Back first navigates WebView history when appropriate; otherwise exits/returns to app UI according to the final UX.
- Focus must remain visible.
- Fullscreen video controls must remain usable by remote.

## Performance targets

Design targets, to be validated on physical Vega hardware:
- no unbounded polling loops;
- no per-frame DOM processing;
- no repeated reinjection when page state has not changed;
- minimal React Native re-renders during playback;
- blocking rules compiled/preprocessed once where possible;
- logging limited in production builds.

## Security and privacy

- HTTPS by default.
- Never silently proceed through SSL certificate errors.
- Never add code intended to defeat site authentication, DRM, subscriptions, or access controls.
- Do not collect browsing history or credentials unless a future requirement explicitly adds local user-facing history/bookmarks.
