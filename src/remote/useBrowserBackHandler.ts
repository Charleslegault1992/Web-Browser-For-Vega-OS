import {useEffect} from 'react';
import {BackHandler} from 'react-native';

import {decideBackAction} from './backPolicy';

export type BrowserBackController = {
  overlayOpen: boolean;
  canGoBack: boolean;
  isAtHome: boolean;
  dismissOverlay: () => void;
  goBack: () => void;
  goHome: () => void;
};

export const useBrowserBackHandler = ({
  overlayOpen,
  canGoBack,
  isAtHome,
  dismissOverlay,
  goBack,
  goHome,
}: BrowserBackController): void => {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        const action = decideBackAction({
          overlayOpen,
          canGoBack,
          isAtHome,
        });

        switch (action) {
          case 'dismiss-overlay':
            dismissOverlay();
            return true;
          case 'webview-back':
            goBack();
            return true;
          case 'go-home':
            goHome();
            return true;
          case 'system-default':
            return false;
        }
      },
    );

    return () => subscription.remove();
  }, [
    overlayOpen,
    canGoBack,
    isAtHome,
    dismissOverlay,
    goBack,
    goHome,
  ]);
};
