import {
  matchesAnyHostnameRule,
  matchesHostnameRule,
  normalizeHostname,
} from '../hostMatcher';

describe('normalizeHostname', () => {
  it('normalizes case, surrounding whitespace and trailing dots', () => {
    expect(normalizeHostname('  WWW.MOVIX.LUXE... ')).toBe('www.movix.luxe');
  });
});

describe('matchesHostnameRule', () => {
  it('matches an exact hostname', () => {
    expect(matchesHostnameRule('movix.luxe', 'movix.luxe')).toBe(true);
  });

  it('matches a real subdomain', () => {
    expect(matchesHostnameRule('cdn.movix.luxe', 'movix.luxe')).toBe(true);
  });

  it('matches uppercase and trailing-dot hostnames', () => {
    expect(matchesHostnameRule('WWW.DOFUZ.COM.', 'dofuz.com')).toBe(true);
  });

  it('rejects lookalike suffixes', () => {
    expect(matchesHostnameRule('evilmovix.luxe', 'movix.luxe')).toBe(false);
    expect(matchesHostnameRule('movix.luxe.evil.example', 'movix.luxe')).toBe(
      false,
    );
    expect(matchesHostnameRule('notdoubleclick.net', 'doubleclick.net')).toBe(
      false,
    );
  });

  it('does not confuse unicode lookalikes with ASCII rules', () => {
    expect(matchesHostnameRule('dоfuz.com', 'dofuz.com')).toBe(false);
  });

  it('accepts wildcard-form rules without weakening matching', () => {
    expect(matchesHostnameRule('ads.example.com', '*.example.com')).toBe(true);
    expect(matchesHostnameRule('notexample.com', '*.example.com')).toBe(false);
  });

  it('rejects empty hosts and rules', () => {
    expect(matchesHostnameRule('', 'example.com')).toBe(false);
    expect(matchesHostnameRule('example.com', '')).toBe(false);
  });
});

describe('matchesAnyHostnameRule', () => {
  it('matches against a rule collection', () => {
    expect(
      matchesAnyHostnameRule('video.dofuz.com', [
        'movix.luxe',
        'dofuz.com',
      ]),
    ).toBe(true);
  });

  it('returns false when no rule matches', () => {
    expect(matchesAnyHostnameRule('player.example', ['movix.luxe'])).toBe(false);
  });
});
