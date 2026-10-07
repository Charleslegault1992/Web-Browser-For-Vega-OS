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

export const useBrowserBackHandler = (
  controller: BrowserBackController,
): void => {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        const action = decideBackAction(controller);

        switch (action) {
          case 'dismiss-overlay':
            controller.dismissOverlay();
            return true;
          case 'webview-back':
            controller.goBack();
            return true;
          case 'go-home':
            controller.goHome();
            return true;
          case 'system-default':
            return false;
        }
      },
    );

    return () => subscription.remove();
  }, [controller]);
};
