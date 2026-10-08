import type {ImageSourcePropType} from 'react-native';

export const KAYLANE_LOGO: ImageSourcePropType = require('../../assets/kaylane/logo.jpg');

export const KAYLANE_SLIDES: readonly ImageSourcePropType[] = [
  require('../../assets/photos/kaylane-memory-home.jpg'),
  require('../../assets/photos/kaylane-memory-outdoor.jpg'),
];

export const KAYLANE_LOVE_LINES = [
  'Je suis fier de toi.',
  'Je t’aime plus que tout.',
  'Tu es l’amour de ma vie.',
] as const;
