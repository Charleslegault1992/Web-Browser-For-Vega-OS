import {resolvePreferredDestinationIndex} from '../homeFocusPolicy';

const destinations = [
  {url: 'https://movix.luxe/'},
  {url: 'https://dofuz.com/'},
] as const;

describe('resolvePreferredDestinationIndex', () => {
  it('prefers the first destination on initial home entry', () => {
    expect(resolvePreferredDestinationIndex(destinations)).toBe(0);
  });

  it('restores the preferred home destination when it still exists', () => {
    expect(
      resolvePreferredDestinationIndex(
        destinations,
        'https://dofuz.com/',
      ),
    ).toBe(1);
  });

  it('falls back to the first destination for a stale preference', () => {
    expect(
      resolvePreferredDestinationIndex(
        destinations,
        'https://example.com/',
      ),
    ).toBe(0);
  });

  it('returns -1 when there is nothing focusable', () => {
    expect(resolvePreferredDestinationIndex([], 'https://dofuz.com/')).toBe(
      -1,
    );
  });
});
