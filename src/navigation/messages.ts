import type {NavigationSource} from './policy';

export type PageGuardNavigationMessage = {
  type: 'kaylane:navigation-intent';
  url: string;
  source: Extract<NavigationSource, 'window.open' | 'blank-target'>;
  userInitiated: boolean;
};

const isPopupSource = (
  value: unknown,
): value is PageGuardNavigationMessage['source'] =>
  value === 'window.open' || value === 'blank-target';

export const parsePageGuardMessage = (
  rawMessage: string,
): PageGuardNavigationMessage | null => {
  try {
    const parsed: unknown = JSON.parse(rawMessage);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;

    if (
      candidate.type !== 'kaylane:navigation-intent' ||
      typeof candidate.url !== 'string' ||
      !isPopupSource(candidate.source) ||
      typeof candidate.userInitiated !== 'boolean'
    ) {
      return null;
    }

    return {
      type: 'kaylane:navigation-intent',
      url: candidate.url,
      source: candidate.source,
      userInitiated: candidate.userInitiated,
    };
  } catch {
    return null;
  }
};
