import {createRemotePointerScript} from './remotePointer';

describe('createRemotePointerScript', () => {
  const script = createRemotePointerScript();

  it('is idempotent and exposes the v8 pointer API', () => {
    expect(script).toContain('window.__KAYLANE_TV_POINTER__');
    expect(script).toContain('version: 8');
    expect(script).toContain('window, \'__KAYLANE_TV_POINTER_API__\'');
    expect(script).toContain('setMode: setMode');
    expect(script).toContain('setDirection: setDirection');
    expect(script).toContain('activate: activate');
  });

  it('renders a non-intercepting cursor overlay', () => {
    expect(script).toContain("cursor.style.pointerEvents = 'none'");
    expect(script).toContain("cursor.style.zIndex = '2147483647'");
  });

  it('keeps the pointer attached when fullscreen changes', () => {
    expect(script).toContain('document.fullscreenElement');
    expect(script).toContain('document.webkitFullscreenElement');
    expect(script).toContain("document.addEventListener('fullscreenchange'");
    expect(script).toContain("document.addEventListener('webkitfullscreenchange'");
    expect(script).toContain('ensureUiAttached()');
  });

  it('supports pointer and native focus modes', () => {
    expect(script).toContain("nextMode === 'focus' ? 'focus' : 'pointer'");
    expect(script).toContain("mode === 'pointer' ? 'focus' : 'pointer'");
    expect(script).toContain("cursor.style.display = mode === 'pointer' ? 'block' : 'none'");
    expect(script).toContain('Mode pointeur');
    expect(script).toContain('Mode sélection');
    expect(script).toContain("modeBadge.style.opacity = '0'");
  });

  it('uses a precision-first frame-timed velocity model', () => {
    expect(script).toContain('window.requestAnimationFrame(tick)');
    expect(script).toContain('var PRECISION_NUDGE = 7');
    expect(script).toContain('var PRECISION_SPEED = 120');
    expect(script).toContain('var PRECISION_HOLD_MS = 170');
    expect(script).toContain('var ACCELERATION = 1450');
    expect(script).toContain('var MAX_SPEED = 650');
    expect(script).toContain('var FRICTION = 18');
    expect(script).toContain('applyPrecisionNudge(key)');
    expect(script).toContain('heldMs < PRECISION_HOLD_MS');
    expect(script).toContain('Math.exp(-FRICTION * dt)');
    expect(script).toContain('velocityX * dt');
    expect(script).toContain('velocityY * dt');
  });

  it('scrolls continuously at vertical edges without permanent polling', () => {
    expect(script).toContain('EDGE_SCROLL_SPEED * dt');
    expect(script).toContain('window.scrollBy');
    expect(script).not.toContain('setInterval(');
  });

  it('uses robust topmost hit testing and activation events', () => {
    expect(script).toContain('function deepElementAtPointer()');
    expect(script).toContain('document.elementFromPoint(x, y)');
    expect(script).toContain('function interactiveTarget(target)');
    expect(script).toContain("new PointerEvent(type");
    expect(script).toContain("dispatchPointerEvent(target, 'pointerdown')");
    expect(script).toContain("dispatchMouseEvent(target, 'mousedown')");
    expect(script).toContain('target.click()');
  });

  it('uses direct media playback and popup-close fallbacks for OK', () => {
    expect(script).toContain('function toggleMedia(target)');
    expect(script).toContain('var result = media.play()');
    expect(script).toContain('media.pause()');
    expect(script).toContain('function isCloseTarget(target)');
    expect(script).toContain('function closePopupAtPointer()');
    expect(script).toContain('__KAYLANE_TV_GUARD_API__.closePopupAt');
  });

  it('dismisses a popup iframe close-corner before considering player promotion', () => {
    expect(script).toContain('function isNearTopRightOfFrame(frame)');
    expect(script).toContain('function dismissTopmostPopupFrame(frame)');
    expect(script).toContain('__KAYLANE_TV_GUARD_API__.dismissPopupFrameAt');
    expect(script).toContain('isNearTopRightOfFrame(hit)');
    expect(script).toContain('dismissTopmostPopupFrame(hit)');
    expect(script).toContain('promoteFrame(hit)');
  });

  it('promotes an iframe only when that iframe is the topmost hit target', () => {
    expect(script).toContain("hit.tagName === 'IFRAME'");
    expect(script).toContain('frameArea(hit) > 0');
    expect(script).toContain(
      'Only promote when the iframe itself is the TOPMOST hit target',
    );
    expect(script).toContain('promoteLargestEmbeddedPlayer');
    expect(script).toContain('kaylane-player-promote');
  });


});
