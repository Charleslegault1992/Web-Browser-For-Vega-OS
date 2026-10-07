import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import {resolvePreferredDestinationIndex} from './homeFocusPolicy';
import {
  KAYLANE_LOGO,
  KAYLANE_MEMORIES_GRID,
} from './kaylaneMemories';

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
    description: 'Films et séries',
  },
  {
    id: 'dofuz',
    label: 'Dofuz',
    url: 'https://dofuz.com/',
    description: 'Films et séries',
  },
];

type DestinationCardProps = {
  destination: HomeDestination;
  preferredFocus: boolean;
  side: 'left' | 'right';
  onOpen: (url: string) => void;
};

const DestinationCard = ({
  destination,
  preferredFocus,
  side,
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
      accessibilityLabel={`Ouvrir ${destination.label}`}
      style={[
        styles.destinationCard,
        side === 'left' ? styles.movixCard : styles.dofuzCard,
        focused && styles.focusedCard,
      ]}>
      <View style={styles.cardTopRow}>
        <Text style={styles.destinationSide}>
          {side === 'left' ? 'GAUCHE' : 'DROITE'}
        </Text>
        <Text style={styles.okHint}>OK pour ouvrir</Text>
      </View>

      <Text style={styles.destinationTitle}>{destination.label}</Text>
      <Text style={styles.destinationDescription}>{destination.description}</Text>

      <View style={styles.openRow}>
        <Text style={styles.openText}>Ouvrir {destination.label}</Text>
        <Text style={styles.openArrow}>›</Text>
      </View>
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
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [memoriesFocused, setMemoriesFocused] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image source={KAYLANE_LOGO} resizeMode="cover" style={styles.logo} />
          <View>
            <Text style={styles.title}>Kaylane TV</Text>
            <Text style={styles.subtitle}>Choisis ton site et profite de ta soirée.</Text>
          </View>
        </View>

        <View style={styles.forKaylane}>
          <Text style={styles.heart}>♥</Text>
          <Text style={styles.forKaylaneText}>Pour Kaylane</Text>
        </View>
      </View>

      <View style={styles.destinationRow}>
        {destinations.map((destination, index) => (
          <DestinationCard
            key={destination.id}
            destination={destination}
            preferredFocus={index === preferredIndex}
            side={index === 0 ? 'left' : 'right'}
            onOpen={onOpen}
          />
        ))}
      </View>

      <View style={styles.bottomRow}>
        <Pressable
          enableSynchronousFocusEvents={true}
          onFocus={() => setMemoriesFocused(true)}
          onBlur={() => setMemoriesFocused(false)}
          onPress={() => setMemoriesOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir nos souvenirs"
          style={[
            styles.memoriesCard,
            memoriesFocused && styles.memoriesCardFocused,
          ]}>
          <Image
            source={KAYLANE_MEMORIES_GRID}
            resizeMode="cover"
            style={styles.memoriesImage}
          />
          <View style={styles.memoriesLabel}>
            <View>
              <Text style={styles.memoriesTitle}>Nos souvenirs ♥</Text>
              <Text style={styles.memoriesText}>OK pour voir les photos</Text>
            </View>
            <Text style={styles.memoriesArrow}>›</Text>
          </View>
        </Pressable>

        <View style={styles.lovePanel}>
          <View style={styles.loveCardPrimary}>
            <Text style={styles.lovePrimary}>Je t’aime.</Text>
            <Text style={styles.loveSecondary}>Tu es l’amour de ma vie.</Text>
          </View>

          <View style={styles.loveCardSmall}>
            <Text style={styles.smallHeart}>♥</Text>
            <Text style={styles.loveSmall}>Je suis fier de toi.</Text>
          </View>

          <Text style={styles.signature}>— Charles ♥</Text>
        </View>
      </View>

      <Text style={styles.footer}>Kaylane TV · Fait avec amour</Text>

      {memoriesOpen ? (
        <Pressable
          hasTVPreferredFocus={true}
          enableSynchronousFocusEvents={true}
          onPress={() => setMemoriesOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Fermer nos souvenirs"
          style={styles.memoriesOverlay}>
          <Image
            source={KAYLANE_MEMORIES_GRID}
            resizeMode="contain"
            style={styles.memoriesOverlayImage}
          />
          <View style={styles.memoriesOverlayHeader}>
            <Text style={styles.memoriesOverlayTitle}>Nos souvenirs ♥</Text>
            <Text style={styles.memoriesOverlayHint}>OK pour fermer</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#050713',
    paddingHorizontal: 36,
    paddingTop: 22,
    paddingBottom: 14,
  },
  header: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 66,
    height: 66,
    borderRadius: 16,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#4869bb',
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '900',
  },
  subtitle: {
    color: '#b9c5da',
    fontSize: 16,
    lineHeight: 21,
    marginTop: 1,
  },
  forKaylane: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#634b8e',
    backgroundColor: '#17162a',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  heart: {
    color: '#ff83bd',
    fontSize: 18,
    marginRight: 7,
  },
  forKaylaneText: {
    color: '#f5eafa',
    fontSize: 16,
    fontWeight: '800',
  },
  destinationRow: {
    height: 188,
    flexDirection: 'row',
    gap: 18,
    marginBottom: 16,
  },
  destinationCard: {
    flex: 1,
    borderRadius: 23,
    borderWidth: 4,
    paddingHorizontal: 23,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  movixCard: {
    backgroundColor: '#101b33',
    borderColor: '#35599c',
  },
  dofuzCard: {
    backgroundColor: '#19142f',
    borderColor: '#71449b',
  },
  focusedCard: {
    borderColor: '#ffffff',
    transform: [{scale: 1.015}],
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destinationSide: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  okHint: {
    marginLeft: 'auto',
    color: '#b8c5da',
    fontSize: 14,
    fontWeight: '700',
  },
  destinationTitle: {
    color: '#ffffff',
    fontSize: 39,
    lineHeight: 44,
    fontWeight: '900',
  },
  destinationDescription: {
    color: '#cad4e4',
    fontSize: 17,
    lineHeight: 22,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  openText: {
    color: '#ffffff',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  openArrow: {
    color: '#ffffff',
    fontSize: 30,
    lineHeight: 30,
    marginLeft: 7,
  },
  bottomRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    gap: 18,
  },
  memoriesCard: {
    flex: 1.35,
    overflow: 'hidden',
    borderRadius: 21,
    borderWidth: 3,
    borderColor: '#293854',
    backgroundColor: '#0d1424',
  },
  memoriesCardFocused: {
    borderColor: '#ffffff',
  },
  memoriesImage: {
    width: '100%',
    height: '100%',
  },
  memoriesLabel: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 13,
    minHeight: 62,
    borderRadius: 15,
    backgroundColor: 'rgba(5, 9, 21, 0.88)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memoriesTitle: {
    color: '#ffffff',
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '900',
  },
  memoriesText: {
    color: '#cdd7e7',
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  memoriesArrow: {
    color: '#ffffff',
    fontSize: 32,
    marginLeft: 'auto',
  },
  lovePanel: {
    flex: 0.85,
    justifyContent: 'center',
    gap: 12,
  },
  loveCardPrimary: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2c3957',
    backgroundColor: '#10182a',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  lovePrimary: {
    color: '#ffffff',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
  },
  loveSecondary: {
    color: '#ffb4d5',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    marginTop: 5,
  },
  loveCardSmall: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#293858',
    backgroundColor: '#151e34',
    paddingHorizontal: 17,
  },
  smallHeart: {
    color: '#ff83bd',
    fontSize: 18,
    marginRight: 9,
  },
  loveSmall: {
    color: '#edf2fa',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  signature: {
    color: '#95a8c7',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    marginLeft: 4,
  },
  footer: {
    alignSelf: 'center',
    color: '#707f97',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
  },
  memoriesOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: '#040711',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 34,
  },
  memoriesOverlayImage: {
    width: '100%',
    height: '100%',
  },
  memoriesOverlayHeader: {
    position: 'absolute',
    left: 44,
    right: 44,
    top: 34,
    height: 58,
    borderRadius: 16,
    backgroundColor: 'rgba(5,9,21,0.88)',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memoriesOverlayTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  memoriesOverlayHint: {
    marginLeft: 'auto',
    color: '#d9e1ef',
    fontSize: 16,
    fontWeight: '700',
  },
});
