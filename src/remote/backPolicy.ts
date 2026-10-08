export type BackState = {
  overlayOpen: boolean;
  canGoBack: boolean;
  isAtHome: boolean;
};

export type BackAction =
  | 'dismiss-overlay'
  | 'webview-back'
  | 'go-home'
  | 'system-default';

export const DEFAULT_BACK_DEBOUNCE_MS = 180;

export const decideBackAction = ({
  overlayOpen,
  canGoBack,
  isAtHome,
}: BackState): BackAction => {
  if (overlayOpen) {
    return 'dismiss-overlay';
  }

  // Home must always win over stale WebView history. This makes a rapid
  // browser -> home transition safe even if canGoBack has not reset yet.
  if (isAtHome) {
    return 'system-default';
  }

  // Do not trust Vega's canGoBack flag as the sole source of truth.
  // Promoted player/source navigations can have real DOM history while
  // native canGoBack is temporarily false. Always ask the WebView history
  // first; the page bridge will request Kaylane home only when history is
  // genuinely empty.
  void canGoBack;
  return 'webview-back';
};

export const shouldSuppressRepeatedBackPress = (
  lastHandledAtMs: number | null,
  nowMs: number,
  debounceMs = DEFAULT_BACK_DEBOUNCE_MS,
): boolean => {
  if (
    lastHandledAtMs === null ||
    debounceMs <= 0 ||
    !Number.isFinite(lastHandledAtMs) ||
    !Number.isFinite(nowMs) ||
    nowMs < lastHandledAtMs
  ) {
    return false;
  }

  return nowMs - lastHandledAtMs < debounceMs;
};
