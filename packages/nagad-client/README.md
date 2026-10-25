# nagad-client

> Universal, headless, multi-framework client SDK for Nagad payment gateway (React, React Native, Vue, Svelte, Angular, Vanilla JS).

[![CI](https://github.com/iamtashanto/Nagad/actions/workflows/ci.yml/badge.svg)](https://github.com/iamtashanto/Nagad/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/nagad-client/alpha.svg)](https://www.npmjs.com/package/nagad-client)

---

## Disclaimer

This package is an **unofficial**, community-driven open-source library. It is **not** affiliated with, endorsed by, or sponsored by Nagad or Third Wave Technologies Limited.

---

## Features

- **Zero Secrets on Client**: Browser, Mobile, and WebViews never touch private keys or gateway credentials.
- **Framework Bindings**:
  - `nagad-client/react`: `useNagadCheckout()` hook
  - `nagad-client/react-native`: Deep link and WebView navigation handler
  - `nagad-client/vue`: `useNagad()` Vue 3 composable
  - `nagad-client/svelte`: `createNagadStore()` Svelte readable store
  - `nagad-client/angular`: Plain TypeScript `NagadService` (compatible with Angular 14-19 without APF lock-in)
- **Standalone IIFE Bundle**: Minified (<2 KB) bundle for `<script>` tag usage.

---

## Installation

```bash
npm install nagad-client@alpha
# or
pnpm add nagad-client@alpha
```

---

## React Usage

```tsx
import { useNagadCheckout } from "nagad-client/react";

function CheckoutButton() {
  const { initiate, isLoading } = useNagadCheckout({
    onSuccess: ({ orderId, paymentRefId }) => {
      alert(`Payment success! Order: ${orderId}`);
    },
    onError: (err) => {
      alert(`Payment failed: ${err.message}`);
    },
  });

  const handlePay = async () => {
    // 1. Call your backend
    const res = await fetch("/api/nagad/create", {
      method: "POST",
      body: JSON.stringify({ amount: "500.00" }),
    });
    const { callBackUrl } = await res.json();

    // 2. Redirect to Nagad
    initiate(callBackUrl);
  };

  return (
    <button onClick={handlePay} disabled={isLoading}>
      {isLoading ? "Processing..." : "Pay with Nagad"}
    </button>
  );
}
```

---

## License

MIT © [Md Tanvir Ahamed Shanto](https://github.com/iamtashanto)
