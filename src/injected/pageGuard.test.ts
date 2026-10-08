import {createPageGuardScript} from './pageGuard';

describe('createPageGuardScript', () => {
  const script = createPageGuardScript();

  it('is explicitly idempotent and versioned', () => {
    expect(script).toContain('if (window.__KAYLANE_TV_GUARD__)');
    expect(script).toContain('version: 7');
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
    expect(script).toContain('preventNavigationDefault(event)');
  });

  it('cancels scripted same-tab escapes when the Navigation API is available', () => {
    expect(script).toContain('window.navigation');
    expect(script).toContain("addEventListener('navigate'");
    expect(script).toContain('event.destination.url');
    expect(script).toContain('event.preventDefault()');
  });

  it('keeps site click handlers alive while preventing default escape navigation', () => {
    expect(script).toContain('event.preventDefault()');
    expect(script).not.toContain('event.stopImmediatePropagation()');
    expect(script).not.toContain('event.stopPropagation()');
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

  it('removes only large external overlay candidates on primary top pages', () => {
    expect(script).toContain('function isLikelyAdOverlay(node)');
    expect(script).toContain('coverage < 0.18');
    expect(script).toContain('zIndex < 50');
    expect(script).toContain('touchesFullscreenTree(node)');
    expect(script).toContain('nodeHasExternalEscape(node)');
    expect(script).toContain('removeLikelyAdOverlay(anchor)');
  });

  it('rechecks overlays on bounded DOM/style changes without polling', () => {
    expect(script).toContain('mutation.addedNodes.forEach(cleanNode)');
    expect(script).toContain("attributeFilter: ['src', 'href', 'style', 'class']");
    expect(script).not.toContain('setInterval(');
  });
});
