import {createPageGuardScript} from './pageGuard';

describe('createPageGuardScript', () => {
  const script = createPageGuardScript();

  it('is explicitly idempotent and versioned', () => {
    expect(script).toContain('if (window.__KAYLANE_TV_GUARD__)');
    expect(script).toContain('version: 14');
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
    expect(script).toContain("var frames = node.querySelectorAll('iframe[src]')");
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

  it('blocks all modal overlays including robot / human verification prompts', () => {
    expect(script).toContain('function isLikelyPlaybackModal(node, aggressive)');
    expect(script).toContain('function looksLikeVerificationModal(node)');
    expect(script).toContain("text.indexOf('scan the qr')");
    expect(script).toContain("text.indexOf('not a robot')");
    expect(script).toContain("text.indexOf('verify you')");
    expect(script).toContain("text.indexOf('human verification')");
    expect(script).toContain('function removeObviousStandaloneAdModal(node)');
    expect(script).not.toContain('function isVerificationSurface(node)');
    expect(script).not.toContain('function isTrustedVerificationUrl(url)');
  });

  it('blocks browser dialogs globally', () => {
    expect(script).toContain('window.alert = function ()');
    expect(script).toContain('window.confirm = function ()');
    expect(script).toContain('window.prompt = function ()');
    expect(script).toContain('function installNonPrimaryModalCssShield()');
  });

  it('exposes manual popup cleanup APIs for remote recovery', () => {
    expect(script).toContain('function closePopupAt(clientX, clientY)');
    expect(script).toContain('function closeAllPopups()');
    expect(script).toContain('function isManualPopupCandidate(node)');
    expect(script).toContain('closePopupAt: closePopupAt');
    expect(script).toContain('closeAllPopups: closeAllPopups');
    expect(script).toContain('isSourceSelectionSurface(node)');
    expect(script).toContain('containsLargePlayerFrame(node)');
  });

  it('keeps playback cleanup bounded and batches DOM mutations', () => {
    expect(script).toContain('function sweepAddedOverlayTree(root)');
    expect(script).toContain('var MAX_ADDED_NODE_SCAN = 40');
    expect(script).toContain('var MAX_ALWAYS_MODAL_SCAN = 32');
    expect(script).toContain('var MAX_MUTATION_QUEUE = 80');
    expect(script).toContain('function queueMutationNode(node)');
    expect(script).toContain('function flushMutationQueue()');
    expect(script).toContain('window.requestAnimationFrame(flushMutationQueue)');
    expect(script).toContain('mutation.addedNodes.forEach(queueMutationNode)');
    expect(script).toContain('containsLargePlayerFrame(node)');
  });

  it('preserves source/server chooser UI on Movix/Dofuz primary pages', () => {
    expect(script).toContain('function isSourceSelectionSurface(node)');
    expect(script).toContain("'source'");
    expect(script).toContain("'server'");
    expect(script).toContain("'serveur'");
    expect(script).toContain("'mirror'");
    expect(script).toContain("'lecteur'");
    expect(script).toContain('interactiveCount >= 2');
    expect(script).toContain('!nodeHasBlockedHost(current)');
    expect(script).toContain('!nodeHasExternalEscape(current)');
    expect(script).toContain('isSourceSelectionSurface(node)');
  });

  it('does not arm the aggressive shield from generic player wrappers on primary pages', () => {
    expect(script).toContain("target.closest('video,audio,iframe')");
    expect(script).toContain("!isPrimaryHost(window.location.hostname)");
    expect(script).toContain(
      "'[class*=\"player\"],[id*=\"player\"],[class*=\"video\"],[id*=\"video\"]'",
    );
    expect(script).not.toContain("playerTarget || visibleMediaCoverage() >= 0.08");
  });

  it('rechecks overlays on bounded DOM/style/modal changes without polling', () => {
    expect(script).toContain("'aria-modal'");
    expect(script).toContain("'aria-hidden'");
    expect(script).toContain("'open'");
    expect(script).not.toContain('setInterval(');
  });
});
