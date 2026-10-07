import React, {useCallback, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {WebView} from '@amazon-devices/webview';

import {APP_CONFIG} from './config';
import type {BrowserNavigationState, WebViewHandle} from './types/webview';

export const App = () => {
  const webViewRef = useRef<WebViewHandle | null>(null);
  const [navigationState, setNavigationState] =
    useState<BrowserNavigationState>({
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

      setNavigationState(previous => ({
        url: url ?? previous.url,
        canGoBack: Boolean(canGoBack),
        canGoForward: Boolean(canGoForward),
      }));
    },
    [],
  );

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.webView}
        hasTVPreferredFocus={true}
        source={{uri: APP_CONFIG.homeUrl}}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowJavaScriptInBackground={false}
        allowsDefaultMediaControl={true}
        onLoad={handleLoad}
        onError={event => {
          console.warn('Kaylane TV WebView error', event.nativeEvent);
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
