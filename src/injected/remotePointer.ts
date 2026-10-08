import {BLOCKED_AD_NAVIGATION_HOSTS} from '../navigation/rules';

export const createRemotePointerScript = (): string => {
  const blockedHosts = JSON.stringify(BLOCKED_AD_NAVIGATION_HOSTS);

  return `
(function () {
  if (window.__KAYLANE_TV_POINTER__) {
    return true;
  }

  Object.defineProperty(window, '__KAYLANE_TV_POINTER__', {
    value: Object.freeze({ version: 4 }),
    configurable: false,
    enumerable: false,
    writable: false
  });

  var BLOCKED_HOSTS = ${blockedHosts};
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
  var modeBadge = null;
  var hoverTarget = null;
  var animationFrame = 0;
  var lastFrameAt = 0;
  var badgeTimer = 0;
  var mode = 'pointer';
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

  function fullscreenElement() {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      null
    );
  }

  function pointerHost() {
    var fullscreen = fullscreenElement();

    if (fullscreen && typeof fullscreen.appendChild === 'function') {
      return fullscreen;
    }

    return document.documentElement || document.body;
  }

  function ensureUiAttached() {
    var host = pointerHost();
    if (!host) {
      return;
    }

    if (cursor && cursor.parentNode !== host) {
      try {
        host.appendChild(cursor);
      } catch (_) {}
    }

    if (modeBadge && modeBadge.parentNode !== host) {
      try {
        host.appendChild(modeBadge);
      } catch (_) {}
    }
  }

  function createCursor() {
    if (cursor) {
      ensureUiAttached();
      return;
    }

    if (!document.documentElement) {
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
    ensureUiAttached();
  }

  function createModeBadge() {
    if (modeBadge || !document.documentElement) {
      return;
    }

    modeBadge = document.createElement('div');
    modeBadge.setAttribute('data-kaylane-pointer-mode', 'true');
    modeBadge.setAttribute('aria-hidden', 'true');
    modeBadge.style.position = 'fixed';
    modeBadge.style.right = '26px';
    modeBadge.style.top = '24px';
    modeBadge.style.zIndex = '2147483647';
    modeBadge.style.pointerEvents = 'none';
    modeBadge.style.padding = '10px 14px';
    modeBadge.style.borderRadius = '999px';
    modeBadge.style.border = '2px solid rgba(255,255,255,0.9)';
    modeBadge.style.background = 'rgba(5,9,21,0.86)';
    modeBadge.style.color = '#ffffff';
    modeBadge.style.fontFamily = 'sans-serif';
    modeBadge.style.fontSize = '16px';
    modeBadge.style.fontWeight = '700';
    modeBadge.style.opacity = '0';
    modeBadge.style.transition = 'opacity 120ms linear';
    ensureUiAttached();
  }

  function announceMode() {
    createModeBadge();
    if (!modeBadge) {
      return;
    }

    if (badgeTimer) {
      clearTimeout(badgeTimer);
      badgeTimer = 0;
    }

    modeBadge.textContent =
      mode === 'pointer' ? 'Mode pointeur' : 'Mode sélection';
    modeBadge.style.opacity = '1';

    badgeTimer = setTimeout(function () {
      badgeTimer = 0;
      if (modeBadge) {
        modeBadge.style.opacity = '0';
      }
    }, 1300);
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
    if (mode !== 'pointer') {
      return;
    }

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
    createCursor();
    ensureUiAttached();

    if (!cursor) {
      return;
    }

    cursor.style.display = mode === 'pointer' ? 'block' : 'none';
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

  function stopMotion() {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    keys.ArrowUp = false;
    keys.ArrowDown = false;
    velocityX = 0;
    velocityY = 0;
    lastFrameAt = 0;
  }

  function tick(now) {
    animationFrame = 0;
    createCursor();

    if (mode !== 'pointer') {
      stopMotion();
      render();
      return;
    }

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
    if (mode === 'pointer' && !animationFrame) {
      animationFrame = window.requestAnimationFrame(tick);
    }
  }

  function setDirection(key, pressed) {
    if (!Object.prototype.hasOwnProperty.call(keys, key)) {
      return;
    }

    if (mode !== 'pointer') {
      keys[key] = false;
      return;
    }

    keys[key] = Boolean(pressed);
    ensureAnimation();
  }

  function normalizeHost(host) {
    return String(host || '').trim().toLowerCase().replace(/\\.+$/, '');
  }

  function hostMatchesRule(host, rule) {
    var normalizedHost = normalizeHost(host);
    var normalizedRule = normalizeHost(String(rule || '').replace(/^\\*\\./, ''));

    return Boolean(
      normalizedHost &&
      normalizedRule &&
      (normalizedHost === normalizedRule ||
        normalizedHost.endsWith('.' + normalizedRule))
    );
  }

  function parseHttpsUrl(url) {
    try {
      var parsed = new URL(url, document.baseURI);
      return parsed.protocol === 'https:' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function isBlockedUrl(url) {
    var parsed = parseHttpsUrl(url);
    if (!parsed) {
      return true;
    }

    return BLOCKED_HOSTS.some(function (rule) {
      return hostMatchesRule(parsed.hostname, rule);
    });
  }

  function frameSource(frame) {
    if (!frame || !frame.getAttribute) {
      return '';
    }

    return (
      frame.src ||
      frame.getAttribute('src') ||
      frame.getAttribute('data-src') ||
      frame.getAttribute('data-lazy-src') ||
      frame.getAttribute('data-url') ||
      ''
    );
  }

  function frameArea(frame) {
    if (!frame || typeof frame.getBoundingClientRect !== 'function') {
      return 0;
    }

    var rect = frame.getBoundingClientRect();
    if (rect.width < 320 || rect.height < 160) {
      return 0;
    }

    var viewportArea =
      Math.max(1, viewportWidth()) *
      Math.max(1, viewportHeight());

    var area = Math.max(0, rect.width) * Math.max(0, rect.height);

    return area / viewportArea >= 0.08 ? area : 0;
  }

  function embeddedPlayerAtPointer() {
    if (typeof document.elementsFromPoint !== 'function') {
      return null;
    }

    var candidates = document
      .elementsFromPoint(x, y)
      .filter(function (element) {
        return (
          element &&
          element.tagName === 'IFRAME' &&
          frameArea(element) > 0
        );
      })
      .filter(function (frame) {
        var src = frameSource(frame);
        return Boolean(parseHttpsUrl(src)) && !isBlockedUrl(src);
      })
      .sort(function (a, b) {
        return frameArea(b) - frameArea(a);
      });

    return candidates.length ? candidates[0] : null;
  }

  function promoteFrame(frame) {
    if (!frame) {
      return false;
    }

    var parsed = parseHttpsUrl(frameSource(frame));

    if (!parsed || isBlockedUrl(parsed.href)) {
      return false;
    }

    try {
      if (
        window.ReactNativeWebView &&
        typeof window.ReactNativeWebView.postMessage === 'function'
      ) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'kaylane-player-promote',
            url: parsed.href,
            x: Math.round(x),
            y: Math.round(y)
          })
        );
        return true;
      }
    } catch (_) {}

    return false;
  }

  function promoteEmbeddedPlayerAtPointer() {
    return promoteFrame(embeddedPlayerAtPointer());
  }

  function promoteLargestEmbeddedPlayer() {
    var frames = Array.prototype.slice
      .call(document.querySelectorAll('iframe'))
      .filter(function (frame) {
        var src = frameSource(frame);
        return (
          frameArea(frame) > 0 &&
          Boolean(parseHttpsUrl(src)) &&
          !isBlockedUrl(src)
        );
      })
      .sort(function (a, b) {
        return frameArea(b) - frameArea(a);
      });

    return frames.length ? promoteFrame(frames[0]) : false;
  }

  function activate() {
    if (mode !== 'pointer') {
      return;
    }

    createCursor();

    if (promoteEmbeddedPlayerAtPointer()) {
      return;
    }

    var target = elementAtPointer();
    if (!target || target === cursor || target === modeBadge) {
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

  function setMode(nextMode, shouldAnnounce) {
    var next = nextMode === 'focus' ? 'focus' : 'pointer';
    if (mode === next) {
      render();
      return;
    }

    mode = next;
    stopMotion();
    render();

    if (shouldAnnounce !== false) {
      announceMode();
    }
  }

  function toggleMode() {
    setMode(mode === 'pointer' ? 'focus' : 'pointer', true);
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
      if (mode !== 'pointer') {
        return;
      }

      if (isDirectionKey(event.key)) {
        consume(event);
        setDirection(event.key, true);
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
      if (mode !== 'pointer' || !isDirectionKey(event.key)) {
        return;
      }

      consume(event);
      setDirection(event.key, false);
    },
    true
  );

  function handleFullscreenChange() {
    ensureUiAttached();
    render();
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange, true);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange, true);

  window.addEventListener('blur', function () {
    stopMotion();
  });

  window.addEventListener('focus', function () {
    ensureUiAttached();
    render();
  });

  window.addEventListener('resize', function () {
    var margin = SIZE;
    x = clamp(x, margin, viewportWidth() - margin);
    y = clamp(y, margin, viewportHeight() - margin);
    render();
  });

  Object.defineProperty(window, '__KAYLANE_TV_POINTER_API__', {
    value: Object.freeze({
      setMode: setMode,
      toggleMode: toggleMode,
      setDirection: setDirection,
      activate: activate,
      promoteEmbeddedPlayerAtPointer: promoteEmbeddedPlayerAtPointer,
      promoteLargestEmbeddedPlayer: promoteLargestEmbeddedPlayer,
      refresh: function () {
        ensureUiAttached();
        render();
      }
    }),
    configurable: false,
    enumerable: false,
    writable: false
  });

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      function () {
        createCursor();
        createModeBadge();
        render();
      },
      {once: true}
    );
  } else {
    createCursor();
    createModeBadge();
    render();
  }

  return true;
})();
true;
`;
};
