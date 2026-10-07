export const PRIMARY_HOSTS = ['movix.luxe', 'dofuz.com'] as const;

/**
 * These rules are used only for nuisance navigations and targeted page-guard
 * iframe cleanup. They are intentionally not a global request denylist.
 * Third-party player, media, subtitle and CDN traffic must remain untouched.
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
