import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

type OptionButtonProps = {
  label: string;
  description: string;
  preferredFocus?: boolean;
  onPress: () => void;
};

const OptionButton = ({
  label,
  description,
  preferredFocus = false,
  onPress,
}: OptionButtonProps) => {
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
      style={[styles.option, focused && styles.optionFocused]}>
      <Text style={styles.optionTitle}>{label}</Text>
      <Text style={styles.optionDescription}>{description}</Text>
    </Pressable>
  );
};

type Props = {
  onRetryPlayer: () => void;
  onReloadPage: () => void;
  onHome: () => void;
  onClose: () => void;
};

export const BrowserOptions = ({
  onRetryPlayer,
  onReloadPage,
  onHome,
  onClose,
}: Props) => (
  <View style={styles.overlay}>
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>KAYLANE TV</Text>
          <Text style={styles.title}>Options du navigateur</Text>
        </View>

        <View style={styles.compatBadge}>
          <Text style={styles.compatBadgeText}>Compatibilité vidéo MAX</Text>
        </View>
      </View>

      <Text style={styles.status}>
        Cookies tiers activés · lecture HTML5 facilitée · popup isolé · pointeur TV
      </Text>

      <View style={styles.actions}>
        <OptionButton
          label="Relancer le lecteur"
          description="Réessaie la vidéo ou recharge le lecteur intégré sans quitter la page."
          preferredFocus={true}
          onPress={onRetryPlayer}
        />
        <OptionButton
          label="Recharger la page"
          description="Recharge complètement le site courant."
          onPress={onReloadPage}
        />
        <OptionButton
          label="Accueil Kaylane TV"
          description="Retourne aux cartes Movix et Dofuz."
          onPress={onHome}
        />
        <OptionButton
          label="Fermer les options"
          description="Retourne au navigateur."
          onPress={onClose}
        />
      </View>

      <View style={styles.tip}>
        <Text style={styles.tipText}>
          Astuce : dans une vidéo, maintiens OK pour basculer entre pointeur et sélection.
        </Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(3, 6, 14, 0.88)',
    paddingHorizontal: 56,
    paddingVertical: 42,
  },
  panel: {
    width: '100%',
    maxWidth: 1020,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#31415f',
    backgroundColor: '#0d1424',
    paddingHorizontal: 34,
    paddingVertical: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrow: {
    color: '#83aaff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    marginTop: 4,
  },
  compatBadge: {
    marginLeft: 'auto',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4d6db8',
    backgroundColor: '#142342',
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  compatBadgeText: {
    color: '#e9f0ff',
    fontSize: 14,
    fontWeight: '800',
  },
  status: {
    color: '#aebbd0',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 9,
    marginBottom: 22,
  },
  actions: {
    gap: 12,
  },
  option: {
    minHeight: 84,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: '#283750',
    backgroundColor: '#111b2e',
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  optionFocused: {
    borderColor: '#ffffff',
    backgroundColor: '#1a2944',
    transform: [{scale: 1.012}],
  },
  optionTitle: {
    color: '#ffffff',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
  },
  optionDescription: {
    color: '#b9c6d9',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 3,
  },
  tip: {
    marginTop: 20,
    borderRadius: 14,
    backgroundColor: '#151c2d',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tipText: {
    color: '#dce5f4',
    fontSize: 14,
    lineHeight: 19,
  },
});
