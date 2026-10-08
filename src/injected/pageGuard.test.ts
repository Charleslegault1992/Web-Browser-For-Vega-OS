import {createPageGuardScript} from './pageGuard';

describe('createPageGuardScript', () => {
  const script = createPageGuardScript();

  it('is explicitly idempotent and versioned', () => {
    expect(script).toContain('if (window.__KAYLANE_TV_GUARD__)');
    expect(script).toContain('version: 9');
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

  it('allows one explicit promoted-player navigation without opening a second context', () => {
    expect(script).toContain('allowPlayerNavigation');
    expect(script).toContain('allowedPlayerNavigation');
    expect(script).toContain('expiresAt: Date.now() + 6000');
    expect(script).toContain('__KAYLANE_TV_GUARD_API__');
    expect(script).toContain('isAllowedPlayerNavigation(destination.href)');
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

  it('removes large external overlays on primary and promoted player pages', () => {
    expect(script).toContain('function isLikelyAdOverlay(node)');
    expect(script).toContain('coverage < 0.18');
    expect(script).toContain('zIndex < 50');
    expect(script).toContain('touchesFullscreenTree(node)');
    expect(script).toContain('nodeHasBlockedHost(node)');
    expect(script).toContain('visibleMediaCoverage() >= 0.20');
    expect(script).toContain('coverage >= 0.25');
    expect(script).toContain('removeLikelyAdOverlay(anchor)');
  });

  it('arms an event-driven playback modal shield around player interactions', () => {
    expect(script).toContain('function armPlaybackShield(durationMs)');
    expect(script).toContain('var PLAYBACK_SHIELD_MS = 20000');
    expect(script).toContain("document.addEventListener(\n    'play'");
    expect(script).toContain('sweepPlaybackModals(document)');
    expect(script).toContain('isPlaybackShieldActive()');
  });

  it('suppresses modal-like overlays while preserving verification surfaces', () => {
    expect(script).toContain('function isLikelyPlaybackModal(node)');
    expect(script).toContain('function isVerificationSurface(node)');
    expect(script).toContain("'captcha'");
    expect(script).toContain("'turnstile'");
    expect(script).toContain("node.getAttribute('aria-modal') === 'true'");
    expect(script).toContain('coverage >= 0.10');
    expect(script).toContain('zIndex >= 40');
  });

  it('blocks browser dialogs while playback shield is active', () => {
    expect(script).toContain('window.alert = function ()');
    expect(script).toContain('window.confirm = function ()');
    expect(script).toContain('window.prompt = function ()');
    expect(script).toContain('if (isPlaybackShieldActive())');
  });

  it('rechecks overlays on bounded DOM/style/modal changes without polling', () => {
    expect(script).toContain('mutation.addedNodes.forEach(cleanNode)');
    expect(script).toContain("'aria-modal'");
    expect(script).toContain("'aria-hidden'");
    expect(script).toContain("'open'");
    expect(script).not.toContain('setInterval(');
  });
});
