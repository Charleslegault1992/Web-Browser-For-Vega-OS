export const normalizeHostname = (hostname: string): string =>
  hostname.trim().toLowerCase().replace(/\.+$/, '');

const normalizeRule = (rule: string): string =>
  normalizeHostname(rule.replace(/^\*\./, ''));

export const matchesHostnameRule = (
  hostname: string,
  rule: string,
): boolean => {
  const host = normalizeHostname(hostname);
  const expected = normalizeRule(rule);

  if (!host || !expected) {
    return false;
  }

  return host === expected || host.endsWith(`.${expected}`);
};

export const matchesAnyHostnameRule = (
  hostname: string,
  rules: readonly string[],
): boolean => rules.some(rule => matchesHostnameRule(hostname, rule));
