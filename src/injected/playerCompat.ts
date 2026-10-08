export const createPlayerCompatibilityScript = (): string => `
(function () {
  if (window.__KAYLANE_TV_MEDIA__) {
    return true;
  }

  Object.defineProperty(window, '__KAYLANE_TV_MEDIA__', {
    value: Object.freeze({version: 1}),
    configurable: false,
    enumerable: false,
    writable: false
  });

  function isMediaElement(node) {
    return Boolean(
      node &&
      (node.tagName === 'VIDEO' || node.tagName === 'AUDIO')
    );
  }

  function enhanceMedia(element) {
    if (!isMediaElement(element)) {
      return;
    }

    try {
      element.disableRemotePlayback = true;
    } catch (_) {}

    try {
      element.playsInline = true;
    } catch (_) {}

    try {
      element.setAttribute('playsinline', '');
      element.setAttribute('webkit-playsinline', '');
    } catch (_) {}
  }

  function enhanceNode(node) {
    if (!node || node.nodeType !== 1) {
      return;
    }

    if (isMediaElement(node)) {
      enhanceMedia(node);
    }

    if (typeof node.querySelectorAll === 'function') {
      node.querySelectorAll('video,audio').forEach(enhanceMedia);
    }
  }

  function visibleFrameArea(frame) {
    if (!frame || typeof frame.getBoundingClientRect !== 'function') {
      return 0;
    }

    var rect = frame.getBoundingClientRect();
    if (rect.width < 240 || rect.height < 120) {
      return 0;
    }

    var style = window.getComputedStyle ? window.getComputedStyle(frame) : null;
    if (
      style &&
      (style.display === 'none' ||
        style.visibility === 'hidden' ||
        Number(style.opacity || '1') <= 0)
    ) {
      return 0;
    }

    return rect.width * rect.height;
  }

  function restartNativeMedia() {
    var media = Array.prototype.slice.call(
      document.querySelectorAll('video,audio')
    );

    var restarted = 0;

    media.forEach(function (element) {
      enhanceMedia(element);

      try {
        if (
          (element.error || element.readyState === 0) &&
          !element.srcObject &&
          String(element.currentSrc || element.src || '').indexOf('blob:') !== 0
        ) {
          element.load();
          restarted += 1;
        }

        if (element.paused && !element.ended) {
          var playPromise = element.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(function () {});
          }
        }
      } catch (_) {}
    });

    return restarted;
  }

  function reloadLargestPlayerFrame() {
    var frames = Array.prototype.slice.call(
      document.querySelectorAll('iframe[src]')
    );

    if (!frames.length) {
      return false;
    }

    frames.sort(function (a, b) {
      return visibleFrameArea(b) - visibleFrameArea(a);
    });

    var frame = frames[0];
    if (!frame || visibleFrameArea(frame) <= 0) {
      return false;
    }

    try {
      var src = frame.getAttribute('src') || frame.src;
      if (!src) {
        return false;
      }

      frame.setAttribute('src', src);
      return true;
    } catch (_) {
      return false;
    }
  }

  function retryPlayers() {
    var nativeCount = restartNativeMedia();
    var iframeReloaded = false;

    if (nativeCount === 0) {
      iframeReloaded = reloadLargestPlayerFrame();
    }

    return {
      nativeCount: nativeCount,
      iframeReloaded: iframeReloaded
    };
  }

  function getStatus() {
    var media = document.querySelectorAll('video,audio');
    var frames = document.querySelectorAll('iframe[src]');
    var playing = 0;

    media.forEach(function (element) {
      if (!element.paused && !element.ended) {
        playing += 1;
      }
    });

    return {
      mediaCount: media.length,
      iframeCount: frames.length,
      playingCount: playing
    };
  }

  document.querySelectorAll('video,audio').forEach(enhanceMedia);

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(enhanceNode);
    });
  });

  observer.observe(document.documentElement || document, {
    childList: true,
    subtree: true
  });

  Object.defineProperty(window, '__KAYLANE_TV_MEDIA_API__', {
    value: Object.freeze({
      retryPlayers: retryPlayers,
      getStatus: getStatus,
      rescan: function () {
        document.querySelectorAll('video,audio').forEach(enhanceMedia);
      }
    }),
    configurable: false,
    enumerable: false,
    writable: false
  });

  return true;
})();
true;
`;
