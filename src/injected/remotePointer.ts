export const createRemotePointerScript = (): string => `
(function () {
  if (window.__KAYLANE_TV_POINTER__) {
    return true;
  }

  Object.defineProperty(window, '__KAYLANE_TV_POINTER__', {
    value: Object.freeze({ version: 2 }),
    configurable: false,
    enumerable: false,
    writable: false
  });

  var SIZE = 30;
  var ACCELERATION = 3000;
  var MAX_SPEED = 1050;
  var FRICTION = 9;
  var EDGE_SCROLL_SPEED = 760;
  var x = Math.max(SIZE, Math.round(window.innerWidth / 2));
  var y = Math.max(SIZE, Math.round(window.innerHeight / 2));
  var velocityX = 0;
  var velocityY = 0;
  var cursor = null;
  var hoverTarget = null;
  var animationFrame = 0;
  var lastFrameAt = 0;
  var keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function viewportWidth() {
    return Math.max(
      SIZE * 2,
      window.innerWidth || document.documentElement.clientWidth || 1280
    );
  }

  function viewportHeight() {
    return Math.max(
      SIZE * 2,
      window.innerHeight || document.documentElement.clientHeight || 720
    );
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
    cursor.style.background = 'rgba(0, 0, 0, 0.30)';
    cursor.style.boxShadow =
      '0 0 0 2px rgba(0,0,0,0.82), 0 2px 12px rgba(0,0,0,0.72)';
    cursor.style.pointerEvents = 'none';
    cursor.style.zIndex = '2147483647';
    cursor.style.boxSizing = 'border-box';
    cursor.style.willChange = 'transform';
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
    return typeof document.elementFromPoint === 'function'
      ? document.elementFromPoint(x, y)
      : null;
  }

  function dispatchMouseEvent(target, type) {
    if (!target || typeof target.dispatchEvent !== 'function') {
      return;
    }

    try {
      target.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          view: window
        })
      );
    } catch (_) {}
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

  function activeAxis(negativeKey, positiveKey) {
    return (keys[positiveKey] ? 1 : 0) - (keys[negativeKey] ? 1 : 0);
  }

  function approachVelocity(current, axis, dt) {
    if (axis !== 0) {
      current += axis * ACCELERATION * dt;
      return clamp(current, -MAX_SPEED, MAX_SPEED);
    }

    var decay = Math.exp(-FRICTION * dt);
    var next = current * decay;
    return Math.abs(next) < 8 ? 0 : next;
  }

  function anyDirectionHeld() {
    return (
      keys.ArrowLeft ||
      keys.ArrowRight ||
      keys.ArrowUp ||
      keys.ArrowDown
    );
  }

  function tick(now) {
    animationFrame = 0;
    createCursor();

    if (!lastFrameAt) {
      lastFrameAt = now;
    }

    var dt = Math.min(0.034, Math.max(0.001, (now - lastFrameAt) / 1000));
    lastFrameAt = now;

    var axisX = activeAxis('ArrowLeft', 'ArrowRight');
    var axisY = activeAxis('ArrowUp', 'ArrowDown');

    velocityX = approachVelocity(velocityX, axisX, dt);
    velocityY = approachVelocity(velocityY, axisY, dt);

    var margin = SIZE;
    var width = viewportWidth();
    var height = viewportHeight();

    x += velocityX * dt;
    y += velocityY * dt;

    if (x < margin) {
      x = margin;
      if (velocityX < 0) velocityX = 0;
    } else if (x > width - margin) {
      x = width - margin;
      if (velocityX > 0) velocityX = 0;
    }

    if (y < margin) {
      y = margin;
      if (axisY < 0 || velocityY < 0) {
        window.scrollBy(0, -EDGE_SCROLL_SPEED * dt);
      }
      if (velocityY < 0) velocityY *= 0.35;
    } else if (y > height - margin) {
      y = height - margin;
      if (axisY > 0 || velocityY > 0) {
        window.scrollBy(0, EDGE_SCROLL_SPEED * dt);
      }
      if (velocityY > 0) velocityY *= 0.35;
    }

    render();

    if (
      anyDirectionHeld() ||
      Math.abs(velocityX) >= 8 ||
      Math.abs(velocityY) >= 8
    ) {
      ensureAnimation();
    } else {
      lastFrameAt = 0;
    }
  }

  function ensureAnimation() {
    if (!animationFrame) {
      animationFrame = window.requestAnimationFrame(tick);
    }
  }

  function activate() {
    createCursor();

    var target = elementAtPointer();
    if (!target || target === cursor) {
      return;
    }

    if (typeof target.focus === 'function') {
      try {
        target.focus({preventScroll: true});
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

  function isDirectionKey(key) {
    return Object.prototype.hasOwnProperty.call(keys, key);
  }

  document.addEventListener(
    'keydown',
    function (event) {
      if (isDirectionKey(event.key)) {
        consume(event);
        keys[event.key] = true;
        ensureAnimation();
        return;
      }

      if (event.key === 'Enter') {
        consume(event);
        if (!event.repeat) {
          activate();
        }
      }
    },
    true
  );

  document.addEventListener(
    'keyup',
    function (event) {
      if (!isDirectionKey(event.key)) {
        return;
      }

      consume(event);
      keys[event.key] = false;
      ensureAnimation();
    },
    true
  );

  window.addEventListener('blur', function () {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    keys.ArrowUp = false;
    keys.ArrowDown = false;
    velocityX = 0;
    velocityY = 0;
    lastFrameAt = 0;
  });

  window.addEventListener('resize', function () {
    var margin = SIZE;
    x = clamp(x, margin, viewportWidth() - margin);
    y = clamp(y, margin, viewportHeight() - margin);
    render();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createCursor, {once: true});
  } else {
    createCursor();
  }

  return true;
})();
true;
`;
