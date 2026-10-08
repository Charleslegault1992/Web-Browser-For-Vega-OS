import {useCallback, useEffect, useRef} from 'react';
import {BackHandler} from 'react-native';
import {
  UserInputEvent,
  UserInputEventName,
  useAddUserInputListenerCallback,
} from '@amazon-devices/react-native-kepler';

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
  const addUserInputListenerCallback = useAddUserInputListenerCallback();

  controllerRef.current = controller;

  const handleBack = useCallback((): boolean => {
    const current = controllerRef.current;

    if (current.isAtHome) {
      lastHandledBackAtRef.current = null;
      return false;
    }

    const now = Date.now();

    if (
      shouldSuppressRepeatedBackPress(
        lastHandledBackAtRef.current,
        now,
      )
    ) {
      return true;
    }

    lastHandledBackAtRef.current = now;

    const action = decideBackAction({
      overlayOpen: current.overlayOpen,
      canGoBack: current.canGoBack,
      isAtHome: current.isAtHome,
    });

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
      case 'system-default':
        return false;
    }
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBack,
    );

    return () => subscription.remove();
  }, [handleBack]);

  useEffect(() => {
    if (controller.isAtHome) {
      return;
    }

    // WebView/fullscreen players can own the platform Back route before
    // React Native BackHandler gets it. Override Back only while browsing,
    // then route it through the exact same browser-history policy.
    const subscription = addUserInputListenerCallback(
      UserInputEventName.Back,
      (event: UserInputEvent) => {
        if (event.phase === 'PRESSED') {
          handleBack();
        }

        return true;
      },
    );

    return () => subscription.remove();
  }, [
    addUserInputListenerCallback,
    controller.isAtHome,
    handleBack,
  ]);
};
