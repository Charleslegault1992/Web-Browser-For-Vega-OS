import 'react-native';

declare module 'react-native' {
  interface PressableProps {
    /**
     * Vega-only. Dispatches onFocus/onBlur synchronously to stabilize rapid
     * D-pad focus transitions.
     */
    enableSynchronousFocusEvents?: boolean;
  }
}

export {};
