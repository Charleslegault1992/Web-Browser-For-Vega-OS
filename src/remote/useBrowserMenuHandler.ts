import {useEffect} from 'react';
import {
  UserInputEvent,
  UserInputEventName,
  useAddUserInputListenerCallback,
} from '@amazon-devices/react-native-kepler';

type Options = {
  active: boolean;
  onMenu: () => void;
};

export const useBrowserMenuHandler = ({active, onMenu}: Options): void => {
  const addUserInputListenerCallback = useAddUserInputListenerCallback();

  useEffect(() => {
    if (!active) {
      return;
    }

    const subscription = addUserInputListenerCallback(
      UserInputEventName.Menu,
      (event: UserInputEvent) => {
        if (event.phase === 'PRESSED') {
          onMenu();
        }

        return true;
      },
    );

    return () => subscription.remove();
  }, [active, addUserInputListenerCallback, onMenu]);
};
