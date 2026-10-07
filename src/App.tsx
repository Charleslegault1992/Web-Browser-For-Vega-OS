import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {WebView} from '@amazon-devices/webview';

import {APP_CONFIG} from './config';
import {createPageGuardScript} from './injected/pageGuard';
import {createRemotePointerScript} from './injected/remotePointer';
import {parsePageGuardMessage} from './navigation/messages';
import {
  decideTopLevelNavigation,
  shouldAllowWebViewNavigation,
} from './navigation/policy';
import {useBrowserBackHandler} from './remote/useBrowserBackHandler';
import {useWebPointerMode} from './remote/useWebPointerMode';
import {BrowserError} from './ui/BrowserError';
import {BrowserHome} from './ui/BrowserHome';
import {BrowserNotice} from './ui/BrowserNotice';

const PAGE_BOOTSTRAP_SCRIPT =
  createPageGuardScript() + '\n' + createRemotePointerScript();
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
  const [webViewGeneration, setWebViewGeneration] = useState(0);

  const source = useMemo(() => ({uri: sourceUrl}), [sourceUrl]);

  const injectWebPointerJavaScript = useCallback((script: string) => {
    webViewRef.current?.injectJavaScript(script);
  }, []);

  const {syncMode: syncWebPointerMode} = useWebPointerMode({
    active: surface === 'browser',
    injectJavaScript: injectWebPointerJavaScript,
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
    setCanGoBack(false);
    setLoading(false);
    setSurface('home');
  }, [clearNoticeTimer, clearSoftRetryTimer]);

  const goBack = useCallback(() => {
    setFatalError(null);
    webViewRef.current?.goBack();
  }, []);

  const dismissNotice = useCallback(() => {
    clearNoticeTimer();
    setNotice(null);
  }, [clearNoticeTimer]);

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
    overlayOpen: notice !== null,
    canGoBack: surface === 'browser' && canGoBack,
    isAtHome: surface === 'home',
    dismissOverlay: dismissNotice,
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
    },
    [clearSoftRetryTimer, syncWebPointerMode, updateCanGoBack],
  );

  const scheduleSoftReload = useCallback((): boolean => {
    if (softRetryCountRef.current >= MAX_SOFT_RETRIES) {
      return false;
    }

    clearSoftRetryTimer();
    softRetryCountRef.current += 1;

    softRetryTimeoutRef.current = setTimeout(() => {
      softRetryTimeoutRef.current = null;
      webViewRef.current?.reload();
    }, SOFT_RETRY_DELAY_MS);

    return true;
  }, [clearSoftRetryTimer]);

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

  const handlePageGuardMessage = useCallback(
    (event: {nativeEvent: {data: string}}) => {
      const message = parsePageGuardMessage(event.nativeEvent.data);

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
        dismissNotice();
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
    [dismissNotice],
  );

  const handleNavigationRequest = useCallback(
    (request: {url: string}) => shouldAllowWebViewNavigation(request.url),
    [],
  );

  const handleMainFrameFailure = useCallback((message: string) => {
    setLoading(false);
    setFatalError(message);
  }, []);

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
        hasTVPreferredFocus={true}
        source={source}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowJavaScriptInBackground={false}
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

      {loading && fatalError === null ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" />
        </View>
      ) : null}

      <BrowserNotice message={notice} />

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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
});
