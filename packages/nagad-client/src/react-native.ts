import { createNagadCheckout, type CheckoutOptions } from "./index.js";

export interface ReactNativeCheckoutOptions extends CheckoutOptions {
  /** Merchant callback URL pattern to intercept */
  callbackUrl: string;
  /** Optional allowed hosts for in-webview navigation (e.g. ['mynagad.com', 'nagad.com.bd']) */
  allowedHosts?: string[];
}

/**
 * Navigation state change and request interception handler for React Native WebView (react-native-webview).
 * Intercepts callback URL redirections and deep links safely.
 */
export function createWebViewNavigationHandler(
  options: ReactNativeCheckoutOptions,
) {
  const machine = createNagadCheckout(options);
  const callbackUrlBase = options.callbackUrl.replace(/[?#].*$/, "");

  const handleIntercept = (currentUrl: string): boolean => {
    if (currentUrl.startsWith(callbackUrlBase)) {
      try {
        const urlObj = new URL(currentUrl);
        machine.handleCallback(urlObj.searchParams);
      } catch {
        const query = currentUrl.split("?")[1] || "";
        machine.handleCallback(query);
      }
      return false; // Stop navigation
    }

    // Optional domain allowlist check
    if (options.allowedHosts && options.allowedHosts.length > 0) {
      try {
        const host = new URL(currentUrl).hostname.toLowerCase();
        const isAllowed = options.allowedHosts.some(
          (h) =>
            host === h.toLowerCase() || host.endsWith("." + h.toLowerCase()),
        );
        if (!isAllowed) {
          return false; // Block untrusted external navigation
        }
      } catch {
        return false;
      }
    }

    return true; // Allow navigation
  };

  return {
    machine,
    /**
     * Prop for WebView onShouldStartLoadWithRequest.
     * Prevents the WebView from loading the merchant callback URL directly.
     */
    onShouldStartLoadWithRequest: (request: { url: string }) => {
      return handleIntercept(request.url);
    },

    /**
     * Prop for WebView onNavigationStateChange.
     * Fallback for platforms where onShouldStartLoadWithRequest is bypassed.
     */
    onNavigationStateChange: (navState: {
      url: string;
      canGoBack?: boolean;
    }) => {
      return handleIntercept(navState.url);
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
