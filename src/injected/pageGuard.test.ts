import {createPageGuardScript} from './pageGuard';

describe('createPageGuardScript', () => {
  const script = createPageGuardScript();

  it('is explicitly idempotent and versioned', () => {
    expect(script).toContain('if (window.__KAYLANE_TV_GUARD__)');
    expect(script).toContain('version: 6');
  });

  it('returns an isolated popup stub instead of the real window', () => {
    expect(script).toContain('function createPopupStub()');
    expect(script).toContain('return createPopupStub();');
    expect(script).toContain('location: createPopupLocationStub()');
    expect(script).toContain('stub.self = stub');
    expect(script).not.toContain('return window;');
  });

  it('keeps popup location assignments inert', () => {
    expect(script).toContain('function createPopupLocationStub()');
    expect(script).toContain('set href(value)');
    expect(script).toContain('assign: function (value)');
    expect(script).toContain('replace: function (value)');
  });

  it('blocks explicit new-context links and same-tab external escapes on primary pages', () => {
    expect(script).toContain('anchorCreatesNewContext');
    expect(script).toContain('isUnwantedPrimaryPageEscape(href)');
    expect(script).toContain('isBlockedHost(href)');
    expect(script).toContain('consumeNavigationEvent(event)');
  });

  it('blocks external forms from primary pages but leaves same-site forms native', () => {
    expect(script).toContain('submitCreatesNewContext');
    expect(script).toContain('isUnwantedPrimaryPageEscape(action)');
    expect(script).toContain('return nativeFormSubmit.apply(this, arguments)');
  });

  it('does not globally block third-party frames/media hosts', () => {
    expect(script).toContain('isPrimaryHost(window.location.hostname)');
    expect(script).toContain("node.querySelectorAll('iframe[src]').forEach(cleanIframe)");
    expect(script).not.toContain("querySelectorAll('iframe').forEach(function");
  });

  it('observes only bounded DOM changes for blocked iframe cleanup', () => {
    expect(script).toContain('mutation.addedNodes.forEach(cleanNode)');
    expect(script).toContain("attributeFilter: ['src']");
    expect(script).not.toContain('setInterval(');
  });
});
