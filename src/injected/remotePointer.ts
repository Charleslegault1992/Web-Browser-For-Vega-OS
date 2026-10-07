const CURSOR_STEP_PX = 54;
const CURSOR_DIAMETER_PX = 30;
const EDGE_SCROLL_FRACTION = 0.55;

export const createRemotePointerScript = (): string => `
(function () {
  if (window.__KAYLANE_TV_POINTER__) {
    return true;
  }

  Object.defineProperty(window, '__KAYLANE_TV_POINTER__', {
    value: Object.freeze({ version: 1 }),
    configurable: false,
    enumerable: false,
    writable: false
  });

  var STEP = 54;
  var SIZE = 30;
  var SCROLL_FRACTION = 0.55;
  var x = Math.max(SIZE, Math.round(window.innerWidth / 2));
  var y = Math.max(SIZE, Math.round(window.innerHeight / 2));
  var cursor = null;
  var hoverTarget = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function viewportWidth() {
    return Math.max(SIZE * 2, window.innerWidth || document.documentElement.clientWidth || 1280);
  }

  function viewportHeight() {
    return Math.max(SIZE * 2, window.innerHeight || document.documentElement.clientHeight || 720);
  }

  function createCursor() {
    if (cursor || !document.documentElement) {
      return;
    }

    cursor = document.createElement('div');
    cursor.setAttribute('data-kaylane-pointer', 'true');
    cursor.setAttribute('aria-hidden', 'true');

    var dot = document.createElement('div');

    cursor.style.position = 'fixed';
    cursor.style.left = '0';
    cursor.style.top = '0';
    cursor.style.width = SIZE + 'px';
    cursor.style.height = SIZE + 'px';
    cursor.style.border = '3px solid #ffffff';
    cursor.style.borderRadius = '50%';
    cursor.style.background = 'rgba(0, 0, 0, 0.28)';
    cursor.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.78), 0 2px 12px rgba(0,0,0,0.65)';
    cursor.style.pointerEvents = 'none';
    cursor.style.zIndex = '2147483647';
    cursor.style.boxSizing = 'border-box';
    cursor.style.transform = 'translate3d(0,0,0)';

    dot.style.position = 'absolute';
    dot.style.width = '6px';
    dot.style.height = '6px';
    dot.style.left = '50%';
    dot.style.top = '50%';
    dot.style.marginLeft = '-3px';
    dot.style.marginTop = '-3px';
    dot.style.borderRadius = '50%';
    dot.style.background = '#ffffff';
    dot.style.pointerEvents = 'none';

    cursor.appendChild(dot);
    document.documentElement.appendChild(cursor);
    render();
  }

  function elementAtPointer() {
    if (!document.elementFromPoint) {
      return null;
    }

    return document.elementFromPoint(x, y);
  }

  function dispatchMouseEvent(target, type) {
    if (!target || typeof target.dispatchEvent !== 'function') {
      return;
    }

    try {
      target.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window
      }));
    } catch (_) {
      // Older page shims may not accept MouseEvent constructor options.
    }
  }

  function updateHover() {
    var next = elementAtPointer();

    if (next === hoverTarget) {
      dispatchMouseEvent(next, 'mousemove');
      return;
    }

    dispatchMouseEvent(hoverTarget, 'mouseout');
    hoverTarget = next;
    dispatchMouseEvent(hoverTarget, 'mouseover');
    dispatchMouseEvent(hoverTarget, 'mousemove');
  }

  function render() {
    if (!cursor) {
      return;
    }

    cursor.style.transform =
      'translate3d(' +
      Math.round(x - SIZE / 2) +
      'px,' +
      Math.round(y - SIZE / 2) +
      'px,0)';

    updateHover();
  }

  function scrollAtVerticalEdge(direction) {
    var height = viewportHeight();
    var margin = SIZE;

    if (direction < 0 && y <= margin) {
      window.scrollBy(0, -Math.round(height * SCROLL_FRACTION));
      y = margin;
      return true;
    }

    if (direction > 0 && y >= height - margin) {
      window.scrollBy(0, Math.round(height * SCROLL_FRACTION));
      y = height - margin;
      return true;
    }

    return false;
  }

  function move(dx, dy) {
    createCursor();

    var width = viewportWidth();
    var height = viewportHeight();
    var margin = SIZE;

    x = clamp(x + dx * STEP, margin, width - margin);
    y = clamp(y + dy * STEP, margin, height - margin);

    if (dy !== 0) {
      scrollAtVerticalEdge(dy);
    }

    render();
  }

  function activate() {
    createCursor();

    var target = elementAtPointer();
    if (!target || target === cursor) {
      return;
    }

    if (typeof target.focus === 'function') {
      try {
        target.focus({ preventScroll: true });
      } catch (_) {
        try {
          target.focus();
        } catch (_) {}
      }
    }

    dispatchMouseEvent(target, 'mousedown');
    dispatchMouseEvent(target, 'mouseup');

    if (typeof target.click === 'function') {
      target.click();
    } else {
      dispatchMouseEvent(target, 'click');
    }
  }

  function consume(event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
  }

  document.addEventListener('keydown', function (event) {
    switch (event.key) {
      case 'ArrowLeft':
        consume(event);
        move(-1, 0);
        break;
      case 'ArrowRight':
        consume(event);
        move(1, 0);
        break;
      case 'ArrowUp':
        consume(event);
        move(0, -1);
        break;
      case 'ArrowDown':
        consume(event);
        move(0, 1);
        break;
      case 'Enter':
        consume(event);
        activate();
        break;
    }
  }, true);

  window.addEventListener('resize', function () {
    var margin = SIZE;
    x = clamp(x, margin, viewportWidth() - margin);
    y = clamp(y, margin, viewportHeight() - margin);
    render();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createCursor, { once: true });
  } else {
    createCursor();
  }

  return true;
})();
true;
`;
