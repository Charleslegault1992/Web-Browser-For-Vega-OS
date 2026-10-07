import {decideBackAction} from '../backPolicy';

describe('decideBackAction', () => {
  it('closes overlays before changing page history', () => {
    expect(
      decideBackAction({
        overlayOpen: true,
        canGoBack: true,
        isAtHome: false,
      }),
    ).toBe('dismiss-overlay');
  });

  it('uses WebView history before returning home', () => {
    expect(
      decideBackAction({
        overlayOpen: false,
        canGoBack: true,
        isAtHome: false,
      }),
    ).toBe('webview-back');
  });

  it('returns to app home when history is empty', () => {
    expect(
      decideBackAction({
        overlayOpen: false,
        canGoBack: false,
        isAtHome: false,
      }),
    ).toBe('go-home');
  });

  it('lets the system exit from the home screen', () => {
    expect(
      decideBackAction({
        overlayOpen: false,
        canGoBack: false,
        isAtHome: true,
      }),
    ).toBe('system-default');
  });
});
