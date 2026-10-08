import {
  DEFAULT_BACK_DEBOUNCE_MS,
  decideBackAction,
  shouldSuppressRepeatedBackPress,
} from '../backPolicy';

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

  it('closes an overlay even if home and WebView history are stale', () => {
    expect(
      decideBackAction({
        overlayOpen: true,
        canGoBack: true,
        isAtHome: true,
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

  it('still asks WebView history when native canGoBack is false', () => {
    expect(
      decideBackAction({
        overlayOpen: false,
        canGoBack: false,
        isAtHome: false,
      }),
    ).toBe('webview-back');
  });

  it('lets Vega handle Back from home', () => {
    expect(
      decideBackAction({
        overlayOpen: false,
        canGoBack: false,
        isAtHome: true,
      }),
    ).toBe('system-default');
  });

  it('lets Vega handle Back from home even with stale canGoBack=true', () => {
    expect(
      decideBackAction({
        overlayOpen: false,
        canGoBack: true,
        isAtHome: true,
      }),
    ).toBe('system-default');
  });
});

describe('shouldSuppressRepeatedBackPress', () => {
  it('does not suppress the first handled Back press', () => {
    expect(shouldSuppressRepeatedBackPress(null, 1_000)).toBe(false);
  });

  it('suppresses key-repeat inside the debounce window', () => {
    expect(
      shouldSuppressRepeatedBackPress(
        1_000,
        1_000 + DEFAULT_BACK_DEBOUNCE_MS - 1,
      ),
    ).toBe(true);
  });

  it('allows the next intentional Back at the debounce boundary', () => {
    expect(
      shouldSuppressRepeatedBackPress(
        1_000,
        1_000 + DEFAULT_BACK_DEBOUNCE_MS,
      ),
    ).toBe(false);
  });

  it('suppresses browser-to-home key-repeat spillover before system Back', () => {
    expect(shouldSuppressRepeatedBackPress(1_000, 1_100)).toBe(true);
  });

  it('does not suppress when the clock moves backwards', () => {
    expect(shouldSuppressRepeatedBackPress(2_000, 1_000)).toBe(false);
  });

  it('can disable debounce without changing Back policy', () => {
    expect(shouldSuppressRepeatedBackPress(1_000, 1_001, 0)).toBe(false);
  });
});
