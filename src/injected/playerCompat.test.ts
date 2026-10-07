import {createPlayerCompatibilityScript} from './playerCompat';

describe('createPlayerCompatibilityScript', () => {
  const script = createPlayerCompatibilityScript();

  it('is idempotent and exposes a media compatibility API', () => {
    expect(script).toContain('window.__KAYLANE_TV_MEDIA__');
    expect(script).toContain('version: 1');
    expect(script).toContain("window, '__KAYLANE_TV_MEDIA_API__'");
    expect(script).toContain('retryPlayers: retryPlayers');
    expect(script).toContain('getStatus: getStatus');
  });

  it('enhances HTML5 media without replacing player implementations', () => {
    expect(script).toContain('element.disableRemotePlayback = true');
    expect(script).toContain('element.playsInline = true');
    expect(script).toContain("setAttribute('playsinline'");
    expect(script).not.toContain('navigator.mediaSession.setActionHandler');
  });

  it('retries native media conservatively and avoids blob/MSE reloads', () => {
    expect(script).toContain('element.error || element.readyState === 0');
    expect(script).toContain("indexOf('blob:') !== 0");
    expect(script).toContain('!element.srcObject');
    expect(script).toContain('element.load()');
  });

  it('can reload only the largest visible player iframe as a manual fallback', () => {
    expect(script).toContain('reloadLargestPlayerFrame');
    expect(script).toContain('visibleFrameArea');
    expect(script).toContain("document.querySelectorAll('iframe[src]')");
  });

  it('does not poll continuously', () => {
    expect(script).not.toContain('setInterval(');
    expect(script).not.toContain('requestAnimationFrame(');
  });
});
