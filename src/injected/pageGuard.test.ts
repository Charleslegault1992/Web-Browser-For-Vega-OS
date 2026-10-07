import {createPageGuardScript} from './pageGuard';

describe('createPageGuardScript', () => {
  const script = createPageGuardScript();

  it('is explicitly idempotent and versioned', () => {
    expect(script).toContain('if (window.__KAYLANE_TV_GUARD__)');
    expect(script).toContain('version: 4');
  });

  it('neutralizes and locks window.open without creating another context', () => {
    expect(script).toContain('var guardedWindowOpen = function (url)');
    expect(script).toContain("Object.defineProperty(window, 'open'");
    expect(script).toContain("Object.defineProperty(Window.prototype, 'open'");
    expect(script).toContain("postNavigationIntent(url, 'window.open'");
    expect(script).toContain('return window;');
  });

  it('routes same-origin/primary-site popups synchronously in one WebView', () => {
    expect(script).toContain('tryNavigateInCurrentWindow');
    expect(script).toContain('window.location.assign(destination.href)');
    expect(script).toContain('isPrimaryHostname(current.hostname)');
    expect(script).toContain('isPrimaryHostname(destination.hostname)');
    expect(script).toContain('return window;');
  });

  it('handles dynamic new-context links and form targets', () => {
    expect(script).toContain('targetCreatesNewContext');
    expect(script).toContain("anchor.relList.contains('external')");
    expect(script).toContain("document.addEventListener('submit'");
    expect(script).toContain('HTMLFormElement.prototype.submit');
    expect(script).toContain("button[formtarget],input[formtarget]");
  });

  it('uses trusted browser events for remote/pointer activation hints', () => {
    expect(script).toContain('event.isTrusted === true');
    expect(script).toContain("event.key === 'Enter' || event.key === ' '");
    expect(script).toContain('event.isTrusted === true || isTrustedGesture()');
  });

  it('observes only bounded DOM changes and iframe/base attributes', () => {
    expect(script).toContain('mutation.addedNodes.forEach(cleanNode)');
    expect(script).toContain("attributeFilter: ['src', 'target', 'formtarget']");
    expect(script).not.toContain('setInterval(');
    expect(script).not.toContain('requestAnimationFrame(');
  });
});
