import {useCallback, useEffect, useRef, useState} from 'react';
import {
  UserInputEvent,
  UserInputEventName,
  useAddUserInputListenerCallback,
} from '@amazon-devices/react-native-kepler';

export type WebPointerMode = 'pointer' | 'focus';

type Options = {
  active: boolean;
  inputEnabled: boolean;
  injectJavaScript: (script: string) => void;
};

const directionMap: ReadonlyArray<[UserInputEventName, string]> = [
  [UserInputEventName.Left, 'ArrowLeft'],
  [UserInputEventName.Right, 'ArrowRight'],
  [UserInputEventName.Up, 'ArrowUp'],
  [UserInputEventName.Down, 'ArrowDown'],
];

export const useWebPointerMode = ({
  active,
  inputEnabled,
  injectJavaScript,
}: Options) => {
  const addUserInputListenerCallback = useAddUserInputListenerCallback();
  const [mode, setModeState] = useState<WebPointerMode>('pointer');
  const modeRef = useRef<WebPointerMode>('pointer');

  const injectPointerApi = useCallback(
    (expression: string) => {
      injectJavaScript(
        `window.__KAYLANE_TV_POINTER_API__ && ${expression}; true;`,
      );
    },
    [injectJavaScript],
  );

  const setMode = useCallback(
    (nextMode: WebPointerMode, announce = true) => {
      modeRef.current = nextMode;
      setModeState(nextMode);
      injectPointerApi(
        `window.__KAYLANE_TV_POINTER_API__.setMode(${JSON.stringify(
          nextMode,
        )}, ${announce ? 'true' : 'false'})`,
      );
    },
    [injectPointerApi],
  );

  const activatePointer = useCallback(() => {
    if (modeRef.current !== 'pointer') {
      return;
    }

    injectPointerApi('window.__KAYLANE_TV_POINTER_API__.activate()');
  }, [injectPointerApi]);

  const syncMode = useCallback(() => {
    injectPointerApi(
      `window.__KAYLANE_TV_POINTER_API__.setMode(${JSON.stringify(
        modeRef.current,
      )}, false)`,
    );
    injectPointerApi('window.__KAYLANE_TV_POINTER_API__.refresh()');
  }, [injectPointerApi]);

  useEffect(() => {
    if (!active || !inputEnabled || mode !== 'pointer') {
      return;
    }

    const subscriptions = directionMap.map(([eventName, key]) =>
      addUserInputListenerCallback(eventName, (event: UserInputEvent) => {
        injectPointerApi(
          `window.__KAYLANE_TV_POINTER_API__.setDirection(${JSON.stringify(
            key,
          )}, ${event.phase === 'PRESSED' ? 'true' : 'false'})`,
        );
        return true;
      }),
    );

    return () => {
      subscriptions.forEach(subscription => subscription.remove());
      directionMap.forEach(([, key]) => {
        injectPointerApi(
          `window.__KAYLANE_TV_POINTER_API__.setDirection(${JSON.stringify(
            key,
          )}, false)`,
        );
      });
    };
  }, [
    active,
    inputEnabled,
    addUserInputListenerCallback,
    injectPointerApi,
    mode,
  ]);

  useEffect(() => {
    if (!active) {
      modeRef.current = 'pointer';
      setModeState('pointer');
    }
  }, [active]);

  return {activatePointer, mode, setMode, syncMode};
};
