import {createPageGuardScript} from './pageGuard';

describe('createPageGuardScript', () => {
  const script = createPageGuardScript();

  it('is explicitly idempotent and versioned', () => {
    expect(script).toContain('if (window.__KAYLANE_TV_GUARD__)');
    expect(script).toContain('version: 2');
  });

  it('neutralizes window.open without creating another browsing context', () => {
    expect(script).toContain("window.open = function (url)");
    expect(script).toContain("postNavigationIntent(url, 'window.open'");
    expect(script).toContain('return null;');
  });

  it('handles dynamic new-context links and form targets', () => {
    expect(script).toContain('targetCreatesNewContext');
    expect(script).toContain("anchor.relList.contains('external')");
    expect(script).toContain("document.addEventListener('submit'");
    expect(script).toContain('HTMLFormElement.prototype.submit');
  });

  it('uses trusted browser events for remote/pointer activation hints', () => {
    expect(script).toContain('event.isTrusted === true');
    expect(script).toContain("event.key === 'Enter' || event.key === ' '");
  });

  it('observes only bounded DOM changes and iframe/base attributes', () => {
    expect(script).toContain('mutation.addedNodes.forEach(cleanNode)');
    expect(script).toContain("attributeFilter: ['src', 'target']");
    expect(script).not.toContain('setInterval(');
    expect(script).not.toContain('requestAnimationFrame(');
  });
});
