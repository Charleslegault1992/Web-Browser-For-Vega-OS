import {decideTopLevelNavigation} from '../policy';

describe('decideTopLevelNavigation', () => {
  it('allows ordinary HTTPS navigation', () => {
    expect(
      decideTopLevelNavigation({
        url: 'https://example.com/video',
        source: 'page',
        userInitiated: false,
      }),
    ).toEqual({action: 'allow', reason: 'https-navigation'});
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

  it('blocks known ad hosts as top-level destinations', () => {
    expect(
      decideTopLevelNavigation({
        url: 'https://sub.doubleclick.net/click',
        source: 'redirect',
        userInitiated: false,
      }),
    ).toEqual({action: 'block', reason: 'blocked-ad-host'});
  });

  it('keeps a trusted popup in the same window', () => {
    expect(
      decideTopLevelNavigation({
        url: 'https://player.example/video',
        source: 'window.open',
        userInitiated: true,
      }),
    ).toEqual({action: 'same-window', reason: 'trusted-popup'});
  });

  it('blocks an untrusted third-party popup', () => {
    expect(
      decideTopLevelNavigation({
        url: 'https://unknown-popup.example/',
        source: 'window.open',
        userInitiated: false,
      }),
    ).toEqual({action: 'block', reason: 'untrusted-popup'});
  });

  it('keeps same-product-host popups in the current window', () => {
    expect(
      decideTopLevelNavigation({
        url: 'https://www.dofuz.com/watch',
        source: 'window.open',
        userInitiated: false,
      }),
    ).toEqual({action: 'same-window', reason: 'primary-host-popup'});
  });
});
