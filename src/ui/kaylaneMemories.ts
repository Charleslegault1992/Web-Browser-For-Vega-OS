import type {ImageSourcePropType} from 'react-native';

export const KAYLANE_LOGO: ImageSourcePropType = require('../../assets/kaylane/logo.jpg');

export const KAYLANE_SLIDES: readonly ImageSourcePropType[] = [
  require('../../assets/kaylane/slides/kaylane-slide-01.jpg'),
  require('../../assets/kaylane/slides/kaylane-slide-02.jpg'),
  require('../../assets/kaylane/slides/kaylane-slide-03.jpg'),
  require('../../assets/kaylane/slides/kaylane-slide-04.jpg'),
  require('../../assets/kaylane/slides/kaylane-slide-05.jpg'),
];

export const KAYLANE_LOVE_LINES = [
  'Je suis fucking fier de toi.',
  'Je t’aime plus que tout.',
  '#TEAMDEFEUX',
] as const;
