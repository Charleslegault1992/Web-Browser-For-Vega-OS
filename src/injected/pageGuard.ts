import {BLOCKED_AD_NAVIGATION_HOSTS} from '../navigation/rules';

export const createPageGuardScript = (): string => {
  const blockedHosts = JSON.stringify(BLOCKED_AD_NAVIGATION_HOSTS);

  return `
(function () {
  if (window.__KAYLANE_TV_GUARD__) {
    return true;
  }

  Object.defineProperty(window, '__KAYLANE_TV_GUARD__', {
    value: Object.freeze({ version: 5 }),
    configurable: false,
    enumerable: false,
    writable: false
  });

  var BLOCKED_HOSTS = ${blockedHosts};

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

  function parseHttpsDestination(url) {
    try {
      var parsed = new URL(url, document.baseURI);
      return parsed.protocol === 'https:' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function isBlockedHost(url) {
    var parsed = parseHttpsDestination(url);
    if (!parsed) {
      return false;
    }

    return BLOCKED_HOSTS.some(function (rule) {
      return hostMatchesRule(parsed.hostname, rule);
    });
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

  function defaultBaseTarget() {
    var base = document.querySelector('base[target]');
    return base && base.getAttribute ? base.getAttribute('target') : '';
  }

  function anchorCreatesNewContext(anchor) {
    var target =
      (anchor && anchor.getAttribute && anchor.getAttribute('target')) ||
      defaultBaseTarget();

    return Boolean(
      targetCreatesNewContext(target) ||
      (anchor && anchor.relList && anchor.relList.contains('external'))
    );
  }

  function submitCreatesNewContext(form, submitter) {
    var submitterTarget =
      submitter && submitter.getAttribute
        ? submitter.getAttribute('formtarget')
        : '';

    var formTarget =
      form && form.getAttribute ? form.getAttribute('target') : '';

    return targetCreatesNewContext(
      submitterTarget || formTarget || defaultBaseTarget()
    );
  }

  function consumeNewContextEvent(event) {
    event.preventDefault();
    event.stopPropagation();

    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
  }

  // Vega is intentionally single-window. A website may use window.open as an
  // advertising side effect of Play. Ignore it completely but return a truthy
  // Window object so basic popup-blocker feature detection does not break the
  // page's inline action.
  var guardedWindowOpen = function () {
    return window;
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

  // Explicit new-tab/new-window anchors are ignored. Standard same-window
  // anchors are untouched and continue to navigate normally.
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || typeof target.closest !== 'function') {
      return;
    }

    var anchor = target.closest('a[href]');
    if (!anchor || !anchorCreatesNewContext(anchor)) {
      return;
    }

    consumeNewContextEvent(event);
  }, true);

  // Forms that explicitly request another browsing context are ignored too.
  // Same-window forms continue through the browser untouched.
  document.addEventListener('submit', function (event) {
    if (!submitCreatesNewContext(event.target, event.submitter || null)) {
      return;
    }

    consumeNewContextEvent(event);
  }, true);

  if (
    typeof HTMLFormElement !== 'undefined' &&
    HTMLFormElement.prototype &&
    typeof HTMLFormElement.prototype.submit === 'function'
  ) {
    var nativeFormSubmit = HTMLFormElement.prototype.submit;

    HTMLFormElement.prototype.submit = function () {
      if (submitCreatesNewContext(this, null)) {
        return undefined;
      }

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

    if (typeof node.querySelectorAll === 'function') {
      node.querySelectorAll('iframe[src]').forEach(cleanIframe);
    }
  }

  function cleanInitialDocument() {
    document.querySelectorAll('iframe[src]').forEach(cleanIframe);
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
    attributeFilter: ['src'],
    childList: true,
    subtree: true
  });

  return true;
})();
true;
`;
};
