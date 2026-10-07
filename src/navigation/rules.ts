export const PRIMARY_HOSTS = ['movix.luxe', 'dofuz.com'] as const;

/**
 * These rules are used only for top-level nuisance navigation and page-guard
 * iframe cleanup. They are intentionally not a network-request blocklist.
 */
export const BLOCKED_AD_NAVIGATION_HOSTS = [
  'doubleclick.net',
  'googlesyndication.com',
  'adservice.google.com',
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'onclicka.com',
  'exoclick.com',
] as const;
