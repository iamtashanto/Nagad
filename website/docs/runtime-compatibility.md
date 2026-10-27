---
title: Runtime compatibility
description: RSA PKCS#1 v1.5 support in Node.js and OpenSSL, the capability check, and the pure-JS fallback.
section: Guides
order: 5
---

# Runtime compatibility

## Why this matters

Nagad's protocol uses RSA encryption with PKCS#1 v1.5 padding. Since the fix for CVE-2023-46809 (the Marvin attack), OpenSSL 3.0 builds used by some Node.js versions **refuse** PKCS#1 v1.5 private-key decryption.

## What we observed

| Node.js | OpenSSL | RSA PKCS#1 v1.5 private decryption |
| --- | --- | --- |
| 18.20.8 | 3.0.16 | Rejected (`ERR_INVALID_ARG_VALUE`) |
| 20.20.2 | 3.0.19 | Rejected |
| 22.23.4 | 3.5.9 | Works |
| 24.14.0 | 3.5.5 | Works |

Hence `nagad-server` declares `engines.node >= 22`, and CI runs the full suite on Node 22 and 24 only.

## The capability check

```ts
await nagad.init(); // runs checkCapability() on first use
```

On an unsupported runtime it throws `NagadCryptoCapabilityError` with the Node and OpenSSL versions instead of failing in the middle of a payment.

## Options on older Node.js

1. **Upgrade to Node.js 22 or 24** (recommended).
2. Use the pure-JavaScript provider. It does not depend on OpenSSL's padding policy, but it is slower and **not tested on Node 18/20**:

   ```ts
   import { createNagad, PureJsCryptoProvider } from 'nagad-server';
   createNagad({ /* … */, cryptoProvider: new PureJsCryptoProvider() });
   ```

3. Running Node with `--security-revert=CVE-2023-46809` re-enables the old behaviour. It reintroduces the timing weakness the fix addressed; we do not recommend it.

## Edge runtimes

Cloudflare Workers and Vercel Edge use WebCrypto, which has no RSAES-PKCS1-v1_5. They are **not supported**. Call a Node.js backend, or use a forward proxy for the egress IP only while keeping signing on Node.
