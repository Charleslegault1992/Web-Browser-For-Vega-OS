import {
  BLOCKED_AD_NAVIGATION_HOSTS,
  PRIMARY_HOSTS,
} from '../navigation/rules';

export const createPageGuardScript = (): string => {
  const blockedHosts = JSON.stringify(BLOCKED_AD_NAVIGATION_HOSTS);
  const primaryHosts = JSON.stringify(PRIMARY_HOSTS);

  return `
(function () {
  if (window.__KAYLANE_TV_GUARD__) {
    return true;
  }

  Object.defineProperty(window, '__KAYLANE_TV_GUARD__', {
    value: Object.freeze({ version: 6 }),
    configurable: false,
    enumerable: false,
    writable: false
  });

  var BLOCKED_HOSTS = ${blockedHosts};
  var PRIMARY_HOSTS = ${primaryHosts};

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

  function matchesAnyHost(host, rules) {
    return rules.some(function (rule) {
      return hostMatchesRule(host, rule);
    });
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
    return Boolean(
      parsed && matchesAnyHost(parsed.hostname, BLOCKED_HOSTS)
    );
  }

  function isPrimaryHost(host) {
    return matchesAnyHost(host, PRIMARY_HOSTS);
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

  function isUnwantedPrimaryPageEscape(url) {
    if (!isPrimaryHost(window.location.hostname)) {
      return false;
    }

    var destination = parseHttpsDestination(url);
    if (!destination) {
      return false;
    }

    return !isPrimaryHost(destination.hostname);
  }

  function consumeNavigationEvent(event) {
    event.preventDefault();
    event.stopPropagation();

    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
  }

  function createPopupLocationStub() {
    var hrefValue = 'about:blank';

    return {
      get href() {
        return hrefValue;
      },
      set href(value) {
        hrefValue = String(value || '');
      },
      assign: function (value) {
        hrefValue = String(value || '');
      },
      replace: function (value) {
        hrefValue = String(value || '');
      },
      reload: function () {},
      toString: function () {
        return hrefValue;
      }
    };
  }

  function createPopupDocumentStub() {
    return {
      open: function () {
        return this;
      },
      close: function () {},
      write: function () {},
      writeln: function () {},
      body: null
    };
  }

  function createPopupStub() {
    var stub = {
      closed: false,
      opener: window,
      location: createPopupLocationStub(),
      document: createPopupDocumentStub(),
      focus: function () {},
      blur: function () {},
      postMessage: function () {},
      close: function () {
        stub.closed = true;
      }
    };

    stub.self = stub;
    stub.window = stub;
    stub.parent = stub;
    stub.top = stub;

    return stub;
  }

  // Never expose the real current window as the return value of window.open.
  // Some ad scripts assign popup.location after the call; returning window
  // would redirect Kaylane TV's only WebView. A truthy isolated stub satisfies
  // common popup checks while keeping all popup-side navigation inert.
  var guardedWindowOpen = function () {
    return createPopupStub();
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
  } catch (_) {}

  // On Movix/Dofuz, the top page should stay on the selected service.
  // Unknown third-party player/media frames are not touched because this test
  // runs against each frame's own location.
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || typeof target.closest !== 'function') {
      return;
    }

    var anchor = target.closest('a[href]');
    if (!anchor) {
      return;
    }

    var href = anchor.href || anchor.getAttribute('href') || '';

    if (
      anchorCreatesNewContext(anchor) ||
      isBlockedHost(href) ||
      isUnwantedPrimaryPageEscape(href)
    ) {
      consumeNavigationEvent(event);
    }
  }, true);

  if (
    window.navigation &&
    typeof window.navigation.addEventListener === 'function'
  ) {
    window.navigation.addEventListener('navigate', function (event) {
      var destinationUrl =
        event &&
        event.destination &&
        event.destination.url
          ? event.destination.url
          : '';

      if (
        destinationUrl &&
        (isBlockedHost(destinationUrl) ||
          isUnwantedPrimaryPageEscape(destinationUrl)) &&
        event.cancelable
      ) {
        event.preventDefault();
      }
    });
  }

  document.addEventListener('submit', function (event) {
    var form = event.target;
    var submitter = event.submitter || null;
    var action =
      form && form.action
        ? form.action
        : window.location.href;

    if (
      submitCreatesNewContext(form, submitter) ||
      isBlockedHost(action) ||
      isUnwantedPrimaryPageEscape(action)
    ) {
      consumeNavigationEvent(event);
    }
  }, true);

  if (
    typeof HTMLFormElement !== 'undefined' &&
    HTMLFormElement.prototype &&
    typeof HTMLFormElement.prototype.submit === 'function'
  ) {
    var nativeFormSubmit = HTMLFormElement.prototype.submit;

    HTMLFormElement.prototype.submit = function () {
      var action = this.action || window.location.href;

      if (
        submitCreatesNewContext(this, null) ||
        isBlockedHost(action) ||
        isUnwantedPrimaryPageEscape(action)
      ) {
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
