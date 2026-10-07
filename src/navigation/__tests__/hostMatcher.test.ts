import {
  matchesAnyHostnameRule,
  matchesHostnameRule,
} from '../hostMatcher';

describe('matchesHostnameRule', () => {
  it('matches an exact hostname', () => {
    expect(matchesHostnameRule('movix.luxe', 'movix.luxe')).toBe(true);
  });

  it('matches a real subdomain', () => {
    expect(matchesHostnameRule('cdn.movix.luxe', 'movix.luxe')).toBe(true);
  });

  it('rejects lookalike suffixes', () => {
    expect(matchesHostnameRule('evilmovix.luxe', 'movix.luxe')).toBe(false);
    expect(matchesHostnameRule('movix.luxe.evil.example', 'movix.luxe')).toBe(
      false,
    );
  });

  it('accepts wildcard-form rules without weakening matching', () => {
    expect(matchesHostnameRule('ads.example.com', '*.example.com')).toBe(true);
    expect(matchesHostnameRule('notexample.com', '*.example.com')).toBe(false);
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
});
