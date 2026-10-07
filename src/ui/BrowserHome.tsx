import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {resolvePreferredDestinationIndex} from './homeFocusPolicy';

export type HomeDestination = {
  id: string;
  label: string;
  url: string;
  description: string;
};

export const DEFAULT_HOME_DESTINATIONS: readonly HomeDestination[] = [
  {
    id: 'movix',
    label: 'Movix',
    url: 'https://movix.luxe/',
    description: 'Ouvrir Movix',
  },
  {
    id: 'dofuz',
    label: 'Dofuz',
    url: 'https://dofuz.com/',
    description: 'Ouvrir Dofuz',
  },
];

type DestinationCardProps = {
  destination: HomeDestination;
  preferredFocus: boolean;
  onOpen: (url: string) => void;
};

const DestinationCard = ({
  destination,
  preferredFocus,
  onOpen,
}: DestinationCardProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      hasTVPreferredFocus={preferredFocus}
      enableSynchronousFocusEvents={true}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => onOpen(destination.url)}
      accessibilityRole="button"
      accessibilityLabel={destination.description}
      accessibilityHint="Appuie sur OK pour ouvrir"
      style={[styles.card, focused && styles.cardFocused]}>
      <Text numberOfLines={1} style={styles.cardTitle}>
        {destination.label}
      </Text>
      <Text numberOfLines={2} style={styles.cardDescription}>
        {destination.description}
      </Text>
    </Pressable>
  );
};

type Props = {
  onOpen: (url: string) => void;
  destinations?: readonly HomeDestination[];
  preferredUrl?: string;
};

export const BrowserHome = ({
  onOpen,
  destinations = DEFAULT_HOME_DESTINATIONS,
  preferredUrl,
}: Props) => {
  const preferredIndex = resolvePreferredDestinationIndex(
    destinations,
    preferredUrl,
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Kaylane TV</Text>
        <Text style={styles.subtitle}>
          Choisis une destination avec la télécommande.
        </Text>

        <View style={styles.grid}>
          {destinations.map((destination, index) => (
            <DestinationCard
              key={destination.id}
              destination={destination}
              preferredFocus={index === preferredIndex}
              onOpen={onOpen}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#070a0f',
    paddingHorizontal: 72,
    paddingVertical: 56,
  },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 54,
    lineHeight: 62,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  subtitle: {
    color: '#b8c2cf',
    fontSize: 24,
    lineHeight: 32,
    marginTop: 8,
    marginBottom: 38,
  },
  grid: {
    flexDirection: 'row',
    gap: 28,
  },
  card: {
    flex: 1,
    minHeight: 210,
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 4,
    borderColor: '#26303d',
    backgroundColor: '#111823',
    paddingHorizontal: 34,
    paddingVertical: 30,
  },
  cardFocused: {
    borderColor: '#ffffff',
    backgroundColor: '#182230',
    transform: [{scale: 1.025}],
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
  },
  cardDescription: {
    color: '#c3ccd8',
    fontSize: 20,
    lineHeight: 28,
    marginTop: 10,
  },
});
