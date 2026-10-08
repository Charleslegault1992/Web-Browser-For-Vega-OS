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
  const focusHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreSelectUntilReleaseRef = useRef(false);

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
      return;
    }

    // Only override D-pad directions here. Select is intentionally left to the
    // native Pressable focus-capture surface so OK/long-OK keep standard Vega
    // press semantics instead of being swallowed by UserInputManager.
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
    addUserInputListenerCallback,
    injectPointerApi,
    mode,
  ]);

  useEffect(() => {
    if (!active) {
      clearFocusHold();
      ignoreSelectUntilReleaseRef.current = false;
      modeRef.current = 'pointer';
      setModeState('pointer');
    }
  }, [active, clearFocusHold]);

  useEffect(
    () => () => {
      clearFocusHold();
    },
    [clearFocusHold],
  );

  return {activatePointer, mode, setMode, syncMode};
};
