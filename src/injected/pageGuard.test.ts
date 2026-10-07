import {createPageGuardScript} from './pageGuard';

describe('createPageGuardScript', () => {
  const script = createPageGuardScript();

  it('is explicitly idempotent and versioned', () => {
    expect(script).toContain('if (window.__KAYLANE_TV_GUARD__)');
    expect(script).toContain('version: 5');
  });

  it('locks window.open and ignores it without navigating', () => {
    expect(script).toContain('var guardedWindowOpen = function ()');
    expect(script).toContain("Object.defineProperty(window, 'open'");
    expect(script).toContain("Object.defineProperty(Window.prototype, 'open'");
    expect(script).toContain('return window;');
    expect(script).not.toContain('window.location.assign(');
    expect(script).not.toContain('postNavigationIntent(');
  });

  it('ignores explicit new-context links instead of recycling them in-place', () => {
    expect(script).toContain('anchorCreatesNewContext');
    expect(script).toContain("anchor.relList.contains('external')");
    expect(script).toContain('consumeNewContextEvent(event)');
    expect(script).not.toContain('tryNavigateInCurrentWindow');
  });

  it('ignores explicit new-context forms but leaves same-window forms native', () => {
    expect(script).toContain('submitCreatesNewContext');
    expect(script).toContain("document.addEventListener('submit'");
    expect(script).toContain('HTMLFormElement.prototype.submit');
    expect(script).toContain('return nativeFormSubmit.apply(this, arguments)');
  });

  it('accounts for base[target] when deciding whether a link opens another context', () => {
    expect(script).toContain("document.querySelector('base[target]')");
    expect(script).toContain('defaultBaseTarget()');
  });

  it('observes only bounded DOM changes for blocked iframe cleanup', () => {
    expect(script).toContain('mutation.addedNodes.forEach(cleanNode)');
    expect(script).toContain("attributeFilter: ['src']");
    expect(script).not.toContain('setInterval(');
    expect(script).not.toContain('requestAnimationFrame(');
  });
});
