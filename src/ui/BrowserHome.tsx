import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import {resolvePreferredDestinationIndex} from './homeFocusPolicy';
import {
  KAYLANE_LOGO,
  KAYLANE_LOVE_LINES,
  KAYLANE_MEMORIES_COLLAGE,
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
      accessibilityLabel={`Ouvrir ${destination.label}`}
      accessibilityHint="Appuie sur OK pour ouvrir"
      style={[styles.destinationCard, focused && styles.destinationCardFocused]}>
      <View style={styles.destinationIcon}>
        <Text style={styles.destinationIconText}>
          {destination.label.slice(0, 1)}
        </Text>
      </View>

      <View style={styles.destinationCopy}>
        <Text numberOfLines={1} style={styles.destinationTitle}>
          {destination.label}
        </Text>
        <Text numberOfLines={1} style={styles.destinationDescription}>
          {destination.description}
        </Text>
      </View>

      <Text style={styles.destinationArrow}>›</Text>
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
      <View style={styles.ambientGlowOne} />
      <View style={styles.ambientGlowTwo} />

      <View style={styles.brandRow}>
        <Image source={KAYLANE_LOGO} resizeMode="cover" style={styles.logo} />

        <View style={styles.brandCopy}>
          <Text style={styles.title}>Kaylane TV</Text>
          <Text style={styles.subtitle}>
            Ta soirée, ton confort, notre petit coin à nous.
          </Text>
        </View>

        <View style={styles.loveBadge}>
          <Text style={styles.loveBadgeHeart}>♥</Text>
          <Text style={styles.loveBadgeText}>Pour Kaylane</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.leftColumn}>
          <View style={styles.loveCard}>
            <Text style={styles.eyebrow}>UN PETIT RAPPEL</Text>
            <Text style={styles.loveHeadline}>
              Je t’aime, je suis fier de toi et tu es l’amour de ma vie.
            </Text>

            <View style={styles.messageWrap}>
              {KAYLANE_LOVE_LINES.map(line => (
                <View key={line} style={styles.messageChip}>
                  <Text style={styles.messageText}>{line}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.signature}>— Charles ♥</Text>
          </View>

          <Text style={styles.sectionLabel}>OÙ ON ÉCOUTE ÇA ?</Text>

          <View style={styles.actions}>
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

        <View style={styles.rightColumn}>
          <View style={styles.memoriesCard}>
            <Image
              source={KAYLANE_MEMORIES_COLLAGE}
              resizeMode="cover"
              style={styles.memoriesImage}
            />
            <View style={styles.memoriesScrim} />

            <View style={styles.memoriesCopy}>
              <Text style={styles.memoriesEyebrow}>NOS SOUVENIRS</Text>
              <Text style={styles.memoriesTitle}>Nous deux ♥</Text>
              <Text style={styles.memoriesCaption}>
                Tous ces petits moments qui font ma vie plus belle avec toi.
              </Text>
            </View>
          </View>

          <View style={styles.rightMessageRow}>
            <View style={styles.rightMessageCard}>
              <Text style={styles.rightMessageHeart}>♥</Text>
              <Text style={styles.rightMessageText}>
                Peu importe la journée, je suis toujours fier de toi.
              </Text>
            </View>

            <View style={styles.rightMessageCard}>
              <Text style={styles.rightMessageHeart}>♥</Text>
              <Text style={styles.rightMessageText}>
                Mon choix préféré sera toujours toi.
              </Text>
            </View>
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
    paddingHorizontal: 38,
    paddingTop: 28,
    paddingBottom: 22,
  },
  ambientGlowOne: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: '#132d73',
    opacity: 0.26,
    top: -250,
    right: 180,
  },
  ambientGlowTwo: {
    position: 'absolute',
    width: 460,
    height: 460,
    borderRadius: 230,
    backgroundColor: '#5c165f',
    opacity: 0.18,
    bottom: -260,
    left: 110,
  },
  brandRow: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#3758a0',
  },
  brandCopy: {
    flex: 1,
    marginLeft: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 42,
    lineHeight: 47,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  subtitle: {
    color: '#aebbd2',
    fontSize: 18,
    lineHeight: 24,
    marginTop: 3,
  },
  loveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#513d75',
    backgroundColor: '#17152a',
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  loveBadgeHeart: {
    color: '#ff7fbe',
    fontSize: 20,
    marginRight: 8,
  },
  loveBadgeText: {
    color: '#f3eaf7',
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    gap: 24,
  },
  leftColumn: {
    width: '42%',
  },
  rightColumn: {
    flex: 1,
    gap: 12,
  },
  loveCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#202d4b',
    backgroundColor: 'rgba(13, 20, 37, 0.96)',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
  },
  eyebrow: {
    color: '#82a8ff',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  loveHeadline: {
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    marginTop: 7,
  },
  messageWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  messageChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#293858',
    backgroundColor: '#151e34',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  messageText: {
    color: '#dce6f6',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  signature: {
    color: '#ff8ec4',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 13,
  },
  sectionLabel: {
    color: '#8493aa',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 17,
    marginBottom: 9,
  },
  actions: {
    gap: 11,
  },
  destinationCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#26334e',
    backgroundColor: '#10182a',
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  destinationCardFocused: {
    borderColor: '#ffffff',
    backgroundColor: '#192642',
    transform: [{scale: 1.02}],
  },
  destinationIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#23345c',
  },
  destinationIconText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  destinationCopy: {
    flex: 1,
    marginLeft: 15,
  },
  destinationTitle: {
    color: '#ffffff',
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
  },
  destinationDescription: {
    color: '#aebbd0',
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  destinationArrow: {
    color: '#b9c9e8',
    fontSize: 42,
    lineHeight: 44,
    marginLeft: 12,
  },
  memoriesCard: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#293856',
    backgroundColor: '#0d1424',
  },
  memoriesImage: {
    width: '100%',
    height: '100%',
  },
  memoriesScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '48%',
    backgroundColor: 'rgba(3, 7, 18, 0.63)',
  },
  memoriesCopy: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 20,
  },
  memoriesEyebrow: {
    color: '#a8bfff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  memoriesTitle: {
    color: '#ffffff',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    marginTop: 4,
  },
  memoriesCaption: {
    color: '#e7edf7',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 5,
  },
  rightMessageRow: {
    height: 82,
    flexDirection: 'row',
    gap: 12,
  },
  rightMessageCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#26344f',
    backgroundColor: '#10182a',
    paddingHorizontal: 16,
  },
  rightMessageHeart: {
    color: '#ff81bd',
    fontSize: 19,
    marginRight: 10,
  },
  rightMessageText: {
    flex: 1,
    color: '#dce6f6',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  footer: {
    alignSelf: 'center',
    color: '#6f7d94',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 10,
    letterSpacing: 0.5,
  },
});
