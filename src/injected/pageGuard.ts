import {BLOCKED_AD_NAVIGATION_HOSTS} from '../navigation/rules';

const TRUSTED_GESTURE_WINDOW_MS = 1200;

export const createPageGuardScript = (): string => {
  const blockedHosts = JSON.stringify(BLOCKED_AD_NAVIGATION_HOSTS);
  const gestureWindow = String(TRUSTED_GESTURE_WINDOW_MS);

  return `
(function () {
  if (window.__KAYLANE_TV_GUARD__) {
    return true;
  }

  Object.defineProperty(window, '__KAYLANE_TV_GUARD__', {
    value: Object.freeze({ version: 1 }),
    configurable: false,
    enumerable: false,
    writable: false
  });

  var BLOCKED_HOSTS = ${blockedHosts};
  var TRUSTED_GESTURE_WINDOW_MS = ${gestureWindow};
  var lastTrustedInteractionAt = 0;

  function normalizeHost(host) {
    return String(host || '').trim().toLowerCase().replace(/\\.$/, '');
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

  function isBlockedHost(url) {
    try {
      var parsed = new URL(url, document.baseURI);
      return BLOCKED_HOSTS.some(function (rule) {
        return hostMatchesRule(parsed.hostname, rule);
      });
    } catch (_) {
      return false;
    }
  }

  function isTrustedGesture() {
    return Date.now() - lastTrustedInteractionAt <= TRUSTED_GESTURE_WINDOW_MS;
  }

  function postNavigationIntent(url, source, userInitiated) {
    if (!url || !window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) {
      return;
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'kaylane:navigation-intent',
      url: String(url),
      source: source,
      userInitiated: Boolean(userInitiated)
    }));
  }

  document.addEventListener('pointerdown', function () {
    lastTrustedInteractionAt = Date.now();
  }, true);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      lastTrustedInteractionAt = Date.now();
    }
  }, true);

  var originalOpen = window.open;
  window.open = function (url) {
    if (url) {
      postNavigationIntent(url, 'window.open', isTrustedGesture());
    }
    return null;
  };

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || typeof target.closest !== 'function') {
      return;
    }

    var anchor = target.closest('a[href]');
    if (!anchor) {
      return;
    }

    var opensNewContext =
      anchor.getAttribute('target') === '_blank' ||
      anchor.hasAttribute('download') === false && anchor.rel === 'external';

    if (!opensNewContext) {
      return;
    }

    var href = anchor.href;
    if (!href) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    postNavigationIntent(href, 'blank-target', true);
  }, true);

  function cleanNode(node) {
    if (!node || node.nodeType !== 1) {
      return;
    }

    if (
      node.tagName === 'IFRAME' &&
      node.src &&
      isBlockedHost(node.src)
    ) {
      node.remove();
      return;
    }

    if (typeof node.querySelectorAll === 'function') {
      node.querySelectorAll('iframe[src]').forEach(function (frame) {
        if (frame.src && isBlockedHost(frame.src)) {
          frame.remove();
        }
      });
    }
  }

  function cleanInitialBlockedFrames() {
    document.querySelectorAll('iframe[src]').forEach(function (frame) {
      if (frame.src && isBlockedHost(frame.src)) {
        frame.remove();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanInitialBlockedFrames, {
      once: true
    });
  } else {
    cleanInitialBlockedFrames();
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(cleanNode);
    });
  });

  observer.observe(document.documentElement || document, {
    childList: true,
    subtree: true
  });

  return true;
})();
true;
`;
};
