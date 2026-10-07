import {parsePageGuardMessage} from '../messages';

describe('parsePageGuardMessage', () => {
  it('parses a valid navigation intent', () => {
    expect(
      parsePageGuardMessage(
        JSON.stringify({
          type: 'kaylane:navigation-intent',
          url: '/watch',
          openerUrl: 'https://movix.luxe/home',
          source: 'blank-target',
          userInitiated: true,
        }),
      ),
    ).toEqual({
      type: 'kaylane:navigation-intent',
      url: '/watch',
      openerUrl: 'https://movix.luxe/home',
      source: 'blank-target',
      userInitiated: true,
    });
  });

  it('rejects malformed and unrelated messages', () => {
    expect(parsePageGuardMessage('{nope')).toBeNull();
    expect(parsePageGuardMessage(JSON.stringify({type: 'other'}))).toBeNull();
  });

  it('rejects navigation intents without an opener URL', () => {
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
  });
});
