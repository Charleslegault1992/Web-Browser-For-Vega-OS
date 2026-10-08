import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

type ErrorActionProps = {
  label: string;
  preferredFocus?: boolean;
  onPress: () => void;
};

const ErrorAction = ({
  label,
  preferredFocus = false,
  onPress,
}: ErrorActionProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      hasTVPreferredFocus={preferredFocus}
      enableSynchronousFocusEvents={true}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.action, focused && styles.actionFocused]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
};

type Props = {
  title?: string;
  message: string;
  onRetry: () => void;
  onHome: () => void;
};

export const BrowserError = ({
  title = 'Impossible de charger la page',
  message,
  onRetry,
  onHome,
}: Props) => (
  <View style={styles.container}>
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      <View style={styles.actions}>
        <ErrorAction
          label="Réessayer"
          preferredFocus={true}
          onPress={onRetry}
        />
        <ErrorAction label="Accueil" onPress={onHome} />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#070a0f',
    paddingHorizontal: 72,
    paddingVertical: 56,
  },
  panel: {
    width: '100%',
    maxWidth: 900,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2c3745',
    backgroundColor: '#101721',
    paddingHorizontal: 48,
    paddingVertical: 42,
  },
  title: {
    color: '#ffffff',
    fontSize: 38,
    lineHeight: 46,
    fontWeight: '700',
  },
  message: {
    color: '#c3ccd8',
    fontSize: 22,
    lineHeight: 31,
    marginTop: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 34,
  },
  action: {
    minWidth: 190,
    minHeight: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#344052',
    backgroundColor: '#17202c',
    paddingHorizontal: 28,
  },
  actionFocused: {
    borderColor: '#ffffff',
    backgroundColor: '#223044',
    transform: [{scale: 1.025}],
  },
  actionText: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
});
