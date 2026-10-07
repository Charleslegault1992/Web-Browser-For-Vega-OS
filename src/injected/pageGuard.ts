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
    value: Object.freeze({ version: 2 }),
    configurable: false,
    enumerable: false,
    writable: false
  });

  var BLOCKED_HOSTS = ${blockedHosts};
  var TRUSTED_GESTURE_WINDOW_MS = ${gestureWindow};
  var lastTrustedInteractionAt = 0;

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

  function markTrustedInteraction(event) {
    if (event && event.isTrusted === true) {
      lastTrustedInteractionAt = Date.now();
    }
  }

  function isTrustedGesture() {
    return Boolean(
      lastTrustedInteractionAt > 0 &&
      Date.now() - lastTrustedInteractionAt <= TRUSTED_GESTURE_WINDOW_MS
    );
  }

  function postNavigationIntent(url, source, userInitiated) {
    var value = url === undefined || url === null ? '' : String(url).trim();

    if (
      !value ||
      !window.ReactNativeWebView ||
      typeof window.ReactNativeWebView.postMessage !== 'function'
    ) {
      return;
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'kaylane:navigation-intent',
      url: value,
      openerUrl: window.location.href,
      source: source,
      userInitiated: Boolean(userInitiated)
    }));
  }

  function targetCreatesNewContext(target) {
    var normalized = String(target || '').trim().toLowerCase();
    return Boolean(
      normalized &&
      normalized !== '_self' &&
      normalized !== '_top' &&
      normalized !== '_parent'
    );
  }

  function neutralizeBaseTarget(base) {
    if (
      base &&
      targetCreatesNewContext(base.getAttribute && base.getAttribute('target'))
    ) {
      base.setAttribute('target', '_self');
    }
  }

  function neutralizeSubmitterTarget(submitter) {
    if (
      submitter &&
      submitter.getAttribute &&
      targetCreatesNewContext(submitter.getAttribute('formtarget'))
    ) {
      submitter.setAttribute('formtarget', '_self');
    }
  }

  function neutralizeFormTarget(form, submitter) {
    if (form && targetCreatesNewContext(form.getAttribute('target'))) {
      form.setAttribute('target', '_self');
    }

    neutralizeSubmitterTarget(submitter);
  }

  document.addEventListener('pointerdown', markTrustedInteraction, true);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      markTrustedInteraction(event);
    }
  }, true);

  var guardedWindowOpen = function (url) {
    postNavigationIntent(url, 'window.open', isTrustedGesture());
    return null;
  };

  try {
    Object.defineProperty(window, 'open', {
      value: guardedWindowOpen,
      configurable: false,
      enumerable: true,
      writable: false
    });
  } catch (_) {
    window.open = guardedWindowOpen;
  }

  try {
    if (typeof Window !== 'undefined' && Window.prototype) {
      Object.defineProperty(Window.prototype, 'open', {
        value: guardedWindowOpen,
        configurable: false,
        enumerable: true,
        writable: false
      });
    }
  } catch (_) {
    // The own window.open guard above is sufficient when the prototype is locked.
  }

  document.addEventListener('click', function (event) {
    markTrustedInteraction(event);

    var target = event.target;
    if (!target || typeof target.closest !== 'function') {
      return;
    }

    var anchor = target.closest('a[href]');
    if (!anchor) {
      return;
    }

    var opensNewContext =
      targetCreatesNewContext(anchor.getAttribute('target')) ||
      (anchor.relList && anchor.relList.contains('external'));

    if (!opensNewContext) {
      return;
    }

    var href = anchor.getAttribute('href') || anchor.href;
    if (!href) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }

    postNavigationIntent(href, 'blank-target', event.isTrusted === true);
  }, true);

  document.addEventListener('submit', function (event) {
    neutralizeFormTarget(event.target, event.submitter || null);
  }, true);

  if (
    typeof HTMLFormElement !== 'undefined' &&
    HTMLFormElement.prototype &&
    typeof HTMLFormElement.prototype.submit === 'function'
  ) {
    var nativeFormSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function () {
      neutralizeFormTarget(this, null);
      return nativeFormSubmit.apply(this, arguments);
    };
  }

  function cleanIframe(frame) {
    if (frame && frame.src && isBlockedHost(frame.src)) {
      frame.remove();
      return true;
    }
    return false;
  }

  function cleanNode(node) {
    if (!node || node.nodeType !== 1) {
      return;
    }

    if (node.tagName === 'IFRAME' && cleanIframe(node)) {
      return;
    }

    if (node.tagName === 'BASE') {
      neutralizeBaseTarget(node);
    } else if (node.tagName === 'FORM') {
      neutralizeFormTarget(node, null);
    } else if (node.tagName === 'BUTTON' || node.tagName === 'INPUT') {
      neutralizeSubmitterTarget(node);
    }

    if (typeof node.querySelectorAll === 'function') {
      node.querySelectorAll('iframe[src]').forEach(cleanIframe);
      node.querySelectorAll('base[target]').forEach(neutralizeBaseTarget);
      node.querySelectorAll('form[target]').forEach(function (form) {
        neutralizeFormTarget(form, null);
      });
      node.querySelectorAll('button[formtarget],input[formtarget]').forEach(
        neutralizeSubmitterTarget
      );
    }
  }

  function cleanInitialDocument() {
    document.querySelectorAll('iframe[src]').forEach(cleanIframe);
    document.querySelectorAll('base[target]').forEach(neutralizeBaseTarget);
    document.querySelectorAll('form[target]').forEach(function (form) {
      neutralizeFormTarget(form, null);
    });
    document.querySelectorAll('button[formtarget],input[formtarget]').forEach(
      neutralizeSubmitterTarget
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanInitialDocument, {
      once: true
    });
  } else {
    cleanInitialDocument();
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'attributes') {
        cleanNode(mutation.target);
        return;
      }

      mutation.addedNodes.forEach(cleanNode);
    });
  });

  observer.observe(document.documentElement || document, {
    attributes: true,
    attributeFilter: ['src', 'target', 'formtarget'],
    childList: true,
    subtree: true
  });

  return true;
})();
true;
`;
};
