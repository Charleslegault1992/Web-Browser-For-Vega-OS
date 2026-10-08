import {useCallback, useEffect, useRef, useState} from 'react';
import {
  UserInputEvent,
  UserInputEventName,
  useAddUserInputListenerCallback,
  useTVEventHandler,
} from '@amazon-devices/react-native-kepler';

const HOLD_TO_TOGGLE_MS = 700;

export type WebPointerMode = 'pointer' | 'focus';

type Options = {
  active: boolean;
  injectJavaScript: (script: string) => void;
};

const directionMap: ReadonlyArray<[UserInputEventName, string]> = [
  [UserInputEventName.Left, 'ArrowLeft'],
  [UserInputEventName.Right, 'ArrowRight'],
  [UserInputEventName.Up, 'ArrowUp'],
  [UserInputEventName.Down, 'ArrowDown'],
];

export const useWebPointerMode = ({active, injectJavaScript}: Options) => {
  const addUserInputListenerCallback = useAddUserInputListenerCallback();
  const [mode, setModeState] = useState<WebPointerMode>('pointer');
  const modeRef = useRef<WebPointerMode>('pointer');
  const pointerHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreSelectUntilReleaseRef = useRef(false);

  const clearPointerHold = useCallback(() => {
    if (pointerHoldTimerRef.current !== null) {
      clearTimeout(pointerHoldTimerRef.current);
      pointerHoldTimerRef.current = null;
    }
  }, []);

  const clearFocusHold = useCallback(() => {
    if (focusHoldTimerRef.current !== null) {
      clearTimeout(focusHoldTimerRef.current);
      focusHoldTimerRef.current = null;
    }
  }, []);

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

  const syncMode = useCallback(() => {
    injectPointerApi(
      `window.__KAYLANE_TV_POINTER_API__.setMode(${JSON.stringify(
        modeRef.current,
      )}, false)`,
    );
    injectPointerApi('window.__KAYLANE_TV_POINTER_API__.refresh()');
  }, [injectPointerApi]);

  useTVEventHandler(event => {
    if (
      !active ||
      modeRef.current !== 'focus' ||
      event.eventType !== 'select'
    ) {
      return;
    }

    if (ignoreSelectUntilReleaseRef.current) {
      if (event.eventKeyAction === 1) {
        ignoreSelectUntilReleaseRef.current = false;
      }
      return;
    }

    if (event.eventKeyAction === 0) {
      if (focusHoldTimerRef.current === null) {
        focusHoldTimerRef.current = setTimeout(() => {
          focusHoldTimerRef.current = null;
          ignoreSelectUntilReleaseRef.current = true;
          setMode('pointer');
        }, HOLD_TO_TOGGLE_MS);
      }
      return;
    }

    if (event.eventKeyAction === 1) {
      clearFocusHold();
    }
  });

  useEffect(() => {
    if (!active || mode !== 'pointer') {
      clearPointerHold();
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

    subscriptions.push(
      addUserInputListenerCallback(
        UserInputEventName.Select,
        (event: UserInputEvent) => {
          if (ignoreSelectUntilReleaseRef.current) {
            if (event.phase === 'RELEASED') {
              ignoreSelectUntilReleaseRef.current = false;
            }
            return true;
          }

          if (event.phase === 'PRESSED') {
            if (pointerHoldTimerRef.current === null) {
              pointerHoldTimerRef.current = setTimeout(() => {
                pointerHoldTimerRef.current = null;
                ignoreSelectUntilReleaseRef.current = true;
                setMode('focus');
              }, HOLD_TO_TOGGLE_MS);
            }
            return true;
          }

          if (event.phase === 'RELEASED') {
            const wasShortPress = pointerHoldTimerRef.current !== null;
            clearPointerHold();

            if (wasShortPress) {
              injectPointerApi('window.__KAYLANE_TV_POINTER_API__.activate()');
            }
          }

          return true;
        },
      ),
    );

    return () => {
      clearPointerHold();
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
    addUserInputListenerCallback,
    clearPointerHold,
    injectPointerApi,
    mode,
    setMode,
  ]);

  useEffect(() => {
    if (!active) {
      clearPointerHold();
      clearFocusHold();
      ignoreSelectUntilReleaseRef.current = false;
      modeRef.current = 'pointer';
      setModeState('pointer');
    }
  }, [active, clearFocusHold, clearPointerHold]);

  useEffect(
    () => () => {
      clearPointerHold();
      clearFocusHold();
    },
    [clearFocusHold, clearPointerHold],
  );

  return {mode, setMode, syncMode};
};
