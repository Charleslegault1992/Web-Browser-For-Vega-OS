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
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 32,
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    backgroundColor: '#171c24',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 18,
  },
});
