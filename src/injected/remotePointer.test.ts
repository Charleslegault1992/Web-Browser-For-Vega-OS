import {createRemotePointerScript} from './remotePointer';

describe('createRemotePointerScript', () => {
  const script = createRemotePointerScript();

  it('is idempotent and exposes the v5 pointer API', () => {
    expect(script).toContain('window.__KAYLANE_TV_POINTER__');
    expect(script).toContain('version: 5');
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

  it('uses hit testing and native element click compatibility', () => {
    expect(script).toContain('document.elementFromPoint(x, y)');
    expect(script).toContain('target.click()');
  });

  it('promotes a large HTTPS iframe under the pointer instead of fake-clicking across origins', () => {
    expect(script).toContain('function embeddedPlayerAtPointer()');
    expect(script).toMatch(/document\s*\.\s*elementsFromPoint\(x, y\)/);
    expect(script).toContain("element.tagName === 'IFRAME'");
    expect(script).toContain('frameArea(element) > 0');
    expect(script).toContain('kaylane-player-promote');
    expect(script).toContain('promoteEmbeddedPlayerAtPointer');
    expect(script).toContain('promoteLargestEmbeddedPlayer');
    expect(script).toContain("frame.getAttribute('data-src')");
    expect(script).toContain("frame.getAttribute('data-lazy-src')");
    expect(script).toContain('BLOCKED_HOSTS');
  });


});
