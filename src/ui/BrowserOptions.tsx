import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

type OptionTone = 'default' | 'accent' | 'cleaner';

type OptionButtonProps = {
  label: string;
  description: string;
  preferredFocus?: boolean;
  tone?: OptionTone;
  onPress: () => void;
};

const OptionButton = ({
  label,
  description,
  preferredFocus = false,
  tone = 'default',
  onPress,
}: OptionButtonProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      focusable={true}
      hasTVPreferredFocus={preferredFocus}
      enableSynchronousFocusEvents={true}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.option,
        tone === 'accent' && styles.optionAccent,
        tone === 'cleaner' && styles.optionCleaner,
        focused && styles.optionFocused,
      ]}>
      <Text style={styles.optionTitle}>{label}</Text>
      <Text numberOfLines={2} style={styles.optionDescription}>
        {description}
      </Text>
    </Pressable>
  );
};

type Props = {
  currentPointerMode: 'pointer' | 'focus';
  onTogglePointerMode: () => void;
  onOpenEmbeddedPlayer: () => void;
  onClosePopups: () => void;
  onRetryPlayer: () => void;
  onReloadPage: () => void;
  onHome: () => void;
  onClose: () => void;
};

export const BrowserOptions = ({
  currentPointerMode,
  onTogglePointerMode,
  onOpenEmbeddedPlayer,
  onClosePopups,
  onRetryPlayer,
  onReloadPage,
  onHome,
  onClose,
}: Props) => (
  <View style={styles.overlay}>
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>KAYLANE TV</Text>
          <Text style={styles.title}>Contrôles rapides</Text>
          <Text style={styles.subtitle}>
            Tout reste visible à l’écran pour garder le focus stable avec la télécommande.
          </Text>
        </View>

        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeLabel}>MODE</Text>
          <Text style={styles.modeBadgeValue}>
            {currentPointerMode === 'pointer' ? 'POINTEUR' : 'SÉLECTION'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>INTERACTION & NETTOYAGE</Text>
      <View style={styles.grid}>
        <OptionButton
          label={
            currentPointerMode === 'pointer'
              ? 'Passer en mode sélection'
              : 'Passer en mode pointeur'
          }
          description={
            currentPointerMode === 'pointer'
              ? 'Contrôle natif des boutons et du lecteur.'
              : 'Retour au curseur Kaylane TV.'
          }
          preferredFocus={true}
          tone="accent"
          onPress={onTogglePointerMode}
        />

        <OptionButton
          label="Fermer toutes les fenêtres"
          description="Supprime les popups, modals, captchas et overlays visibles."
          tone="cleaner"
          onPress={onClosePopups}
        />

        <OptionButton
          label="Ouvrir le lecteur"
          description="Isole le plus gros lecteur iframe dans Kaylane TV."
          onPress={onOpenEmbeddedPlayer}
        />

        <OptionButton
          label="Relancer le lecteur"
          description="Réessaie la vidéo sans quitter la page."
          onPress={onRetryPlayer}
        />
      </View>

      <Text style={styles.sectionLabel}>NAVIGATION</Text>
      <View style={styles.grid}>
        <OptionButton
          label="Recharger la page"
          description="Recharge complètement le site courant."
          onPress={onReloadPage}
        />

        <OptionButton
          label="Accueil Kaylane TV"
          description="Retour aux cartes Movix et Dofuz."
          onPress={onHome}
        />

        <OptionButton
          label="Fermer les options"
          description="Retour immédiat au navigateur."
          onPress={onClose}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          OK = activer · Flèches = naviguer · Menu = ouvrir/fermer ce panneau
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
    backgroundColor: 'rgba(2, 5, 12, 0.90)',
    paddingHorizontal: 44,
    paddingVertical: 28,
  },
  panel: {
    width: '100%',
    maxWidth: 1080,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#344562',
    backgroundColor: '#0b1322',
    paddingHorizontal: 26,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    paddingRight: 24,
  },
  eyebrow: {
    color: '#7fa8ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    color: '#ffffff',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    marginTop: 2,
  },
  subtitle: {
    color: '#9eacc2',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  modeBadge: {
    minWidth: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#496394',
    backgroundColor: '#13233d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeBadgeLabel: {
    color: '#88a6d8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  modeBadgeValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#273650',
    marginTop: 15,
    marginBottom: 11,
  },
  sectionLabel: {
    color: '#8194b2',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 4,
    marginBottom: 7,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 9,
    marginBottom: 8,
  },
  option: {
    width: '49%',
    minHeight: 70,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#2a3952',
    backgroundColor: '#111c2f',
    paddingHorizontal: 17,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  optionAccent: {
    borderColor: '#456cb3',
    backgroundColor: '#142746',
  },
  optionCleaner: {
    borderColor: '#6f5a39',
    backgroundColor: '#261f17',
  },
  optionFocused: {
    borderColor: '#ffffff',
    backgroundColor: '#203250',
    transform: [{scale: 1.018}],
  },
  optionTitle: {
    color: '#ffffff',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  optionDescription: {
    color: '#b5c2d6',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  footer: {
    marginTop: 5,
    borderRadius: 11,
    backgroundColor: '#111a2a',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  footerText: {
    color: '#c9d4e5',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
