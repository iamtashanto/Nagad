import { createNagadCheckout, type CheckoutOptions } from "./index.js";

export interface ReactNativeCheckoutOptions extends CheckoutOptions {
  /** Merchant callback URL pattern to intercept */
  callbackUrl: string;
}

/**
 * Navigation state change handler for React Native WebView (react-native-webview).
 * Intercepts callback URL redirections and deep links.
 */
export function createWebViewNavigationHandler(
  options: ReactNativeCheckoutOptions,
) {
  const machine = createNagadCheckout(options);
  const callbackUrlBase = options.callbackUrl.replace(/[?#].*$/, "");

  return {
    machine,
    onNavigationStateChange: (navState: {
      url: string;
      canGoBack?: boolean;
    }) => {
      const currentUrl = navState.url;

      // Check if current URL matches the merchant callback URL
      if (currentUrl.startsWith(callbackUrlBase)) {
        try {
          const urlObj = new URL(currentUrl);
          machine.handleCallback(urlObj.searchParams);
          return false; // prevent further navigation if controlled
        } catch {
          // fallback search param parsing
          const query = currentUrl.split("?")[1] || "";
          machine.handleCallback(query);
          return false;
        }
      }

      return true;
    },

    handleHardwareBackPress: (
      canGoBack: boolean,
      webViewRef?: { goBack: () => void },
    ): boolean => {
      if (canGoBack && webViewRef) {
        webViewRef.goBack();
        return true;
      }
      options.onClose?.();
      return false;
    },
  };
}
