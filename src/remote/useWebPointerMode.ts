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
  const selectDownAtRef = useRef<number | null>(null);
  const focusSelectDownAtRef = useRef<number | null>(null);

  const injectPointerApi = useCallback(
    (expression: string) => {
      injectJavaScript(
        `window.__KAYLANE_TV_POINTER_API__ && ${expression}; true;`,
      );
    },
    [injectJavaScript],
  );

  const setMode = useCallback(
    (nextMode: WebPointerMode) => {
      modeRef.current = nextMode;
      setModeState(nextMode);
      injectPointerApi(
        `window.__KAYLANE_TV_POINTER_API__.setMode(${JSON.stringify(
          nextMode,
        )}, true)`,
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

    if (event.eventKeyAction === 0) {
      if (focusSelectDownAtRef.current === null) {
        focusSelectDownAtRef.current = Date.now();
      }
      return;
    }

    if (event.eventKeyAction === 1) {
      const startedAt = focusSelectDownAtRef.current;
      focusSelectDownAtRef.current = null;

      if (startedAt !== null && Date.now() - startedAt >= HOLD_TO_TOGGLE_MS) {
        setMode('pointer');
      }
    }
  });

  useEffect(() => {
    if (!active || mode !== 'pointer') {
      selectDownAtRef.current = null;
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
          if (event.phase === 'PRESSED') {
            if (selectDownAtRef.current === null) {
              selectDownAtRef.current = Date.now();
            }
            return true;
          }

          const startedAt = selectDownAtRef.current;
          selectDownAtRef.current = null;

          if (
            startedAt !== null &&
            Date.now() - startedAt >= HOLD_TO_TOGGLE_MS
          ) {
            setMode('focus');
          } else {
            injectPointerApi('window.__KAYLANE_TV_POINTER_API__.activate()');
          }

          return true;
        },
      ),
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
    setMode,
  ]);

  useEffect(() => {
    if (!active) {
      selectDownAtRef.current = null;
      focusSelectDownAtRef.current = null;
      modeRef.current = 'pointer';
      setModeState('pointer');
    }
  }, [active]);

  return {mode, syncMode};
};
