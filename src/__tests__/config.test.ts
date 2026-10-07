import {APP_CONFIG} from '../config';

describe('APP_CONFIG', () => {
  it('keeps the home URL HTTPS-only and inside the supported origins', () => {
    const home = new URL(APP_CONFIG.homeUrl);

    expect(home.protocol).toBe('https:');
    expect(APP_CONFIG.supportedOrigins).toContain(home.origin);
  });

  it('contains only normalized unique HTTPS origins', () => {
    const origins = APP_CONFIG.supportedOrigins.map(origin => {
      const parsed = new URL(origin);
      expect(parsed.protocol).toBe('https:');
      expect(parsed.origin).toBe(origin);
      expect(parsed.pathname).toBe('/');
      expect(parsed.search).toBe('');
      expect(parsed.hash).toBe('');
      return parsed.origin;
    });

    expect(new Set(origins).size).toBe(origins.length);
  });
});
