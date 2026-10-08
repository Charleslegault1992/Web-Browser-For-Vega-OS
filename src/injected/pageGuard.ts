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
    value: Object.freeze({ version: 7 }),
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

  function preventNavigationDefault(event) {
    // Keep the site's click/submit handlers alive. Many players attach their
    // real inline-player bootstrap to the same element that also carries a
    // fallback external href/target. Stopping propagation broke that flow.
    // Prevent only the browser's default navigation; window.open remains
    // isolated and scripted top-level escapes are covered separately.
    event.preventDefault();
  }

  function isTopDocument() {
    try {
      return window === window.top;
    } catch (_) {
      return false;
    }
  }

  function activeFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function touchesFullscreenTree(node) {
    var fullscreen = activeFullscreenElement();

    if (!fullscreen || !node) {
      return false;
    }

    try {
      return (
        fullscreen === node ||
        (fullscreen.contains && fullscreen.contains(node)) ||
        (node.contains && node.contains(fullscreen))
      );
    } catch (_) {
      return false;
    }
  }

  function elementCoverage(node) {
    if (!node || typeof node.getBoundingClientRect !== 'function') {
      return 0;
    }

    var rect = node.getBoundingClientRect();
    var viewportArea =
      Math.max(1, window.innerWidth || 1) *
      Math.max(1, window.innerHeight || 1);

    return Math.max(0, rect.width) * Math.max(0, rect.height) / viewportArea;
  }

  function parsedZIndex(style) {
    var value = Number.parseInt(
      style && style.zIndex ? style.zIndex : '0',
      10
    );

    return Number.isFinite(value) ? value : 0;
  }

  function nodeHasExternalEscape(node) {
    if (!node || node.nodeType !== 1) {
      return false;
    }

    var candidates = [];

    if (node.matches && node.matches('a[href],iframe[src]')) {
      candidates.push(node);
    }

    if (node.querySelectorAll) {
      node.querySelectorAll('a[href],iframe[src]').forEach(function (child) {
        if (candidates.length < 12) {
          candidates.push(child);
        }
      });
    }

    return candidates.some(function (candidate) {
      var url =
        candidate.tagName === 'IFRAME'
          ? candidate.src || candidate.getAttribute('src') || ''
          : candidate.href || candidate.getAttribute('href') || '';

      if (!url) {
        return false;
      }

      if (isBlockedHost(url)) {
        return true;
      }

      return (
        candidate.tagName === 'A' &&
        isUnwantedPrimaryPageEscape(url)
      );
    });
  }

  function isLikelyAdOverlay(node) {
    if (
      !isTopDocument() ||
      !isPrimaryHost(window.location.hostname) ||
      !node ||
      node.nodeType !== 1 ||
      node === document.documentElement ||
      node === document.body ||
      touchesFullscreenTree(node)
    ) {
      return false;
    }

    var style;

    try {
      style = window.getComputedStyle(node);
    } catch (_) {
      return false;
    }

    var position = String(style.position || '').toLowerCase();
    var coverage = elementCoverage(node);
    var zIndex = parsedZIndex(style);

    if (
      coverage < 0.18 ||
      (position !== 'fixed' &&
        position !== 'sticky' &&
        position !== 'absolute') ||
      zIndex < 50
    ) {
      return false;
    }

    if (
      node.matches &&
      node.matches('video,audio,[data-kaylane-pointer],[data-kaylane-pointer-mode]')
    ) {
      return false;
    }

    if (
      node.querySelector &&
      node.querySelector('video,audio')
    ) {
      return false;
    }

    return nodeHasExternalEscape(node);
  }

  function removeLikelyAdOverlay(node) {
    var current = node;
    var depth = 0;

    while (
      current &&
      current !== document.body &&
      current !== document.documentElement &&
      depth < 6
    ) {
      if (isLikelyAdOverlay(current)) {
        current.remove();
        return true;
      }

      current = current.parentElement;
      depth += 1;
    }

    return false;
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
      preventNavigationDefault(event);
      removeLikelyAdOverlay(anchor);
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
      preventNavigationDefault(event);
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

    if (removeLikelyAdOverlay(node)) {
      return;
    }

    if (node.tagName === 'IFRAME' && cleanIframe(node)) {
      return;
    }

    if (typeof node.querySelectorAll === 'function') {
      node.querySelectorAll('iframe[src]').forEach(cleanIframe);

      node.querySelectorAll('a[href],iframe[src]').forEach(function (candidate) {
        removeLikelyAdOverlay(candidate);
      });
    }
  }

  function cleanInitialDocument() {
    document.querySelectorAll('iframe[src]').forEach(cleanIframe);
    document.querySelectorAll('a[href],iframe[src]').forEach(function (candidate) {
      removeLikelyAdOverlay(candidate);
    });
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
    attributeFilter: ['src', 'href', 'style', 'class'],
    childList: true,
    subtree: true
  });

  return true;
})();
true;
`;
};
