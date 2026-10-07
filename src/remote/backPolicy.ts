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

export const decideBackAction = ({
  overlayOpen,
  canGoBack,
  isAtHome,
}: BackState): BackAction => {
  if (overlayOpen) {
    return 'dismiss-overlay';
  }

  if (canGoBack) {
    return 'webview-back';
  }

  if (!isAtHome) {
    return 'go-home';
  }

  return 'system-default';
};
