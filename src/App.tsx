import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  findNodeHandle,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {FocusManager} from '@amazon-devices/react-native-kepler';
import {WebView} from '@amazon-devices/webview';

import {APP_CONFIG} from './config';
import {createPageGuardScript} from './injected/pageGuard';
import {createPlayerCompatibilityScript} from './injected/playerCompat';
import {createRemotePointerScript} from './injected/remotePointer';
import {parsePageGuardMessage} from './navigation/messages';
import {
  decideTopLevelNavigation,
  shouldAllowWebViewNavigation,
} from './navigation/policy';
import {useBrowserBackHandler} from './remote/useBrowserBackHandler';
import {useBrowserMenuHandler} from './remote/useBrowserMenuHandler';
import {useWebPointerMode} from './remote/useWebPointerMode';
import {BrowserError} from './ui/BrowserError';
import {BrowserHome} from './ui/BrowserHome';
import {BrowserNotice} from './ui/BrowserNotice';
import {BrowserOptions} from './ui/BrowserOptions';

const PAGE_BOOTSTRAP_SCRIPT =
  createPageGuardScript() +
  '\n' +
  createRemotePointerScript() +
  '\n' +
  createPlayerCompatibilityScript();
const NOTICE_DURATION_MS = 2500;
const SOFT_RETRY_DELAY_MS = 1400;
const MAX_SOFT_RETRIES = 2;

const isRetriableHttpStatus = (statusCode?: number): boolean =>
  statusCode === 408 ||
  statusCode === 425 ||
  statusCode === 429 ||
  statusCode === 500 ||
  statusCode === 502 ||
  statusCode === 503 ||
  statusCode === 504 ||
  (typeof statusCode === 'number' && statusCode >= 520 && statusCode <= 524);

type AppSurface = 'home' | 'browser';

type NavigationEvent = {
  nativeEvent: {
    canGoBack?: boolean;
    url?: string;
  };
};

type HttpErrorEvent = {
  nativeEvent: {
    isMainFrame?: boolean;
    statusCode?: number;
    url?: string;
    description?: string;
  };
};

type WebViewErrorEvent = {
  nativeEvent: {
    url?: string;
    code?: number;
    description?: string;
  };
};

