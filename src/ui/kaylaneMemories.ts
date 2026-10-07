import type {ImageSourcePropType} from 'react-native';

export type KaylaneMemory = {
  id: string;
  title: string;
  caption: string;
  source: ImageSourcePropType;
};

export const KAYLANE_LOGO: ImageSourcePropType = require('../../assets/image/kaylane-tv.png');

export const KAYLANE_LOVE_LINES = [
  'Je suis fier de toi.',
  'Je t’aime plus que tout.',
  'Tu es l’amour de ma vie.',
  'Je crois en toi.',
  'Nous deux, toujours.',
  'Ton sourire, mon bonheur.',
  'Tu peux être fière de toi.',
  'Je serai toujours là pour toi.',
] as const;

export const KAYLANE_MEMORIES: readonly KaylaneMemory[] = [
  {
    id: 'indoor',
    title: 'Notre cocon',
    caption: 'Mon endroit préféré, c’est avec toi.',
    source: require('../../assets/kaylane/memory-indoor.jpg'),
  },
  {
    id: 'outdoor',
    title: 'Notre vue',
    caption: 'Tu rends tout plus beau.',
    source: require('../../assets/kaylane/memory-outdoor.jpg'),
  },
  {
    id: 'clown',
    title: 'Nos folies',
    caption: 'J’aime rire avec toi.',
    source: require('../../assets/kaylane/memory-clown.jpg'),
  },
  {
    id: 'carnival',
    title: 'Nos sorties',
    caption: 'Chaque moment avec toi compte.',
    source: require('../../assets/kaylane/memory-carnival.jpg'),
  },
  {
    id: 'festival',
    title: 'Nos souvenirs',
    caption: 'Je nous choisis, chaque jour.',
    source: require('../../assets/kaylane/memory-festival.jpg'),
  },
];
