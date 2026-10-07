import React, {useCallback, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {WebView} from '@amazon-devices/webview';

import {APP_CONFIG} from './config';
import type {BrowserNavigationState} from './types/webview';

const HOME_SOURCE = {uri: APP_CONFIG.homeUrl} as const;

export const App = () => {
  const webViewRef = useRef<React.ElementRef<typeof WebView> | null>(null);
  const navigationStateRef = useRef<BrowserNavigationState>({
    url: APP_CONFIG.homeUrl,
    canGoBack: false,
    canGoForward: false,
  });

  const handleLoad = useCallback(
    (event: {
      nativeEvent: {
        url?: string;
        canGoBack?: boolean;
        canGoForward?: boolean;
      };
    }) => {
      const {url, canGoBack, canGoForward} = event.nativeEvent;
      const previous = navigationStateRef.current;

      navigationStateRef.current = {
        url: url ?? previous.url,
        canGoBack: canGoBack ?? previous.canGoBack,
        canGoForward: canGoForward ?? previous.canGoForward,
      };
    },
    [],
  );

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.webView}
        hasTVPreferredFocus={true}
        source={HOME_SOURCE}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowJavaScriptInBackground={false}
        mixedContentMode="never"
        allowsDefaultMediaControl={true}
        onLoad={handleLoad}
        onError={event => {
          if (__DEV__) {
            console.warn('Kaylane TV WebView error', event.nativeEvent);
          }
        }}
        onHttpError={event => {
          if (__DEV__ && event.nativeEvent.isMainFrame) {
            console.warn('Kaylane TV WebView HTTP error', event.nativeEvent);
          }
        }}
        onSslError={(sslError, callback) => {
          if (__DEV__) {
            console.warn('Kaylane TV WebView SSL error', sslError);
          }
          callback.cancel();
        }}
      />
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
});