export const App = () => {
  const webViewRef = useRef<React.ElementRef<typeof WebView> | null>(null);
  const pointerCaptureRef = useRef<React.ElementRef<typeof Pressable> | null>(
    null,
  );
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const softRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const softRetryCountRef = useRef(0);
  const mainFrameUrlRef = useRef<string>(APP_CONFIG.homeUrl);

  const [surface, setSurface] = useState<AppSurface>('home');
  const [sourceUrl, setSourceUrl] = useState<string>(APP_CONFIG.homeUrl);
  const [preferredHomeUrl, setPreferredHomeUrl] = useState<string | undefined>();
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [webViewGeneration, setWebViewGeneration] = useState(0);

  const source = useMemo(() => ({uri: sourceUrl}), [sourceUrl]);

  const injectWebPointerJavaScript = useCallback((script: string) => {
    webViewRef.current?.injectJavaScript(script);
  }, []);

  const {
    activatePointer,
    mode: webPointerMode,
    setMode: setWebPointerMode,
    syncMode: syncWebPointerMode,
  } = useWebPointerMode({
    active: surface === 'browser',
    inputEnabled:
      surface === 'browser' &&
      !optionsOpen &&
      fatalError === null,
    injectJavaScript: injectWebPointerJavaScript,
  });

  const focusBrowserInputTarget = useCallback(() => {
    if (webPointerMode !== 'pointer') {
      return;
    }

    const target = pointerCaptureRef.current;
    const handle = target ? findNodeHandle(target) : null;

    if (handle) {
      FocusManager.focus(handle);
    }
  }, [webPointerMode]);

  useEffect(() => {
    if (
      surface !== 'browser' ||
      optionsOpen ||
      fatalError !== null
    ) {
      return;
    }

    const timer = setTimeout(focusBrowserInputTarget, 120);
    return () => clearTimeout(timer);
  }, [
    fatalError,
    focusBrowserInputTarget,
    optionsOpen,
    surface,
    webPointerMode,
    webViewGeneration,
  ]);

  const toggleOptions = useCallback(() => {
    setOptionsOpen(previous => !previous);
  }, []);

  useBrowserMenuHandler({
    active: surface === 'browser',
    onMenu: toggleOptions,
  });

  const clearNoticeTimer = useCallback(() => {
    if (noticeTimeoutRef.current !== null) {
      clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = null;
    }
  }, []);

  const clearSoftRetryTimer = useCallback(() => {
    if (softRetryTimeoutRef.current !== null) {
      clearTimeout(softRetryTimeoutRef.current);
      softRetryTimeoutRef.current = null;
    }
  }, []);

  const showNotice = useCallback(
    (message: string) => {
      clearNoticeTimer();
      setNotice(message);
      noticeTimeoutRef.current = setTimeout(() => {
        noticeTimeoutRef.current = null;
        setNotice(null);
      }, NOTICE_DURATION_MS);
    },
    [clearNoticeTimer],
  );

  useEffect(
    () => () => {
      clearNoticeTimer();
      clearSoftRetryTimer();
    },
    [clearNoticeTimer, clearSoftRetryTimer],
  );

  const openUrl = useCallback(
    (url: string) => {
      clearSoftRetryTimer();
      softRetryCountRef.current = 0;
      mainFrameUrlRef.current = url;
      setPreferredHomeUrl(url);
      setNotice(null);
      setFatalError(null);
      setOptionsOpen(false);
      setCanGoBack(false);
      setSourceUrl(url);
      setWebViewGeneration(previous => previous + 1);
      setSurface('browser');
    },
    [clearSoftRetryTimer],
  );

  const goHome = useCallback(() => {
    clearNoticeTimer();
    clearSoftRetryTimer();
    softRetryCountRef.current = 0;
    setNotice(null);
    setFatalError(null);
    setOptionsOpen(false);
    setCanGoBack(false);
    setLoading(false);
    setSurface('home');
  }, [clearNoticeTimer, clearSoftRetryTimer]);

  const goBack = useCallback(() => {
    setFatalError(null);
    webViewRef.current?.injectJavaScript(
      `
(function () {
  try {
    if (window.history && window.history.length > 1) {
      window.history.back();
      return true;
    }

    if (
      window.ReactNativeWebView &&
      typeof window.ReactNativeWebView.postMessage === 'function'
    ) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({type: 'kaylane-browser-history-empty'})
      );
    }
  } catch (_) {}

  return true;
})();
true;
`,
    );
  }, []);

  const dismissOverlay = useCallback(() => {
    if (optionsOpen) {
      setOptionsOpen(false);
      return;
    }

    clearNoticeTimer();
    setNotice(null);
  }, [clearNoticeTimer, optionsOpen]);

  const retry = useCallback(() => {
    clearSoftRetryTimer();
    softRetryCountRef.current = 0;
    setNotice(null);
    setFatalError(null);
    setCanGoBack(false);
    setLoading(true);
    setWebViewGeneration(previous => previous + 1);
  }, [clearSoftRetryTimer]);

  useBrowserBackHandler({
    overlayOpen: optionsOpen || notice !== null,
    canGoBack: surface === 'browser' && canGoBack,
    isAtHome: surface === 'home',
    dismissOverlay,
    goBack,
    goHome,
  });

  const updateCanGoBack = useCallback((event: NavigationEvent) => {
    const nextCanGoBack = event.nativeEvent.canGoBack;

    if (typeof nextCanGoBack === 'boolean') {
      setCanGoBack(previous =>
        previous === nextCanGoBack ? previous : nextCanGoBack,
      );
    }
  }, []);

  const handleLoadStart = useCallback(
    (event: NavigationEvent) => {
      updateCanGoBack(event);

      if (event.nativeEvent.url) {
        mainFrameUrlRef.current = event.nativeEvent.url;
      }

      setFatalError(null);
      setLoading(true);
    },
    [updateCanGoBack],
  );

  const handleLoad = useCallback(
    (event: NavigationEvent) => {
      updateCanGoBack(event);

      if (event.nativeEvent.url) {
        mainFrameUrlRef.current = event.nativeEvent.url;
      }

      clearSoftRetryTimer();
      softRetryCountRef.current = 0;
      setLoading(false);
      syncWebPointerMode();
      webViewRef.current?.injectJavaScript(
        'window.__KAYLANE_TV_MEDIA_API__ && window.__KAYLANE_TV_MEDIA_API__.rescan(); true;',
      );
    },
    [clearSoftRetryTimer, syncWebPointerMode, updateCanGoBack],
  );

  const remountCurrentPage = useCallback(() => {
    const currentUrl = mainFrameUrlRef.current || sourceUrl;

    setSourceUrl(currentUrl);
    setWebViewGeneration(previous => previous + 1);
  }, [sourceUrl]);

  const scheduleSoftReload = useCallback((): boolean => {
    if (softRetryCountRef.current >= MAX_SOFT_RETRIES) {
      return false;
    }

    clearSoftRetryTimer();
    softRetryCountRef.current += 1;

    softRetryTimeoutRef.current = setTimeout(() => {
      softRetryTimeoutRef.current = null;
      remountCurrentPage();
    }, SOFT_RETRY_DELAY_MS);

    return true;
  }, [clearSoftRetryTimer, remountCurrentPage]);

  const handleSoftWebViewError = useCallback(
    (event: WebViewErrorEvent) => {
      const failedUrl = event.nativeEvent.url;
      const currentUrl = mainFrameUrlRef.current;

      if (failedUrl && currentUrl && failedUrl !== currentUrl) {
        if (__DEV__) {
          console.warn(
            'Kaylane TV ignored dependent/player load error',
            failedUrl,
            event.nativeEvent.code,
          );
        }
        return;
      }

      if (__DEV__) {
        console.warn(
          'Kaylane TV top-level load error; retrying softly',
          event.nativeEvent.code,
          event.nativeEvent.description,
        );
      }

      setFatalError(null);

      if (!scheduleSoftReload()) {
        // Keep the existing page visible instead of replacing it with a
        // blocking "connection lost" surface. The user can keep waiting,
        // navigate Back/Home, or manually retry if the page exposes a control.
        setLoading(false);
      }
    },
    [scheduleSoftReload],
  );

  const promotePlayerUrl = useCallback(
    (url: string): boolean => {
      let parsed: URL;

      try {
        parsed = new URL(url);
      } catch (_) {
        return false;
      }

      if (parsed.protocol !== 'https:') {
        return false;
      }

      setOptionsOpen(false);
      clearNoticeTimer();
      setNotice(null);

      const serializedUrl = JSON.stringify(parsed.href);

      webViewRef.current?.injectJavaScript(
        `window.__KAYLANE_TV_GUARD_API__ &&
window.__KAYLANE_TV_GUARD_API__.allowPlayerNavigation(${serializedUrl});
window.location.assign(${serializedUrl});
true;`,
      );

      showNotice('Lecteur isolé · Back pour revenir');
      return true;
    },
    [clearNoticeTimer, showNotice],
  );

  const promotePlayerUnderPointer = useCallback(() => {
    setOptionsOpen(false);
    webViewRef.current?.injectJavaScript(
      'window.__KAYLANE_TV_POINTER_API__ && window.__KAYLANE_TV_POINTER_API__.promoteLargestEmbeddedPlayer(); true;',
    );
  }, []);

  const handlePageGuardMessage = useCallback(
    (event: {nativeEvent: {data: string}}) => {
      const rawData = event.nativeEvent.data;

      try {
        const bridgeMessage = JSON.parse(rawData) as {
          type?: string;
          url?: string;
        };

        if (
          bridgeMessage.type === 'kaylane-player-promote' &&
          typeof bridgeMessage.url === 'string'
        ) {
          promotePlayerUrl(bridgeMessage.url);
          return;
        }

        if (bridgeMessage.type === 'kaylane-browser-history-empty') {
          goHome();
          return;
        }
      } catch (_) {
        // Continue through the navigation-guard parser.
      }

      const message = parsePageGuardMessage(rawData);

      if (!message) {
        return;
      }

      const decision = decideTopLevelNavigation({
        url: message.url,
        openerUrl: message.openerUrl,
        source: message.source,
        userInitiated: message.userInitiated,
      });

      if (decision.action === 'same-window') {
        clearNoticeTimer();
        setNotice(null);
        webViewRef.current?.injectJavaScript(
          `window.location.assign(${JSON.stringify(decision.url)}); true;`,
        );
        return;
      }

      if (decision.action === 'block') {
        // Popup/new-window attempts are intentionally ignored silently.
        return;
      }
    },
    [clearNoticeTimer, goHome, promotePlayerUrl],
  );

  const handleNavigationRequest = useCallback(
    (request: {url: string}) => shouldAllowWebViewNavigation(request.url),
    [],
  );

  const handleMainFrameFailure = useCallback((message: string) => {
    setLoading(false);
    setFatalError(message);
  }, []);

  const retryPlayer = useCallback(() => {
    setOptionsOpen(false);
    webViewRef.current?.injectJavaScript(
      'window.__KAYLANE_TV_MEDIA_API__ && window.__KAYLANE_TV_MEDIA_API__.retryPlayers(); true;',
    );
    showNotice('Relance du lecteur envoyée');
  }, [showNotice]);

  const reloadCurrentPage = useCallback(() => {
    setOptionsOpen(false);
    clearSoftRetryTimer();
    softRetryCountRef.current = 0;
    setFatalError(null);
    setLoading(true);
    remountCurrentPage();
  }, [clearSoftRetryTimer, remountCurrentPage]);

  if (surface === 'home') {
    return (
      <BrowserHome onOpen={openUrl} preferredUrl={preferredHomeUrl} />
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        key={webViewGeneration}
        ref={webViewRef}
        style={styles.webView}
        hasTVPreferredFocus={webPointerMode === 'focus'}
        source={source}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowJavaScriptInBackground={false}
        thirdPartyCookiesEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="never"
        allowsDefaultMediaControl={true}
        injectedJavaScriptBeforeContentLoaded={PAGE_BOOTSTRAP_SCRIPT}
        onMessage={handlePageGuardMessage}
        onShouldStartLoadWithRequest={handleNavigationRequest}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onHttpError={(event: HttpErrorEvent) => {
          if (event.nativeEvent.isMainFrame !== true) {
            return;
          }

          if (isRetriableHttpStatus(event.nativeEvent.statusCode)) {
            setFatalError(null);

            if (!scheduleSoftReload()) {
              setLoading(false);
            }
            return;
          }

          handleMainFrameFailure(
            `Le site a répondu avec une erreur HTTP${event.nativeEvent.statusCode ? ` (${event.nativeEvent.statusCode})` : ''}.`,
          );
        }}
        onError={(event: WebViewErrorEvent) => {
          handleSoftWebViewError(event);
        }}
        onSslError={(sslError, callback) => {
          if (__DEV__) {
            console.warn('Kaylane TV WebView SSL error code', sslError.code);
          }
          callback.cancel();
          handleMainFrameFailure(
            'La connexion sécurisée de ce site ne peut pas être vérifiée.',
          );
        }}
      />

      {webPointerMode === 'pointer' &&
      !optionsOpen &&
      fatalError === null ? (
        <Pressable
          ref={pointerCaptureRef}
          hasTVPreferredFocus={true}
          onFocus={focusBrowserInputTarget}
          onBlur={focusBrowserInputTarget}
          onPress={activatePointer}
          style={styles.pointerInputCapture}
        />
      ) : null}

      {loading && fatalError === null ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" />
        </View>
      ) : null}

      <BrowserNotice message={notice} />

      {optionsOpen ? (
        <BrowserOptions
          currentPointerMode={webPointerMode}
          onTogglePointerMode={() => {
            const nextMode =
              webPointerMode === 'pointer' ? 'focus' : 'pointer';
            setOptionsOpen(false);
            setWebPointerMode(nextMode);
            showNotice(
              nextMode === 'pointer'
                ? 'Mode pointeur'
                : 'Mode sélection',
            );
          }}
          onOpenEmbeddedPlayer={promotePlayerUnderPointer}
          onRetryPlayer={retryPlayer}
          onReloadPage={reloadCurrentPage}
          onHome={goHome}
          onClose={() => setOptionsOpen(false)}
        />
      ) : null}

      {fatalError !== null ? (
        <BrowserError
          message={fatalError}
          onRetry={retry}
          onHome={goHome}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  pointerInputCapture: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
});
