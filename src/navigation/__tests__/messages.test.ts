import {parsePageGuardMessage} from '../messages';

const message = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: 'kaylane:navigation-intent',
    url: '/watch',
    openerUrl: 'https://movix.luxe/home',
    source: 'blank-target',
    userInitiated: true,
    ...overrides,
  });

describe('parsePageGuardMessage', () => {
  it('parses a valid navigation intent and normalizes the opener URL', () => {
    expect(parsePageGuardMessage(message())).toEqual({
      type: 'kaylane:navigation-intent',
      url: '/watch',
      openerUrl: 'https://movix.luxe/home',
      source: 'blank-target',
      userInitiated: true,
    });
  });

  it('accepts protocol-relative and special-scheme destinations for policy review', () => {
    expect(
      parsePageGuardMessage(message({url: '//player.example/video'}))?.url,
    ).toBe('//player.example/video');
    expect(parsePageGuardMessage(message({url: 'about:blank'}))?.url).toBe(
      'about:blank',
    );
  });

  it('rejects malformed JSON, arrays and unrelated messages', () => {
    expect(parsePageGuardMessage('{nope')).toBeNull();
    expect(parsePageGuardMessage('[]')).toBeNull();
    expect(parsePageGuardMessage(JSON.stringify({type: 'other'}))).toBeNull();
  });

  it('rejects unsupported message sources', () => {
    expect(parsePageGuardMessage(message({source: 'page'}))).toBeNull();
    expect(parsePageGuardMessage(message({source: 'redirect'}))).toBeNull();
  });

  it('rejects missing, malformed and non-HTTPS opener URLs', () => {
    expect(
      parsePageGuardMessage(
        JSON.stringify({
          type: 'kaylane:navigation-intent',
          url: '/watch',
          source: 'window.open',
          userInitiated: true,
        }),
      ),
    ).toBeNull();
    expect(parsePageGuardMessage(message({openerUrl: 'not a url'}))).toBeNull();
    expect(
      parsePageGuardMessage(message({openerUrl: 'http://movix.luxe/'})),
    ).toBeNull();
    expect(
      parsePageGuardMessage(message({openerUrl: 'javascript:alert(1)'})),
    ).toBeNull();
  });

  it('rejects empty destinations and invalid userInitiated values', () => {
    expect(parsePageGuardMessage(message({url: '   '}))).toBeNull();
    expect(parsePageGuardMessage(message({userInitiated: 'true'}))).toBeNull();
  });

  it('rejects oversized bridge messages and URLs', () => {
    expect(parsePageGuardMessage('x'.repeat(8193))).toBeNull();
    expect(
      parsePageGuardMessage(
        message({url: `https://x.test/${'a'.repeat(4096)}`}),
      ),
    ).toBeNull();
  });

  it('ignores extra fields without widening the accepted schema', () => {
    expect(parsePageGuardMessage(message({forgedExtraField: 'ignored'}))).toEqual({
      type: 'kaylane:navigation-intent',
      url: '/watch',
      openerUrl: 'https://movix.luxe/home',
      source: 'blank-target',
      userInitiated: true,
    });
  });
});
