import {createRemotePointerScript} from './remotePointer';

describe('createRemotePointerScript', () => {
  const script = createRemotePointerScript();

  it('is idempotent and exposes the v3 pointer API', () => {
    expect(script).toContain('window.__KAYLANE_TV_POINTER__');
    expect(script).toContain('version: 4');
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

  it('uses a frame-timed velocity model for smooth movement', () => {
    expect(script).toContain('window.requestAnimationFrame(tick)');
    expect(script).toContain('var ACCELERATION = 3000');
    expect(script).toContain('var MAX_SPEED = 1050');
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
    expect(script).toContain('document.elementsFromPoint(x, y)');
    expect(script).toContain("element.tagName === 'IFRAME'");
    expect(script).toContain('frameArea(element) > 0');
    expect(script).toContain('kaylane-player-promote');
    expect(script).toContain('promoteEmbeddedPlayerAtPointer');
    expect(script).toContain('BLOCKED_HOSTS');
  });


});
