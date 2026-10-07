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
import {parsePageGuardMessage} from './navigation/messages';
import {
  decideTopLevelNavigation,
  shouldAllowWebViewNavigation,
} from './navigation/policy';
import {useBrowserBackHandler} from './remote/useBrowserBackHandler';
import {BrowserError} from './ui/BrowserError';
import {BrowserHome} from './ui/BrowserHome';
import {BrowserNotice} from './ui/BrowserNotice';

const PAGE_GUARD_SCRIPT = createPageGuardScript();
const NOTICE_DURATION_MS = 2500;

type AppSurface = 'home' | 'browser';

type NavigationEvent = {
  nativeEvent: {
    canGoBack?: boolean;
  };
};

type HttpErrorEvent = {
  nativeEvent: {
    isMainFrame?: boolean;
    statusCode?: number;
  };
};

export const App = () => {
  const webViewRef = useRef<React.ElementRef<typeof WebView> | null>(null);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [surface, setSurface] = useState<AppSurface>('home');
  const [sourceUrl, setSourceUrl] = useState<string>(APP_CONFIG.homeUrl);
  const [preferredHomeUrl, setPreferredHomeUrl] = useState<string | undefined>();
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [webViewGeneration, setWebViewGeneration] = useState(0);

  const source = useMemo(() => ({uri: sourceUrl}), [sourceUrl]);

  const clearNoticeTimer = useCallback(() => {
    if (noticeTimeoutRef.current !== null) {
      clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = null;
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

  useEffect(() => clearNoticeTimer, [clearNoticeTimer]);

  const openUrl = useCallback((url: string) => {
    setPreferredHomeUrl(url);
    setNotice(null);
    setFatalError(null);
    setCanGoBack(false);
    setSourceUrl(url);
    setWebViewGeneration(previous => previous + 1);
    setSurface('browser');
  }, []);

  const goHome = useCallback(() => {
    clearNoticeTimer();
    setNotice(null);
    setFatalError(null);
    setCanGoBack(false);
    setLoading(false);
    setSurface('home');
  }, [clearNoticeTimer]);

  const goBack = useCallback(() => {
    setFatalError(null);
    webViewRef.current?.goBack();
  }, []);

  const dismissNotice = useCallback(() => {
    clearNoticeTimer();
    setNotice(null);
  }, [clearNoticeTimer]);

  const retry = useCallback(() => {
    setNotice(null);
    setFatalError(null);
    setCanGoBack(false);
    setLoading(true);
    setWebViewGeneration(previous => previous + 1);
  }, []);

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
      setFatalError(null);
      setLoading(true);
    },
    [updateCanGoBack],
  );

  const handleLoad = useCallback(
    (event: NavigationEvent) => {
      updateCanGoBack(event);
      setLoading(false);
    },
    [updateCanGoBack],
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
        showNotice('Fenêtre ou navigation indésirable bloquée');
      }
    },
    [dismissNotice, showNotice],
  );

  const handleNavigationRequest = useCallback(
    (request: {url: string}) => {
      const allowed = shouldAllowWebViewNavigation(request.url);

      if (!allowed) {
        showNotice('Navigation indésirable bloquée');
      }

      return allowed;
    },
    [showNotice],
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
        injectedJavaScriptBeforeContentLoaded={PAGE_GUARD_SCRIPT}
        onMessage={handlePageGuardMessage}
        onShouldStartLoadWithRequest={handleNavigationRequest}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onHttpError={(event: HttpErrorEvent) => {
          if (event.nativeEvent.isMainFrame === true) {
            handleMainFrameFailure(
              `Le site a répondu avec une erreur HTTP${event.nativeEvent.statusCode ? ` (${event.nativeEvent.statusCode})` : ''}.`,
            );
          }
        }}
        onError={event => {
          if (__DEV__) {
            console.warn(
              'Kaylane TV WebView load error code',
              event.nativeEvent.code,
            );
          }
          handleMainFrameFailure(
            'Vérifie ta connexion Internet, puis réessaie.',
          );
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
