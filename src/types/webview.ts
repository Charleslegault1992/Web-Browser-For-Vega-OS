export type WebViewHandle = {
  goBack?: () => void;
  reload?: () => void;
  stopLoading?: () => void;
  injectJavaScript?: (script: string) => void;
};

export type BrowserNavigationState = {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
};
