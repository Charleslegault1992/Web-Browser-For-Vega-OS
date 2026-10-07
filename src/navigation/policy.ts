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
  | {action: 'allow'; reason: 'https-navigation'}
  | {action: 'same-window'; reason: 'trusted-popup' | 'primary-host-popup'}
  | {
      action: 'block';
      reason:
        | 'invalid-url'
        | 'unsupported-scheme'
        | 'insecure-http'
        | 'blocked-ad-host'
        | 'untrusted-popup';
    };

const parseUrl = (rawUrl: string): URL | null => {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
};

export const decideTopLevelNavigation = (
  intent: NavigationIntent,
): NavigationDecision => {
  const destination = parseUrl(intent.url);

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

  if (intent.source === 'window.open' || intent.source === 'blank-target') {
    if (intent.userInitiated) {
      return {action: 'same-window', reason: 'trusted-popup'};
    }

    if (matchesAnyHostnameRule(destination.hostname, PRIMARY_HOSTS)) {
      return {action: 'same-window', reason: 'primary-host-popup'};
    }

    return {action: 'block', reason: 'untrusted-popup'};
  }

  return {action: 'allow', reason: 'https-navigation'};
};
