import {useEffect, useRef} from 'react';
import {BackHandler} from 'react-native';

import {
  decideBackAction,
  shouldSuppressRepeatedBackPress,
} from './backPolicy';

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
  const controllerRef = useRef(controller);
  const lastHandledBackAtRef = useRef<number | null>(null);

  // Keep the listener stable for the lifetime of the mounted shell while
  // always reading the latest navigation state/callbacks.
  controllerRef.current = controller;

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        const current = controllerRef.current;
        const action = decideBackAction({
          overlayOpen: current.overlayOpen,
          canGoBack: current.canGoBack,
          isAtHome: current.isAtHome,
        });

        const now = Date.now();

        // Fire TV key-repeat can deliver multiple Back events before or just
        // after React commits the first state transition. Consume that tiny
        // burst so one press cannot dismiss an overlay, navigate, then exit.
        if (
          shouldSuppressRepeatedBackPress(
            lastHandledBackAtRef.current,
            now,
          )
        ) {
          return true;
        }

        if (action === 'system-default') {
          lastHandledBackAtRef.current = null;
          return false;
        }

        lastHandledBackAtRef.current = now;

        switch (action) {
          case 'dismiss-overlay':
            current.dismissOverlay();
            return true;
          case 'webview-back':
            current.goBack();
            return true;
          case 'go-home':
            current.goHome();
            return true;
        }
      },
    );

    return () => subscription.remove();
  }, []);
};
