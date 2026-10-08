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
    value: Object.freeze({ version: 12 }),
    configurable: false,
    enumerable: false,
    writable: false
  });

  var BLOCKED_HOSTS = ${blockedHosts};
  var PRIMARY_HOSTS = ${primaryHosts};
  var allowedPlayerNavigation = null;
  var playbackShieldUntil = 0;
  var PLAYBACK_SHIELD_MS = 20000;
  var MAX_MODAL_SCAN = 40;
  var MAX_ADDED_NODE_SCAN = 60;
  var TRUSTED_VERIFICATION_HOSTS = [
    'challenges.cloudflare.com',
    'www.recaptcha.net',
    'recaptcha.net',
    'hcaptcha.com'
  ];

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

  function allowPlayerNavigation(url) {
    var parsed = parseHttpsDestination(url);

    if (!parsed || isBlockedHost(parsed.href)) {
      return false;
    }

    allowedPlayerNavigation = {
      href: parsed.href,
      expiresAt: Date.now() + 6000
    };

    return true;
  }

  function isAllowedPlayerNavigation(url) {
    if (!allowedPlayerNavigation) {
      return false;
    }

    if (Date.now() > allowedPlayerNavigation.expiresAt) {
      allowedPlayerNavigation = null;
      return false;
    }

    var parsed = parseHttpsDestination(url);
    return Boolean(
      parsed && parsed.href === allowedPlayerNavigation.href
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

    if (isAllowedPlayerNavigation(destination.href)) {
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

  function collectEscapeCandidates(node) {
    if (!node || node.nodeType !== 1) {
      return [];
    }

    var candidates = [];

    if (node.matches && node.matches('a[href],iframe[src]')) {
      candidates.push(node);
    }

    if (node.querySelectorAll) {
      node.querySelectorAll('a[href],iframe[src]').forEach(function (child) {
        if (candidates.length < 16) {
          candidates.push(child);
        }
      });
    }

    return candidates;
  }

  function candidateUrl(candidate) {
    if (!candidate) {
      return '';
    }

    return candidate.tagName === 'IFRAME'
      ? candidate.src || candidate.getAttribute('src') || ''
      : candidate.href || candidate.getAttribute('href') || '';
  }

  function nodeHasBlockedHost(node) {
    return collectEscapeCandidates(node).some(function (candidate) {
      var url = candidateUrl(candidate);
      return Boolean(url && isBlockedHost(url));
    });
  }

  function nodeHasExternalEscape(node) {
    return collectEscapeCandidates(node).some(function (candidate) {
      var url = candidateUrl(candidate);
      if (!url) {
        return false;
      }

      if (isBlockedHost(url)) {
        return true;
      }

      if (candidate.tagName !== 'A') {
        return false;
      }

      var parsed = parseHttpsDestination(url);
      if (!parsed) {
        return false;
      }

      return (
        isUnwantedPrimaryPageEscape(parsed.href) ||
        parsed.origin !== window.location.origin
      );
    });
  }

  function visibleMediaCoverage() {
    var best = 0;

    document.querySelectorAll('video,audio').forEach(function (media) {
      best = Math.max(best, elementCoverage(media));
    });

    return best;
  }

  function hasActivePlayingMedia() {
    var media = document.querySelectorAll('video,audio');

    for (var index = 0; index < media.length; index += 1) {
      var element = media[index];

      try {
        if (!element.paused && !element.ended && element.readyState >= 2) {
          return true;
        }
      } catch (_) {}
    }

    return false;
  }

  function isPlaybackShieldActive() {
    return Date.now() < playbackShieldUntil || hasActivePlayingMedia();
  }

  function nodeDescriptor(node) {
    if (!node || node.nodeType !== 1) {
      return '';
    }

    var values = [];

    try {
      values.push(node.tagName || '');
      values.push(node.id || '');
      values.push(
        typeof node.className === 'string'
          ? node.className
          : ''
      );
      values.push(node.getAttribute('role') || '');
      values.push(node.getAttribute('aria-label') || '');
      values.push(node.getAttribute('data-ad') || '');
      values.push(node.getAttribute('data-testid') || '');
    } catch (_) {}

    return values.join(' ').toLowerCase();
  }

  function hasAnyToken(text, tokens) {
    return tokens.some(function (token) {
      return text.indexOf(token) !== -1;
    });
  }

  function isTrustedVerificationUrl(url) {
    var parsed = parseHttpsDestination(url);

    if (!parsed) {
      return false;
    }

    if (
      hostMatchesRule(parsed.hostname, 'www.google.com') &&
      parsed.pathname.indexOf('/recaptcha/') !== -1
    ) {
      return true;
    }

    return TRUSTED_VERIFICATION_HOSTS.some(function (rule) {
      return hostMatchesRule(parsed.hostname, rule);
    });
  }

  function isVerificationSurface(node) {
    var current = node;
    var depth = 0;

    while (current && depth < 5) {
      var descriptor = nodeDescriptor(current);

      if (
        hasAnyToken(descriptor, [
          'g-recaptcha',
          'recaptcha',
          'h-captcha',
          'hcaptcha',
          'cf-turnstile',
          'turnstile'
        ])
      ) {
        return true;
      }

      if (current.querySelectorAll) {
        var frames = current.querySelectorAll('iframe[src]');

        for (var index = 0; index < frames.length; index += 1) {
          if (isTrustedVerificationUrl(candidateUrl(frames[index]))) {
            return true;
          }
        }
      }

      current = current.parentElement;
      depth += 1;
    }

    return false;
  }

  function normalizedNodeText(node) {
    if (!node || node.nodeType !== 1) {
      return '';
    }

    try {
      return String(node.textContent || '')
        .replace(/\\s+/g, ' ')
        .trim()
        .toLowerCase()
        .slice(0, 900);
    } catch (_) {
      return '';
    }
  }

  function looksLikeFakeVerificationAd(node) {
    if (!node || node.nodeType !== 1 || isVerificationSurface(node)) {
      return false;
    }

    var text = normalizedNodeText(node);

    if (!text) {
      return false;
    }

    var qrLanguage =
      (text.indexOf('qr') !== -1 && text.indexOf('scan') !== -1) ||
      text.indexOf('scan the qr') !== -1 ||
      text.indexOf('scan qr') !== -1;

    var fakeHumanLanguage =
      text.indexOf('not a robot') !== -1 ||
      text.indexOf("you're not a robot") !== -1 ||
      text.indexOf('confirm you') !== -1 ||
      text.indexOf('confirm that you') !== -1;

    var phoneLanguage =
      text.indexOf('your phone') !== -1 ||
      text.indexOf('phone') !== -1;

    return qrLanguage && (fakeHumanLanguage || phoneLanguage);
  }

  function hasCloseControl(node) {
    if (!node || !node.querySelectorAll) {
      return false;
    }

    var controls = node.querySelectorAll(
      'button,a,[role="button"],[aria-label]'
    );

    for (
      var index = 0;
      index < controls.length && index < 20;
      index += 1
    ) {
      var control = controls[index];
      var text = '';

      try {
        text = (
          String(control.textContent || '') +
          ' ' +
          String(control.getAttribute('aria-label') || '') +
          ' ' +
          String(control.getAttribute('title') || '')
        )
          .trim()
          .toLowerCase();
      } catch (_) {}

      if (
        text === 'x' ||
        text === '×' ||
        text.indexOf('close') !== -1 ||
        text.indexOf('fermer') !== -1
      ) {
        return true;
      }
    }

    return false;
  }

  function isObviousStandaloneAdModal(node) {
    if (
      !isTopDocument() ||
      !node ||
      node.nodeType !== 1 ||
      node === document.body ||
      node === document.documentElement ||
      touchesFullscreenTree(node) ||
      isVerificationSurface(node) ||
      isSourceSelectionSurface(node)
    ) {
      return false;
    }

    if (looksLikeFakeVerificationAd(node)) {
      return true;
    }

    var style;

    try {
      style = window.getComputedStyle(node);
    } catch (_) {
      return false;
    }

    var position = String(style.position || '').toLowerCase();
    var coverage = elementCoverage(node);

    if (
      coverage < 0.01 ||
      coverage > 0.80 ||
      (position !== 'fixed' &&
        position !== 'sticky' &&
        position !== 'absolute')
    ) {
      return false;
    }

    return (
      hasCloseControl(node) &&
      (nodeHasBlockedHost(node) || nodeHasExternalEscape(node))
    );
  }

  function removeObviousStandaloneAdModal(node) {
    var current = node;
    var depth = 0;

    while (
      current &&
      current !== document.body &&
      current !== document.documentElement &&
      depth < 6
    ) {
      if (isObviousStandaloneAdModal(current)) {
        current.remove();
        restorePageAfterModalRemoval();
        return true;
      }

      current = current.parentElement;
      depth += 1;
    }

    return false;
  }

  function isSourceSelectionSurface(node) {
    if (!isPrimaryHost(window.location.hostname) || !node) {
      return false;
    }

    var current = node;
    var depth = 0;

    while (
      current &&
      current !== document.body &&
      current !== document.documentElement &&
      depth < 5
    ) {
      var descriptor = nodeDescriptor(current);

      if (
        hasAnyToken(descriptor, [
          'source',
          'sources',
          'server',
          'serveur',
          'mirror',
          'provider',
          'quality',
          'language',
          'lang',
          'episode',
          'season',
          'saison',
          'lecteur'
        ])
      ) {
        return true;
      }

      if (
        current.matches &&
        current.matches('select,option')
      ) {
        return true;
      }

      if (current.querySelectorAll) {
        var interactiveCount = current.querySelectorAll(
          'button,a[href],[role="button"],input[type="radio"]'
        ).length;

        if (
          interactiveCount >= 2 &&
          interactiveCount <= 24 &&
          elementCoverage(current) <= 0.55 &&
          !nodeHasBlockedHost(current) &&
          !nodeHasExternalEscape(current)
        ) {
          return true;
        }
      }

      current = current.parentElement;
      depth += 1;
    }

    return false;
  }

  function isPlayerUiSurface(node) {
    if (!node || node.nodeType !== 1) {
      return false;
    }

    var descriptor = nodeDescriptor(node);

    if (
      hasAnyToken(descriptor, [
        'advert',
        'sponsor',
        'promo',
        'popup',
        'pop-up',
        'interstitial',
        'redirect',
        'raid'
      ])
    ) {
      return false;
    }

    if (
      node.matches &&
      node.matches('video,audio')
    ) {
      return true;
    }

    if (
      hasAnyToken(descriptor, [
        'media-control',
        'controls',
        'play-button',
        'pause-button',
        'volume',
        'seek',
        'progress',
        'fullscreen',
        'subtitle',
        'caption',
        'playback-control'
      ])
    ) {
      return true;
    }

    if (
      hasAnyToken(descriptor, ['player', 'video']) &&
      node.querySelector &&
      node.querySelector('video,audio')
    ) {
      return true;
    }

    return false;
  }

  function containsLargePlayerFrame(node) {
    if (!node || !node.querySelectorAll) {
      return false;
    }

    var frames = node.querySelectorAll('iframe');

    for (var index = 0; index < frames.length; index += 1) {
      if (elementCoverage(frames[index]) >= 0.08) {
        return true;
      }
    }

    return false;
  }

  function modalSemanticSignal(node) {
    if (!node || node.nodeType !== 1) {
      return false;
    }

    var descriptor = nodeDescriptor(node);

    try {
      if (
        node.tagName === 'DIALOG' ||
        node.getAttribute('role') === 'dialog' ||
        node.getAttribute('role') === 'alertdialog' ||
        node.getAttribute('aria-modal') === 'true'
      ) {
        return true;
      }
    } catch (_) {}

    return hasAnyToken(descriptor, [
      'modal',
      'popup',
      'pop-up',
      'interstitial',
      'advert',
      'advertisement',
      'sponsor',
      'promo',
      'ad-overlay',
      'ad_modal',
      'ad-modal',
      'raid'
    ]);
  }

  function isLikelyPlaybackModal(node, aggressive) {
    if (
      !isPlaybackShieldActive() ||
      !isTopDocument() ||
      !node ||
      node.nodeType !== 1 ||
      node === document.documentElement ||
      node === document.body ||
      touchesFullscreenTree(node) ||
      isVerificationSurface(node) ||
      isSourceSelectionSurface(node)
    ) {
      return false;
    }

    if (
      node.matches &&
      node.matches(
        'video,audio,[data-kaylane-pointer],[data-kaylane-pointer-mode]'
      )
    ) {
      return false;
    }

    if (
      node.querySelector &&
      node.querySelector('video,audio')
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
    var modalSignal = modalSemanticSignal(node);
    var overlayPosition =
      position === 'fixed' ||
      position === 'sticky' ||
      position === 'absolute';

    if (!overlayPosition || coverage <= 0) {
      return false;
    }

    if (
      node.tagName === 'IFRAME' &&
      coverage >= 0.08 &&
      !nodeHasBlockedHost(node)
    ) {
      return false;
    }

    if (containsLargePlayerFrame(node)) {
      return false;
    }

    if (modalSignal && coverage >= 0.012 && zIndex >= 0) {
      return true;
    }

    if (
      aggressive === true &&
      !isPlayerUiSurface(node) &&
      coverage >= 0.012
    ) {
      if (!isPrimaryHost(window.location.hostname)) {
        return true;
      }

      if (
        hasActivePlayingMedia() ||
        visibleMediaCoverage() >= 0.12 ||
        nodeHasBlockedHost(node) ||
        nodeHasExternalEscape(node)
      ) {
        return true;
      }
    }

    if (
      !isPlayerUiSurface(node) &&
      coverage >= 0.08 &&
      zIndex >= 20
    ) {
      return true;
    }

    return false;
  }

  function restorePageAfterModalRemoval() {
    if (activeFullscreenElement()) {
      return;
    }

    try {
      if (
        document.body &&
        document.body.style &&
        document.body.style.overflow === 'hidden'
      ) {
        document.body.style.overflow = '';
      }

      if (
        document.documentElement &&
        document.documentElement.style &&
        document.documentElement.style.overflow === 'hidden'
      ) {
        document.documentElement.style.overflow = '';
      }
    } catch (_) {}
  }

  function removePlaybackModal(node, aggressive) {
    var current = node;
    var depth = 0;

    while (
      current &&
      current !== document.body &&
      current !== document.documentElement &&
      depth < 6
    ) {
      if (isLikelyPlaybackModal(current, aggressive)) {
        current.remove();
        restorePageAfterModalRemoval();
        return true;
      }

      current = current.parentElement;
      depth += 1;
    }

    return false;
  }

  function sweepAddedOverlayTree(root) {
    if (
      !isPlaybackShieldActive() ||
      !root ||
      root.nodeType !== 1
    ) {
      return 0;
    }

    var removed = 0;

    if (removePlaybackModal(root, true)) {
      return 1;
    }

    if (!root.querySelectorAll) {
      return 0;
    }

    var candidates;

    try {
      candidates = root.querySelectorAll(
        'div,section,aside,a,iframe,dialog'
      );
    } catch (_) {
      return 0;
    }

    for (
      var index = 0;
      index < candidates.length &&
      index < MAX_ADDED_NODE_SCAN;
      index += 1
    ) {
      if (removePlaybackModal(candidates[index], true)) {
        removed += 1;
      }
    }

    return removed;
  }

  function sweepPlaybackModals(root) {
    if (!isPlaybackShieldActive()) {
      return 0;
    }

    var removed = 0;
    var scope = root && root.querySelectorAll ? root : document;
    var selector = [
      'dialog',
      '[role="dialog"]',
      '[role="alertdialog"]',
      '[aria-modal="true"]',
      '[class*="modal"]',
      '[id*="modal"]',
      '[class*="popup"]',
      '[id*="popup"]',
      '[class*="interstitial"]',
      '[id*="interstitial"]',
      '[class*="advert"]',
      '[id*="advert"]',
      '[class*="sponsor"]',
      '[id*="sponsor"]',
      '[class*="overlay"]',
      '[id*="overlay"]'
    ].join(',');

    var candidates;

    try {
      candidates = scope.querySelectorAll(selector);
    } catch (_) {
      return 0;
    }

    for (
      var index = 0;
      index < candidates.length &&
      index < MAX_MODAL_SCAN;
      index += 1
    ) {
      if (removePlaybackModal(candidates[index], false)) {
        removed += 1;
      }
    }

    return removed;
  }

  function armPlaybackShield(durationMs) {
    var requested = Number(durationMs);
    var duration =
      Number.isFinite(requested) && requested > 0
        ? Math.min(requested, 45000)
        : PLAYBACK_SHIELD_MS;

    playbackShieldUntil = Math.max(
      playbackShieldUntil,
      Date.now() + duration
    );

    sweepPlaybackModals(document);
    return playbackShieldUntil;
  }

  function isLikelyAdOverlay(node) {
    if (
      !isTopDocument() ||
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

    if (nodeHasBlockedHost(node)) {
      return true;
    }

    if (isPrimaryHost(window.location.hostname)) {
      return nodeHasExternalEscape(node);
    }

    // Once an embedded player is promoted to the top WebView, its ad layers
    // are no longer children of Movix/Dofuz. On a real player page, remove
    // only large high-z external overlays that sit above a substantial video.
    return (
      visibleMediaCoverage() >= 0.20 &&
      coverage >= 0.25 &&
      zIndex >= 100 &&
      nodeHasExternalEscape(node)
    );
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

  var nativeAlert = window.alert;
  var nativeConfirm = window.confirm;
  var nativePrompt = window.prompt;

  window.alert = function () {
    if (isPlaybackShieldActive()) {
      return undefined;
    }

    return nativeAlert.apply(window, arguments);
  };

  window.confirm = function () {
    if (isPlaybackShieldActive()) {
      return false;
    }

    return nativeConfirm.apply(window, arguments);
  };

  window.prompt = function () {
    if (isPlaybackShieldActive()) {
      return null;
    }

    return nativePrompt.apply(window, arguments);
  };

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

    try {
      var directMediaTarget =
        target &&
        target.closest &&
        target.closest('video,audio,iframe');

      var promotedPlayerTarget =
        !isPrimaryHost(window.location.hostname) &&
        target &&
        target.closest &&
        target.closest(
          '[class*="player"],[id*="player"],[class*="video"],[id*="video"]'
        );

      if (directMediaTarget || promotedPlayerTarget) {
        armPlaybackShield();
      }
    } catch (_) {}
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

  document.addEventListener(
    'play',
    function () {
      armPlaybackShield(45000);
    },
    true
  );

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

  try {
    Object.defineProperty(window, '__KAYLANE_TV_GUARD_API__', {
      value: Object.freeze({
        allowPlayerNavigation: allowPlayerNavigation,
        armPlaybackShield: armPlaybackShield,
        sweepPlaybackModals: function () {
          return sweepPlaybackModals(document);
        }
      }),
      configurable: false,
      enumerable: false,
      writable: false
    });
  } catch (_) {}

  function cleanIframe(frame) {
    if (frame && frame.src && isBlockedHost(frame.src)) {
      frame.remove();
      return true;
    }

    return false;
  }

  function cleanNode(node, aggressive) {
    if (!node || node.nodeType !== 1) {
      return;
    }

    if (removeObviousStandaloneAdModal(node)) {
      return;
    }

    if (aggressive === true && sweepAddedOverlayTree(node) > 0) {
      return;
    }

    if (removePlaybackModal(node, aggressive === true)) {
      return;
    }

    if (removeLikelyAdOverlay(node)) {
      return;
    }

    if (node.tagName === 'IFRAME' && cleanIframe(node)) {
      return;
    }

    if (typeof node.querySelectorAll === 'function') {
      sweepPlaybackModals(node);
      node.querySelectorAll('iframe[src]').forEach(cleanIframe);

      node.querySelectorAll('a[href],iframe[src]').forEach(function (candidate) {
        removeLikelyAdOverlay(candidate);
      });
    }
  }

  function cleanInitialDocument() {
    document.querySelectorAll(
      'div,section,aside,dialog,[role="dialog"],[aria-modal="true"]'
    ).forEach(removeObviousStandaloneAdModal);
    sweepPlaybackModals(document);
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
        cleanNode(mutation.target, true);
        return;
      }

      mutation.addedNodes.forEach(function (node) {
        cleanNode(node, true);
      });
    });
  });

  observer.observe(document.documentElement || document, {
    attributes: true,
    attributeFilter: [
      'src',
      'href',
      'style',
      'class',
      'open',
      'role',
      'aria-modal',
      'aria-hidden'
    ],
    childList: true,
    subtree: true
  });

  return true;
})();
true;
`;
};
