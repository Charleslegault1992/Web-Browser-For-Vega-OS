import {createRemotePointerScript} from './remotePointer';

describe('createRemotePointerScript', () => {
  const script = createRemotePointerScript();

  it('is idempotent and renders a non-intercepting cursor overlay', () => {
    expect(script).toContain('window.__KAYLANE_TV_POINTER__');
    expect(script).toContain('version: 2');
    expect(script).toContain("cursor.style.pointerEvents = 'none'");
    expect(script).toContain("cursor.style.zIndex = '2147483647'");
  });

  it('maps D-pad arrows and Enter to pointer movement/activation', () => {
    expect(script).toContain("event.key === 'Enter'");
    expect(script).toContain("keys[event.key] = true");
    expect(script).toContain("keys[event.key] = false");
    expect(script).toContain('event.preventDefault()');
    expect(script).toContain('activate();');
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
});
