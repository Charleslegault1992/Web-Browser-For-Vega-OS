import {parsePageGuardMessage} from '../messages';

describe('parsePageGuardMessage', () => {
  it('parses a valid navigation intent', () => {
    expect(
      parsePageGuardMessage(
        JSON.stringify({
          type: 'kaylane:navigation-intent',
          url: 'https://movix.luxe/watch',
          source: 'blank-target',
          userInitiated: true,
        }),
      ),
    ).toEqual({
      type: 'kaylane:navigation-intent',
      url: 'https://movix.luxe/watch',
      source: 'blank-target',
      userInitiated: true,
    });
  });

  it('rejects malformed and unrelated messages', () => {
    expect(parsePageGuardMessage('{nope')).toBeNull();
    expect(parsePageGuardMessage(JSON.stringify({type: 'other'}))).toBeNull();
  });
});
