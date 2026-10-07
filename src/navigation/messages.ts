import type {NavigationSource} from './policy';

export type PageGuardNavigationMessage = {
  type: 'kaylane:navigation-intent';
  url: string;
  openerUrl: string;
  source: Extract<NavigationSource, 'window.open' | 'blank-target'>;
  userInitiated: boolean;
};

const MAX_MESSAGE_LENGTH = 8192;
const MAX_URL_LENGTH = 4096;

const isPopupSource = (
  value: unknown,
): value is PageGuardNavigationMessage['source'] =>
  value === 'window.open' || value === 'blank-target';

const normalizeHttpsOpener = (value: string): string | null => {
  const candidate = value.trim();

  if (!candidate || candidate.length > MAX_URL_LENGTH) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
};

export const parsePageGuardMessage = (
  rawMessage: string,
): PageGuardNavigationMessage | null => {
  if (!rawMessage || rawMessage.length > MAX_MESSAGE_LENGTH) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(rawMessage);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;

    if (
      candidate.type !== 'kaylane:navigation-intent' ||
      typeof candidate.url !== 'string' ||
      typeof candidate.openerUrl !== 'string' ||
      !isPopupSource(candidate.source) ||
      typeof candidate.userInitiated !== 'boolean'
    ) {
      return null;
    }

    const url = candidate.url.trim();
    const openerUrl = normalizeHttpsOpener(candidate.openerUrl);

    if (!url || url.length > MAX_URL_LENGTH || !openerUrl) {
      return null;
    }

    return {
      type: 'kaylane:navigation-intent',
      url,
      openerUrl,
      source: candidate.source,
      userInitiated: candidate.userInitiated,
    };
  } catch {
    return null;
  }
};
