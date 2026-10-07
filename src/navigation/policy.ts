import {matchesAnyHostnameRule} from './hostMatcher';
import {BLOCKED_AD_NAVIGATION_HOSTS, PRIMARY_HOSTS} from './rules';

export type NavigationSource =
  | 'page'
  | 'redirect'
  | 'window.open'
  | 'blank-target';

export type NavigationIntent = {
  url: string;
  source: NavigationSource;
  userInitiated: boolean;
  openerUrl?: string;
};

export type NavigationDecision =
  | {action: 'allow'; reason: 'https-navigation'; url: string}
  | {
      action: 'same-window';
      reason:
        | 'trusted-popup'
        | 'primary-host-popup'
        | 'same-origin-popup';
      url: string;
    }
  | {
      action: 'block';
      reason:
        | 'invalid-url'
        | 'invalid-opener'
        | 'unsupported-scheme'
        | 'insecure-http'
        | 'blocked-ad-host'
        | 'untrusted-popup';
    };

const MAX_URL_LENGTH = 4096;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

const parseAbsoluteHttpsUrl = (rawUrl: string): URL | null => {
  const candidate = rawUrl.trim();

  if (
    !candidate ||
    candidate.length > MAX_URL_LENGTH ||
    CONTROL_CHARACTER.test(candidate)
  ) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
};

const parseDestination = (rawUrl: string, baseUrl?: URL): URL | null => {
  const candidate = rawUrl.trim();

  if (
    !candidate ||
    candidate.length > MAX_URL_LENGTH ||
    CONTROL_CHARACTER.test(candidate)
  ) {
    return null;
  }

  try {
    return baseUrl ? new URL(candidate, baseUrl.href) : new URL(candidate);
  } catch {
    return null;
  }
};

const isPopupSource = (
  source: NavigationSource,
): source is Extract<NavigationSource, 'window.open' | 'blank-target'> =>
  source === 'window.open' || source === 'blank-target';

export const decideTopLevelNavigation = (
  intent: NavigationIntent,
): NavigationDecision => {
  const popup = isPopupSource(intent.source);
  let opener: URL | undefined;

  if (popup) {
    if (!intent.openerUrl) {
      return {action: 'block', reason: 'invalid-opener'};
    }

    const parsedOpener = parseAbsoluteHttpsUrl(intent.openerUrl);
    if (!parsedOpener) {
      return {action: 'block', reason: 'invalid-opener'};
    }

    opener = parsedOpener;
  }

  const destination = parseDestination(intent.url, opener);

  if (!destination) {
    return {action: 'block', reason: 'invalid-url'};
  }

  if (destination.protocol === 'http:') {
    return {action: 'block', reason: 'insecure-http'};
  }

  if (destination.protocol !== 'https:') {
    return {action: 'block', reason: 'unsupported-scheme'};
  }

  if (
    matchesAnyHostnameRule(
      destination.hostname,
      BLOCKED_AD_NAVIGATION_HOSTS,
    )
  ) {
    return {action: 'block', reason: 'blocked-ad-host'};
  }

  const normalizedUrl = destination.href;

  if (popup) {
    if (intent.userInitiated) {
      return {
        action: 'same-window',
        reason: 'trusted-popup',
        url: normalizedUrl,
      };
    }

    if (matchesAnyHostnameRule(destination.hostname, PRIMARY_HOSTS)) {
      return {
        action: 'same-window',
        reason: 'primary-host-popup',
        url: normalizedUrl,
      };
    }

    if (opener && destination.origin === opener.origin) {
      return {
        action: 'same-window',
        reason: 'same-origin-popup',
        url: normalizedUrl,
      };
    }

    return {action: 'block', reason: 'untrusted-popup'};
  }

  return {action: 'allow', reason: 'https-navigation', url: normalizedUrl};
};

export const shouldAllowWebViewNavigation = (url: string): boolean =>
  decideTopLevelNavigation({
    url,
    source: 'redirect',
    userInitiated: false,
  }).action !== 'block';
