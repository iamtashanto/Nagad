# nagad-client

Headless checkout bindings for [Nagad](https://nagad.com.bd) payments: React, React Native, Vue, Svelte, Angular and plain JavaScript. Pairs with [`nagad-server`](https://www.npmjs.com/package/nagad-server).

[![CI](https://github.com/iamtashanto/Nagad/actions/workflows/ci.yml/badge.svg)](https://github.com/iamtashanto/Nagad/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/nagad-client)](https://www.npmjs.com/package/nagad-client)
[![license](https://img.shields.io/npm/l/nagad-client)](https://github.com/iamtashanto/Nagad/blob/main/LICENSE)

> **Unofficial.** Not affiliated with, endorsed by, or sponsored by Nagad or Third Wave Technologies Ltd.

**Documentation:** <https://nagad-sdk.tashanto.com/docs/client-guide/> · **Issues:** <https://github.com/iamtashanto/Nagad/issues>

## Why

- **A callback is not a payment.** After the customer returns, the state is `verifying`. It becomes `success` only when your server verified the payment and you call `confirmSuccess()`.
- **Honest states:** `idle`, `redirecting`, `verifying`, `success`, `pending`, `error`.
- **Headless and secret-free.** No styles, no keys.

## Install

```bash
npm install nagad-client
```

Optional peers: `react`, `react-native`, `react-native-webview`.

## Quickstart

```ts
import { createNagadCheckout } from 'nagad-client';

const checkout = createNagadCheckout({
  onCallback: async ({ paymentRefId }) => {
    const r = await fetch(`/api/nagad/callback?payment_ref_id=${paymentRefId}`).then((x) => x.json());
    r.success ? checkout.confirmSuccess() : checkout.confirmPending();
  },
  onSuccess: ({ orderId }) => showReceipt(orderId),
});

checkout.initiate(callBackUrl); // from your server's /create
// when the customer returns: checkout.handleCallback(location.search);
```

React, React Native (with `handleHardwareBackPress` for Android), Vue, Svelte and Angular examples are in the [client guide](https://nagad-sdk.tashanto.com/docs/client-guide/).

## What is supported

<!-- status:start -->
<!-- Generated from website/src/data/status.json. Do not edit by hand. -->
| Feature | Status | Evidence |
| --- | --- | --- |
| React Hook (useNagadCheckout) | Beta | behaviour tests: verify-before-success contract |
| React Native WebView Integration | Experimental | callback interception tested without a device; NOT TESTED on a physical device |
| Vue 3 Composable (useNagad) | Beta | behaviour tests |
| Angular Service (NagadService) | Beta | behaviour tests |
| Svelte store | Beta | behaviour tests |
<!-- status:end -->

## License

MIT

---

Developed by [TA Shanto](https://tashanto.com) · [npm](https://www.npmjs.com/package/nagad-client) · [GitHub](https://github.com/iamtashanto/Nagad)
