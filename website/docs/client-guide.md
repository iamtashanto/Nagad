---
title: Client guide
description: Headless bindings for React, React Native, Vue, Svelte, Angular and plain JavaScript.
section: Guides
order: 8
---

# Client guide

`nagad-client` is a small, **headless** state machine with bindings. It never holds secrets and never decides a payment: your server does. It does not render UI.

## The contract

1. Your backend `/create` returns `callBackUrl` (the hosted Nagad page).
2. `initiate(url)` sends the customer there (state `redirecting`).
3. When the customer returns, call `handleCallback(params)`. The state becomes **`verifying`**, not `success`. `onCallback` fires.
4. Ask **your server** to verify (your `/callback` route or an API call). Then call `confirmSuccess()` or, if the server could not tell, `confirmPending()`.
5. `onSuccess` fires only from `confirmSuccess()`.

## Vanilla

```ts
import { createNagadCheckout } from 'nagad-client';

const checkout = createNagadCheckout({
  onCallback: async ({ paymentRefId }) => {
    const r = await fetch(`/api/nagad/callback?payment_ref_id=${paymentRefId}`).then((x) => x.json());
    r.success ? checkout.confirmSuccess() : checkout.confirmPending();
  },
  onSuccess: ({ orderId }) => showReceipt(orderId),
});
checkout.initiate(callBackUrl);
// on return: checkout.handleCallback(location.search);
```

## React

```tsx
import { useNagadCheckout } from 'nagad-client/react';

const { state, isLoading, isSuccess, isPending, initiate, handleCallback, confirmSuccess, confirmPending } =
  useNagadCheckout({ onCallback: verifyOnServer });
```

## React Native

```tsx
import { WebView } from 'react-native-webview';
import { createWebViewNavigationHandler } from 'nagad-client/react-native';

const nav = createWebViewNavigationHandler({
  callbackUrl: 'https://shop.example/api/nagad/callback',
  allowedHosts: ['nagad.com.bd', 'mynagad.com'], // hosts Nagad told you to expect
  onCallback: verifyOnServer,
  onClose: () => navigation.goBack(),
});

<WebView
  source={{ uri: paymentUrl }}
  onShouldStartLoadWithRequest={nav.onShouldStartLoadWithRequest}
  onNavigationStateChange={nav.onNavigationStateChange}
/>
```

- The handler stops the WebView from loading your callback URL and blocks navigation to hosts outside `allowedHosts` (a basic phishing guard).
- **Android back button:** `nav.handleHardwareBackPress(canGoBack, webViewRef)` goes back in the WebView if it can, otherwise calls `onClose`. Wire it to `BackHandler`.
- Status: **experimental**. Not tested on physical devices.

## Vue, Svelte, Angular

```ts
import { useNagad } from 'nagad-client/vue';              // returns machine + functions
import { createNagadStore } from 'nagad-client/svelte';   // subscribe-able store
import { NagadService } from 'nagad-client/angular';      // plain service; extend and decorate it with @Injectable()
```

All expose `initiate`, `handleCallback`, `confirmSuccess`, `confirmPending`, `reset` and the state.

## Styling

Headless only. Slot-based and themed components are not available in this release.
