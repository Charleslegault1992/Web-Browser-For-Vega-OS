import React, {useMemo} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableStateCallbackType,
} from 'react-native';

export type HomeDestination = {
  label: string;
  url: string;
  description: string;
};

const DEFAULT_DESTINATIONS: readonly HomeDestination[] = [
  {
    label: 'Movix',
    url: 'https://movix.luxe/',
    description: 'Ouvrir Movix',
  },
  {
    label: 'Dofuz',
    url: 'https://dofuz.com/',
    description: 'Ouvrir Dofuz',
  },
];

type Props = {
  onOpen: (url: string) => void;
  destinations?: readonly HomeDestination[];
};

export const BrowserHome = ({
  onOpen,
  destinations = DEFAULT_DESTINATIONS,
}: Props) => {
  const cards = useMemo(
    () =>
      destinations.map((destination, index) => (
        <Pressable
          key={destination.url}
          hasTVPreferredFocus={index === 0}
          onPress={() => onOpen(destination.url)}
          accessibilityRole="button"
          accessibilityLabel={destination.description}
          style={({focused, pressed}: PressableStateCallbackType) => [
            styles.card,
            focused && styles.cardFocused,
            pressed && styles.cardPressed,
          ]}>
          <Text style={styles.cardTitle}>{destination.label}</Text>
          <Text style={styles.cardDescription}>{destination.description}</Text>
        </Pressable>
      )),
    [destinations, onOpen],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kaylane TV</Text>
      <Text style={styles.subtitle}>
        Choisis un site avec la manette Fire TV.
      </Text>
      <View style={styles.grid}>{cards}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080b10',
    paddingHorizontal: 52,
    paddingVertical: 42,
  },
  title: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '700',
  },
  subtitle: {
    color: '#b8c0cc',
    fontSize: 22,
    marginTop: 8,
    marginBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    gap: 24,
  },
  card: {
    width: 300,
    minHeight: 150,
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#252c36',
    backgroundColor: '#111722',
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  cardFocused: {
    borderColor: '#ffffff',
    transform: [{scale: 1.05}],
  },
  cardPressed: {
    transform: [{scale: 0.98}],
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '700',
  },
  cardDescription: {
    color: '#b8c0cc',
    fontSize: 18,
    marginTop: 8,
  },
});
