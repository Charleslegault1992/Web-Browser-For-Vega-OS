import {createRemotePointerScript} from './remotePointer';

describe('createRemotePointerScript', () => {
  const script = createRemotePointerScript();

  it('is idempotent and exposes the v9 pointer API', () => {
    expect(script).toContain('window.__KAYLANE_TV_POINTER__');
    expect(script).toContain('version: 9');
    expect(script).toContain('window, \'__KAYLANE_TV_POINTER_API__\'');
    expect(script).toContain('setMode: setMode');
    expect(script).toContain('setDirection: setDirection');
    expect(script).toContain('setDeleteMode: setDeleteMode');
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

  it('keeps normal OK as activation only and deletion strictly opt-in', () => {
    expect(script).toContain('function toggleMedia(target)');
    expect(script).toContain('var result = media.play()');
    expect(script).toContain('media.pause()');
    expect(script).toContain('var deleteMode = false');
    expect(script).toContain('function setDeleteMode(enabled, shouldAnnounce)');
    expect(script).toContain('function deleteElementAtPointer()');
    expect(script).toContain('__KAYLANE_TV_GUARD_API__.deleteElementAt');
    expect(script).toContain("if (deleteMode)");
    expect(script).toContain('Normal pointer mode never deletes DOM elements');
    expect(script).not.toContain('function closePopupAtPointer()');
    expect(script).not.toContain('function dismissTopmostPopupFrame(frame)');
    expect(script).not.toContain('function isNearTopRightOfFrame(frame)');
  });

  it('shows a distinct red cursor when delete mode is enabled', () => {
    expect(script).toContain("cursor.style.borderColor = deleteMode ? '#ff4d5e' : '#ffffff'");
    expect(script).toContain("'Supprimer élément : ON'");
    expect(script).toContain("'Supprimer élément : OFF'");
    expect(script).toContain("'Vidéo protégée'");
  });

  it('promotes only the actual topmost iframe hit by the pointer', () => {
    expect(script).toContain('var hit = deepElementAtPointer()');
    expect(script).toContain("hit.tagName === 'IFRAME'");
    expect(script).toContain('frameArea(hit) > 0');
    expect(script).toContain('promoteFrame(hit)');
    expect(script).toContain('promoteLargestEmbeddedPlayer');
    expect(script).toContain('kaylane-player-promote');
  });


});
