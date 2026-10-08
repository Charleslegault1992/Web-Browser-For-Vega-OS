import {
  decideTopLevelNavigation,
  shouldAllowWebViewNavigation,
} from '../policy';

const popup = (overrides: Record<string, unknown> = {}) => ({
  url: 'https://player.example/video',
  openerUrl: 'https://movix.luxe/home',
  source: 'window.open' as const,
  userInitiated: true,
  ...overrides,
});

describe('decideTopLevelNavigation', () => {
  it('allows ordinary HTTPS navigation', () => {
    expect(
      decideTopLevelNavigation({
        url: 'https://example.com/video',
        source: 'page',
        userInitiated: false,
      }),
    ).toEqual({
      action: 'allow',
      reason: 'https-navigation',
      url: 'https://example.com/video',
    });
  });

  it('resolves relative popup URLs against a valid HTTPS opener', () => {
    expect(
      decideTopLevelNavigation(
        popup({url: '/watch/123', openerUrl: 'https://movix.luxe/home'}),
      ),
    ).toEqual({
      action: 'same-window',
      reason: 'trusted-popup',
      url: 'https://movix.luxe/watch/123',
    });
  });

  it('resolves protocol-relative popup URLs using HTTPS', () => {
    expect(
      decideTopLevelNavigation(popup({url: '//player.example/watch'})),
    ).toEqual({
      action: 'same-window',
      reason: 'trusted-popup',
      url: 'https://player.example/watch',
    });
  });

  it('preserves encoded paths instead of decoding or rewriting them', () => {
    expect(
      decideTopLevelNavigation(
        popup({url: '/watch/%2Fepisode%3Fid%3D1'}),
      ),
    ).toEqual({
      action: 'same-window',
      reason: 'trusted-popup',
      url: 'https://movix.luxe/watch/%2Fepisode%3Fid%3D1',
    });
  });

  it('blocks empty, malformed and relative URLs without a popup opener', () => {
    expect(
      decideTopLevelNavigation({url: '', source: 'page', userInitiated: false}),
    ).toEqual({action: 'block', reason: 'invalid-url'});
    expect(
      decideTopLevelNavigation({
        url: 'https://[invalid',
        source: 'page',
        userInitiated: false,
      }),
    ).toEqual({action: 'block', reason: 'invalid-url'});
    expect(
      decideTopLevelNavigation({
        url: '/relative',
        source: 'page',
        userInitiated: false,
      }),
    ).toEqual({action: 'block', reason: 'invalid-url'});
  });

  it('rejects popup messages without a valid HTTPS opener', () => {
    expect(
      decideTopLevelNavigation(
        popup({openerUrl: undefined}),
      ),
    ).toEqual({action: 'block', reason: 'invalid-opener'});
    expect(
      decideTopLevelNavigation(popup({openerUrl: 'http://movix.luxe/'})),
    ).toEqual({action: 'block', reason: 'invalid-opener'});
    expect(
      decideTopLevelNavigation(popup({openerUrl: 'javascript:alert(1)'})),
    ).toEqual({action: 'block', reason: 'invalid-opener'});
  });

  it('blocks cleartext HTTP', () => {
    expect(
      decideTopLevelNavigation({
        url: 'http://example.com/',
        source: 'page',
        userInitiated: true,
      }),
    ).toEqual({action: 'block', reason: 'insecure-http'});
  });

  it.each([
    'about:blank',
    'javascript:alert(1)',
    'data:text/html,hello',
    'blob:https://movix.luxe/id',
    'mailto:test@example.com',
    'tel:+15555555555',
    'intent://example/#Intent;scheme=https;end',
    'custom-scheme://example',
  ])('blocks unsupported top-level scheme: %s', url => {
    expect(
      decideTopLevelNavigation({url, source: 'page', userInitiated: true}),
    ).toEqual({action: 'block', reason: 'unsupported-scheme'});
  });

  it('blocks known ad hosts and their real subdomains', () => {
    expect(
      decideTopLevelNavigation({
        url: 'https://sub.doubleclick.net/click',
        source: 'redirect',
        userInitiated: false,
      }),
    ).toEqual({action: 'block', reason: 'blocked-ad-host'});
  });

  it('blocks uppercase and trailing-dot forms of known ad hosts', () => {
    expect(
      decideTopLevelNavigation({
        url: 'https://SUB.DOUBLECLICK.NET./click',
        source: 'redirect',
        userInitiated: false,
      }),
    ).toEqual({action: 'block', reason: 'blocked-ad-host'});
  });

  it('does not false-positive on evil suffix/lookalike domains', () => {
    expect(
      decideTopLevelNavigation({
        url: 'https://notdoubleclick.net/watch',
        source: 'page',
        userInitiated: false,
      }),
    ).toEqual({
      action: 'allow',
      reason: 'https-navigation',
      url: 'https://notdoubleclick.net/watch',
    });
    expect(
      decideTopLevelNavigation({
        url: 'https://doubleclick.net.evil.example/watch',
        source: 'page',
        userInitiated: false,
      }),
    ).toEqual({
      action: 'allow',
      reason: 'https-navigation',
      url: 'https://doubleclick.net.evil.example/watch',
    });
  });

  it('keeps a trusted third-party popup in the same window', () => {
    expect(decideTopLevelNavigation(popup())).toEqual({
      action: 'same-window',
      reason: 'trusted-popup',
      url: 'https://player.example/video',
    });
  });

  it('blocks a known ad host even when the popup claims a trusted gesture', () => {
    expect(
      decideTopLevelNavigation(popup({url: 'https://doubleclick.net/click'})),
    ).toEqual({action: 'block', reason: 'blocked-ad-host'});
  });

  it('keeps a delayed third-party popup from a priority opener in the same window', () => {
    expect(
      decideTopLevelNavigation(popup({userInitiated: false})),
    ).toEqual({
      action: 'same-window',
      reason: 'primary-opener-popup',
      url: 'https://player.example/video',
    });
  });

  it('still blocks an untrusted third-party popup from an unrelated opener', () => {
    expect(
      decideTopLevelNavigation(
        popup({
          openerUrl: 'https://unrelated.example/watch',
          userInitiated: false,
        }),
      ),
    ).toEqual({action: 'block', reason: 'untrusted-popup'});
  });

  it('keeps an untrusted primary-host popup in the current window', () => {
    expect(
      decideTopLevelNavigation(
        popup({
          url: 'https://www.dofuz.com/watch',
          userInitiated: false,
        }),
      ),
    ).toEqual({
      action: 'same-window',
      reason: 'primary-host-popup',
      url: 'https://www.dofuz.com/watch',
    });
  });

  it('keeps an untrusted same-origin popup in the current window for compatibility', () => {
    expect(
      decideTopLevelNavigation(
        popup({
          url: 'https://player.example/next',
          openerUrl: 'https://player.example/watch',
          userInitiated: false,
        }),
      ),
    ).toEqual({
      action: 'same-window',
      reason: 'same-origin-popup',
      url: 'https://player.example/next',
    });
  });

  it('does not treat a unicode lookalike of Dofuz as a primary host', () => {
    const decision = decideTopLevelNavigation(
      popup({
        url: 'https://dоfuz.com/watch',
        userInitiated: false,
      }),
    );
    expect(decision).toEqual({
      action: 'same-window',
      reason: 'primary-opener-popup',
      url: 'https://xn--dfuz-55d.com/watch',
    });
  });

  it('does not treat the punycode form of a unicode lookalike as a primary destination', () => {
    expect(
      decideTopLevelNavigation(
        popup({
          url: 'https://xn--dfuz-55d.com/watch',
          openerUrl: 'https://unrelated.example/',
          userInitiated: false,
        }),
      ),
    ).toEqual({action: 'block', reason: 'untrusted-popup'});
  });

  it('does not trust userinfo text that merely looks like the opener host', () => {
    expect(
      decideTopLevelNavigation(
        popup({
          url: 'https://movix.luxe@evil.example/watch',
          openerUrl: 'https://unrelated.example/',
          userInitiated: false,
        }),
      ),
    ).toEqual({action: 'block', reason: 'untrusted-popup'});
  });
});

describe('shouldAllowWebViewNavigation', () => {
  it('allows normal HTTPS navigation including third-party player/CDN-style hosts', () => {
    expect(shouldAllowWebViewNavigation('https://player.example/video')).toBe(
      true,
    );
    expect(shouldAllowWebViewNavigation('https://cdn.example/media/file')).toBe(
      true,
    );
  });

  it('blocks known ad redirects, HTTP and external schemes', () => {
    expect(
      shouldAllowWebViewNavigation('https://sub.doubleclick.net/click'),
    ).toBe(false);
    expect(shouldAllowWebViewNavigation('http://example.com/')).toBe(false);
    expect(shouldAllowWebViewNavigation('intent://example')).toBe(false);
  });
});
