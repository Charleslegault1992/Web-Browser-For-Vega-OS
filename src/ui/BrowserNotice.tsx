import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

type Props = {
  message: string | null;
};

export const BrowserNotice = ({message}: Props) => {
  if (!message) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      <Text numberOfLines={3} style={styles.text}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 56,
    right: 56,
    bottom: 48,
    alignItems: 'center',
  },
  text: {
    maxWidth: 960,
    color: '#ffffff',
    backgroundColor: 'rgba(16, 22, 31, 0.96)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#394657',
    paddingHorizontal: 24,
    paddingVertical: 14,
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
  },
});
