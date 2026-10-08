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
    value: Object.freeze({ version: 15 }),
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
  var MAX_ADDED_NODE_SCAN = 40;
  var MAX_ALWAYS_MODAL_SCAN = 32;
  var MAX_MUTATION_QUEUE = 80;
  var mutationQueue = new Set();
  var mutationFrame = 0;
  var popupPurgeUntil = 0;
  var quarantinedPopupSignatures = new Set();

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

  function looksLikeVerificationModal(node) {
    if (!node || node.nodeType !== 1) {
      return false;
    }

    var text = normalizedNodeText(node);

    if (!text) {
      return false;
    }

    var robotLanguage =
      text.indexOf('not a robot') !== -1 ||
      text.indexOf("you're not a robot") !== -1 ||
      text.indexOf('you are not a robot') !== -1 ||
      text.indexOf('confirm you') !== -1 ||
      text.indexOf('confirm that you') !== -1 ||
      text.indexOf('verify you') !== -1 ||
      text.indexOf('verify that you') !== -1 ||
      text.indexOf('verify you are human') !== -1 ||
      text.indexOf('verify that you are human') !== -1 ||
      text.indexOf('human verification') !== -1;

    var qrLanguage =
      (text.indexOf('qr') !== -1 && text.indexOf('scan') !== -1) ||
      text.indexOf('scan the qr') !== -1 ||
      text.indexOf('scan qr') !== -1;

    return robotLanguage || qrLanguage;
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
    var overlayPosition =
      position === 'fixed' ||
      position === 'sticky' ||
      position === 'absolute';
    var verificationSignal = looksLikeVerificationModal(node);
    var modalSignal = modalSemanticSignal(node);
    var closeSignal = hasCloseControl(node);

    if (
      !verificationSignal &&
      !modalSignal &&
      !(overlayPosition && closeSignal)
    ) {
      return false;
    }

    if (
      coverage < 0.005 ||
      coverage > 0.92
    ) {
      return false;
    }

    // Source/server selection is legitimate application UI even when a site
    // implements it with modal-like markup. Preserve it before applying the
    // global no-modal policy.
    if (isSourceSelectionSurface(node)) {
      return false;
    }

    // Product requirement: no modal overlays at all. This intentionally also
    // removes robot/human verification modals instead of trying to complete or
    // bypass them; the user can choose another source.
    if (verificationSignal || modalSignal) {
      return true;
    }

    return overlayPosition && closeSignal;
  }

  function sweepAlwaysBlockedModals(root) {
    if (!root || root.nodeType !== 1) {
      return 0;
    }

    var removed = 0;

    if (removeObviousStandaloneAdModal(root)) {
      return 1;
    }

    if (!root.querySelectorAll) {
      return 0;
    }

    var candidates;

    try {
      candidates = root.querySelectorAll(
        [
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
          '[class*="overlay"]',
          '[id*="overlay"]',
          'button',
          '[role="button"]',
          '[aria-label]'
        ].join(',')
      );
    } catch (_) {
      return 0;
    }

    for (
      var index = 0;
      index < candidates.length &&
      index < MAX_ALWAYS_MODAL_SCAN;
      index += 1
    ) {
      if (removeObviousStandaloneAdModal(candidates[index])) {
        removed += 1;
      }
    }

    return removed;
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

  function isManualPopupCandidate(node) {
    if (
      !node ||
      node.nodeType !== 1 ||
      node === document.body ||
      node === document.documentElement ||
      touchesFullscreenTree(node) ||
      isSourceSelectionSurface(node) ||
      isPlayerUiSurface(node) ||
      containsLargePlayerFrame(node)
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
    var overlayPosition =
      position === 'fixed' ||
      position === 'sticky' ||
      position === 'absolute';

    if (!overlayPosition || coverage < 0.003 || coverage > 0.96) {
      return false;
    }

    return (
      modalSemanticSignal(node) ||
      looksLikeVerificationModal(node) ||
      hasCloseControl(node) ||
      nodeHasBlockedHost(node) ||
      nodeHasExternalEscape(node)
    );
  }

  function removeManualPopup(node) {
    var current = node;
    var depth = 0;

    while (
      current &&
      current !== document.body &&
      current !== document.documentElement &&
      depth < 8
    ) {
      if (isManualPopupCandidate(current)) {
        current.remove();
        restorePageAfterModalRemoval();
        return true;
      }

      current = current.parentElement;
      depth += 1;
    }

    return false;
  }

  function popupFrameSignature(frame) {
    if (!frame || frame.nodeType !== 1 || frame.tagName !== 'IFRAME') {
      return '';
    }

    var raw =
      frame.src ||
      frame.getAttribute('src') ||
      frame.getAttribute('data-src') ||
      '';

    var parsed = parseHttpsDestination(raw);
    if (!parsed) {
      return '';
    }

    return parsed.origin + parsed.pathname;
  }

  function rememberPopupFrame(frame) {
    var signature = popupFrameSignature(frame);

    if (signature) {
      quarantinedPopupSignatures.add(signature);
    }
  }

  function isQuarantinedPopupFrame(frame) {
    var signature = popupFrameSignature(frame);
    return Boolean(
      signature && quarantinedPopupSignatures.has(signature)
    );
  }

  function isLikelyPlayerFrame(frame) {
    if (
      !frame ||
      frame.tagName !== 'IFRAME' ||
      typeof frame.getBoundingClientRect !== 'function'
    ) {
      return false;
    }

    var raw =
      frame.src ||
      frame.getAttribute('src') ||
      frame.getAttribute('data-src') ||
      '';

    if (raw && isBlockedHost(raw)) {
      return false;
    }

    var rect = frame.getBoundingClientRect();
    if (rect.width < 420 || rect.height < 220) {
      return false;
    }

    var ratio = rect.height > 0 ? rect.width / rect.height : 0;
    var coverage = elementCoverage(frame);

    return (
      coverage >= 0.16 &&
      ratio >= 1.35 &&
      ratio <= 2.40
    );
  }

  function frameOverlayEvidence(frame) {
    if (!frame || frame.tagName !== 'IFRAME') {
      return false;
    }

    var current = frame;
    var depth = 0;

    while (
      current &&
      current !== document.body &&
      current !== document.documentElement &&
      depth < 5
    ) {
      var style;

      try {
        style = window.getComputedStyle(current);
      } catch (_) {
        style = null;
      }

      if (style) {
        var position = String(style.position || '').toLowerCase();
        var zIndex = parsedZIndex(style);
        var coverage = elementCoverage(current);

        if (
          (position === 'fixed' ||
            position === 'sticky' ||
            position === 'absolute') &&
          coverage >= 0.005 &&
          coverage <= 0.92 &&
          zIndex >= 5
        ) {
          return true;
        }
      }

      if (
        modalSemanticSignal(current) ||
        looksLikeVerificationModal(current) ||
        hasCloseControl(current)
      ) {
        return true;
      }

      current = current.parentElement;
      depth += 1;
    }

    return false;
  }

  function removePopupFrame(frame, force) {
    if (
      !frame ||
      frame.nodeType !== 1 ||
      frame.tagName !== 'IFRAME' ||
      isSourceSelectionSurface(frame)
    ) {
      return false;
    }

    var shouldRemove =
      force === true ||
      isQuarantinedPopupFrame(frame) ||
      isBlockedHost(candidateUrl(frame)) ||
      (!isLikelyPlayerFrame(frame) && frameOverlayEvidence(frame));

    if (!shouldRemove) {
      return false;
    }

    rememberPopupFrame(frame);

    var current = frame;
    var depth = 0;

    while (
      current &&
      current !== document.body &&
      current !== document.documentElement &&
      depth < 5
    ) {
      if (
        current !== frame &&
        (modalSemanticSignal(current) ||
          looksLikeVerificationModal(current) ||
          hasCloseControl(current))
      ) {
        current.remove();
        restorePageAfterModalRemoval();
        return true;
      }

      current = current.parentElement;
      depth += 1;
    }

    frame.remove();
    restorePageAfterModalRemoval();
    return true;
  }

  function isNearFrameTopRight(frame, clientX, clientY) {
    if (
      !frame ||
      frame.tagName !== 'IFRAME' ||
      typeof frame.getBoundingClientRect !== 'function'
    ) {
      return false;
    }

    var rect = frame.getBoundingClientRect();
    if (rect.width < 120 || rect.height < 80) {
      return false;
    }

    var localX = Number(clientX) - rect.left;
    var localY = Number(clientY) - rect.top;

    return (
      localX >= rect.width * 0.68 &&
      localY <= Math.max(90, rect.height * 0.30)
    );
  }

  function dismissPopupFrameAt(clientX, clientY, forceCloseCorner) {
    if (typeof document.elementFromPoint !== 'function') {
      return false;
    }

    var hit = document.elementFromPoint(
      Number(clientX) || 0,
      Number(clientY) || 0
    );

    if (!hit) {
      return false;
    }

    var frame =
      hit.tagName === 'IFRAME'
        ? hit
        : hit.closest
          ? hit.closest('iframe')
          : null;

    if (!frame) {
      return false;
    }

    var closeCorner =
      forceCloseCorner === true &&
      isNearFrameTopRight(frame, clientX, clientY);

    if (!closeCorner && !frameOverlayEvidence(frame)) {
      return false;
    }

    popupPurgeUntil = Math.max(
      popupPurgeUntil,
      Date.now() + 15000
    );

    return removePopupFrame(frame, closeCorner);
  }

  function popupPurgeActive() {
    return Date.now() < popupPurgeUntil;
  }

  function closePopupAt(clientX, clientY) {
    if (typeof document.elementFromPoint !== 'function') {
      return false;
    }

    var target = document.elementFromPoint(
      Number(clientX) || 0,
      Number(clientY) || 0
    );

    if (removeManualPopup(target)) {
      popupPurgeUntil = Math.max(
        popupPurgeUntil,
        Date.now() + 15000
      );
      return true;
    }

    return dismissPopupFrameAt(clientX, clientY, true);
  }

  function closeAllPopups() {
    var removed = 0;

    popupPurgeUntil = Math.max(
      popupPurgeUntil,
      Date.now() + 15000
    );
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
      '[class*="overlay"]',
      '[id*="overlay"]',
      '[class*="captcha"]',
      '[id*="captcha"]',
      '[class*="turnstile"]',
      '[id*="turnstile"]',
      '[class*="recaptcha"]',
      '[id*="recaptcha"]',
      '[class*="advert"]',
      '[id*="advert"]',
      '[class*="sponsor"]',
      '[id*="sponsor"]',
      'iframe[src]',
      'iframe[data-src]'
    ].join(',');

    var candidates;

    try {
      candidates = document.querySelectorAll(selector);
    } catch (_) {
      candidates = [];
    }

    for (
      var index = candidates.length - 1;
      index >= 0 && index >= candidates.length - 120;
      index -= 1
    ) {
      var candidate = candidates[index];

      if (
        candidate.tagName === 'IFRAME'
          ? removePopupFrame(candidate, false)
          : removeManualPopup(candidate)
      ) {
        removed += 1;
      }
    }

    if (document.documentElement) {
      removed += sweepAlwaysBlockedModals(document.documentElement);
    }

    restorePageAfterModalRemoval();
    return removed;
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

  function installNonPrimaryModalCssShield() {
    if (
      isPrimaryHost(window.location.hostname) ||
      !document.documentElement
    ) {
      return;
    }

    var style = document.createElement('style');
    style.setAttribute('data-kaylane-no-modal-css', 'true');
    style.textContent = [
      'dialog',
      '[role="dialog"]',
      '[role="alertdialog"]',
      '[aria-modal="true"]',
      '[class*="modal" i]',
      '[id*="modal" i]',
      '[class*="popup" i]',
      '[id*="popup" i]',
      '[class*="interstitial" i]',
      '[id*="interstitial" i]',
      '[class*="captcha" i]',
      '[id*="captcha" i]',
      '[class*="turnstile" i]',
      '[id*="turnstile" i]',
      '[class*="recaptcha" i]',
      '[id*="recaptcha" i]'
    ].join(',') +
      '{display:none!important;visibility:hidden!important;pointer-events:none!important;}';

    try {
      document.documentElement.appendChild(style);
    } catch (_) {}
  }

  installNonPrimaryModalCssShield();

  // Product policy: browser dialogs are never allowed to block the TV UI.
  // There is intentionally no playback-state exception.
  window.alert = function () {
    return undefined;
  };

  window.confirm = function () {
    return false;
  };

  window.prompt = function () {
    return null;
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
        },
        closePopupAt: closePopupAt,
        dismissPopupFrameAt: dismissPopupFrameAt,
        closeAllPopups: closeAllPopups
      }),
      configurable: false,
      enumerable: false,
      writable: false
    });
  } catch (_) {}

  function cleanIframe(frame) {
    if (!frame) {
      return false;
    }

    if (
      isQuarantinedPopupFrame(frame) ||
      (frame.src && isBlockedHost(frame.src))
    ) {
      frame.remove();
      return true;
    }

    if (
      popupPurgeActive() &&
      frameOverlayEvidence(frame) &&
      !isLikelyPlayerFrame(frame) &&
      !isSourceSelectionSurface(frame)
    ) {
      rememberPopupFrame(frame);
      frame.remove();
      return true;
    }

    return false;
  }

  function cleanNode(node, aggressive) {
    if (!node || node.nodeType !== 1) {
      return;
    }

    if (sweepAlwaysBlockedModals(node) > 0) {
      return;
    }

    if (node.tagName === 'IFRAME' && cleanIframe(node)) {
      return;
    }

    // Keep primary pages light while they bootstrap. The previous guard did
    // deep subtree scans on every mutation and could starve Dofuz's SPA render,
    // leaving the three-dot loader on screen.
    if (!isPlaybackShieldActive()) {
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

    if (typeof node.querySelectorAll === 'function') {
      sweepPlaybackModals(node);

      var frames = node.querySelectorAll('iframe[src]');
      for (
        var frameIndex = 0;
        frameIndex < frames.length && frameIndex < 12;
        frameIndex += 1
      ) {
        cleanIframe(frames[frameIndex]);
      }
    }
  }

  function cleanInitialDocument() {
    if (document.documentElement) {
      sweepAlwaysBlockedModals(document.documentElement);
    }

    var frames = document.querySelectorAll('iframe[src]');
    for (
      var index = 0;
      index < frames.length && index < 16;
      index += 1
    ) {
      cleanIframe(frames[index]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanInitialDocument, {
      once: true
    });
  } else {
    cleanInitialDocument();
  }

  function flushMutationQueue() {
    mutationFrame = 0;

    var nodes = Array.from(mutationQueue);
    mutationQueue.clear();

    for (var index = 0; index < nodes.length; index += 1) {
      cleanNode(nodes[index], true);
    }
  }

  function queueMutationNode(node) {
    if (
      !node ||
      node.nodeType !== 1 ||
      mutationQueue.size >= MAX_MUTATION_QUEUE
    ) {
      return;
    }

    mutationQueue.add(node);

    if (!mutationFrame) {
      mutationFrame = window.requestAnimationFrame(flushMutationQueue);
    }
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'attributes') {
        queueMutationNode(mutation.target);
        return;
      }

      mutation.addedNodes.forEach(queueMutationNode);
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
