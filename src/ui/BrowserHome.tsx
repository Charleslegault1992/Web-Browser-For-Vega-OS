import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import {resolvePreferredDestinationIndex} from './homeFocusPolicy';
import {
  KAYLANE_LOGO,
  KAYLANE_LOVE_LINES,
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
      accessibilityHint="Appuie sur OK pour ouvrir"
      style={[
        styles.destinationCard,
        side === 'left' ? styles.movixCard : styles.dofuzCard,
        focused && styles.destinationCardFocused,
      ]}>
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.destinationBadge,
            side === 'left' ? styles.movixBadge : styles.dofuzBadge,
          ]}>
          <Text style={styles.destinationBadgeText}>
            {side === 'left' ? 'GAUCHE' : 'DROITE'}
          </Text>
        </View>
        <Text style={styles.okHint}>OK pour ouvrir</Text>
      </View>

      <Text style={styles.destinationTitle}>{destination.label}</Text>
      <Text style={styles.destinationDescription}>
        {destination.description}
      </Text>

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

  return (
    <View style={styles.container}>
      <View style={styles.glowBlue} />
      <View style={styles.glowPink} />

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
        <View style={styles.photoPanel}>
          <Image
            source={KAYLANE_MEMORIES_GRID}
            resizeMode="cover"
            style={styles.photoGrid}
          />
          <View style={styles.photoLabel}>
            <Text style={styles.photoLabelTitle}>Nos souvenirs ♥</Text>
            <Text style={styles.photoLabelText}>
              Des petits bouts de nous dans Kaylane TV.
            </Text>
          </View>
        </View>

        <View style={styles.loveColumn}>
          <View style={styles.mainLoveCard}>
            <Text style={styles.mainLoveText}>
              Je t’aime. Je suis fier de toi.
            </Text>
            <Text style={styles.mainLoveSubtext}>
              Tu es l’amour de ma vie.
            </Text>
            <Text style={styles.signature}>— Charles ♥</Text>
          </View>

          <View style={styles.smallLoveRow}>
            {KAYLANE_LOVE_LINES.slice(0, 2).map(line => (
              <View key={line} style={styles.smallLoveCard}>
                <Text style={styles.smallHeart}>♥</Text>
                <Text style={styles.smallLoveText}>{line}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.footer}>Kaylane TV · Fait avec amour</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#050713',
    paddingHorizontal: 40,
    paddingTop: 26,
    paddingBottom: 16,
  },
  glowBlue: {
    position: 'absolute',
    width: 580,
    height: 580,
    borderRadius: 290,
    backgroundColor: '#173d87',
    opacity: 0.18,
    top: -330,
    left: -120,
  },
  glowPink: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: '#6b1d67',
    opacity: 0.12,
    bottom: -320,
    right: -120,
  },
  header: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 17,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#4869bb',
  },
  title: {
    color: '#ffffff',
    fontSize: 37,
    lineHeight: 42,
    fontWeight: '900',
  },
  subtitle: {
    color: '#b9c5da',
    fontSize: 17,
    lineHeight: 22,
    marginTop: 2,
  },
  forKaylane: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#634b8e',
    backgroundColor: '#17162a',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  heart: {
    color: '#ff83bd',
    fontSize: 19,
    marginRight: 8,
  },
  forKaylaneText: {
    color: '#f5eafa',
    fontSize: 17,
    fontWeight: '800',
  },
  destinationRow: {
    height: 230,
    flexDirection: 'row',
    gap: 22,
    marginBottom: 18,
  },
  destinationCard: {
    flex: 1,
    borderRadius: 26,
    borderWidth: 4,
    paddingHorizontal: 26,
    paddingVertical: 21,
    justifyContent: 'space-between',
  },
  movixCard: {
    backgroundColor: '#111c34',
    borderColor: '#35599c',
  },
  dofuzCard: {
    backgroundColor: '#1a1531',
    borderColor: '#6b4195',
  },
  destinationCardFocused: {
    borderColor: '#ffffff',
    transform: [{scale: 1.018}],
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destinationBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  movixBadge: {
    backgroundColor: '#315baa',
  },
  dofuzBadge: {
    backgroundColor: '#834db4',
  },
  destinationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  okHint: {
    marginLeft: 'auto',
    color: '#aebdd4',
    fontSize: 14,
    fontWeight: '700',
  },
  destinationTitle: {
    color: '#ffffff',
    fontSize: 43,
    lineHeight: 48,
    fontWeight: '900',
  },
  destinationDescription: {
    color: '#c7d2e4',
    fontSize: 18,
    lineHeight: 23,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  openText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
  },
  openArrow: {
    color: '#ffffff',
    fontSize: 35,
    lineHeight: 35,
    marginLeft: 8,
  },
  bottomRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    gap: 20,
  },
  photoPanel: {
    flex: 1.3,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#283753',
    backgroundColor: '#0d1424',
  },
  photoGrid: {
    width: '100%',
    height: '100%',
  },
  photoLabel: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(5, 9, 21, 0.82)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  photoLabelTitle: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
  },
  photoLabelText: {
    color: '#d7dfed',
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  loveColumn: {
    flex: 0.9,
    gap: 12,
  },
  mainLoveCard: {
    flex: 1,
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2c3957',
    backgroundColor: '#10182a',
    paddingHorizontal: 22,
  },
  mainLoveText: {
    color: '#ffffff',
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '900',
  },
  mainLoveSubtext: {
    color: '#ffb4d5',
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '800',
    marginTop: 6,
  },
  signature: {
    color: '#95a8c7',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 13,
  },
  smallLoveRow: {
    height: 86,
    flexDirection: 'row',
    gap: 12,
  },
  smallLoveCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#293858',
    backgroundColor: '#151e34',
    paddingHorizontal: 14,
  },
  smallHeart: {
    color: '#ff83bd',
    fontSize: 18,
    marginRight: 8,
  },
  smallLoveText: {
    flex: 1,
    color: '#edf2fa',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  footer: {
    alignSelf: 'center',
    color: '#707f97',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 9,
  },
});
