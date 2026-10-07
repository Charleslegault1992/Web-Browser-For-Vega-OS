import {createRemotePointerScript} from './remotePointer';

describe('createRemotePointerScript', () => {
  const script = createRemotePointerScript();

  it('is idempotent and renders a non-intercepting cursor overlay', () => {
    expect(script).toContain('window.__KAYLANE_TV_POINTER__');
    expect(script).toContain("cursor.style.pointerEvents = 'none'");
    expect(script).toContain("cursor.style.zIndex = '2147483647'");
  });

  it('maps D-pad arrows and Enter to pointer movement/activation', () => {
    expect(script).toContain("case 'ArrowLeft'");
    expect(script).toContain("case 'ArrowRight'");
    expect(script).toContain("case 'ArrowUp'");
    expect(script).toContain("case 'ArrowDown'");
    expect(script).toContain("case 'Enter'");
    expect(script).toContain('event.preventDefault()');
    expect(script).toContain('activate();');
  });

  it('uses hit testing and click compatibility without polling', () => {
    expect(script).toContain('document.elementFromPoint(x, y)');
    expect(script).toContain('target.click()');
    expect(script).toContain('window.scrollBy');
    expect(script).not.toContain('setInterval(');
    expect(script).not.toContain('requestAnimationFrame(');
  });
});
